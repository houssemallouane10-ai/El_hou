import { addDays } from '../../shared/clock.js';
import { conflict, forbidden, invalid, notFound, unauthenticated } from '../../shared/errors.js';
import { pageOf } from '../../shared/paging.js';
import { readWilayaFilter, resolvePlace } from '../../shared/places.js';
import {
  parseAlertSettings,
  parseDirectoryQuery,
  parseLogin,
  parsePasswordChange,
  parsePasswordConfirmation,
  parseProfileUpdate,
  parseRegistration,
  toAdminView,
  toCardView,
  toProfileView,
  toSelfView,
} from './contracts.js';
import { burnPasswordCheck, generateTemporaryPassword, hashPassword, verifyPassword } from './passwords.js';
import { createAccountsRepository } from './repository.js';
import { createSessionStore } from './sessions.js';

const LAST_SEEN_RESOLUTION_MS = 5 * 60 * 1000;

export const createAccountsService = ({ db, clock, config }) => {
  const repository = createAccountsRepository(db);
  const sessions = createSessionStore({ db, clock, ttlDays: config.sessionDays });
  // Owners are the phones in ADMIN_PHONES: always admins, and the only ones who appoint admins.
  const adminPhones = new Set(config.adminPhones);
  const now = () => clock.now().toISOString();
  const isOwner = (user) => adminPhones.has(user.phone);
  const self = (user) => toSelfView(user, { isOwner: isOwner(user) });
  const adminView = (user) => toAdminView(user, { isOwner: isOwner(user) });

  const requireActiveUser = (id) => {
    const user = repository.findById(id);
    if (!user || user.is_banned) throw notFound('USER_NOT_FOUND');
    return user;
  };

  const promoteConfiguredAdmin = (user) => {
    if (!adminPhones.has(user.phone) || user.is_admin) return user;
    repository.setAdmin(user.id, true);
    return repository.findById(user.id);
  };

  // Sending only a new wilaya clears a commune that belonged to the old one; sending only a
  // commune moves the profile to that commune's wilaya.
  const mergePlace = (current, changes) => {
    if (changes.wilayaCode === undefined && changes.communeId === undefined) return {};
    const wilayaChanged = changes.wilayaCode !== undefined && changes.wilayaCode !== current.wilaya_code;
    let communeId = changes.communeId;
    if (communeId === undefined) communeId = wilayaChanged ? null : current.commune_id;
    let wilayaCode = changes.wilayaCode;
    if (wilayaCode === undefined) wilayaCode = communeId === null ? current.wilaya_code : null;
    return resolvePlace({ wilayaCode, communeId });
  };

  // A listed worker profile must say what the person does, otherwise the directory fills with blanks.
  const assertListable = (user) => {
    if (!user.is_listed) return;
    const fields = {};
    if (!user.headline) fields.headline = 'required_for_listing';
    if (!user.category) fields.category = 'required_for_listing';
    if (Object.keys(fields).length > 0) throw invalid(fields);
  };

  return {
    sessions,

    async register(input, { userAgent } = {}) {
      const data = parseRegistration(input);
      const { wilayaCode } = resolvePlace({ wilayaCode: data.wilayaCode });
      if (repository.findByPhone(data.phone)) throw conflict('PHONE_TAKEN');
      const passwordHash = await hashPassword(data.password);
      let id;
      try {
        id = repository.insert({ ...data, wilayaCode, passwordHash, isAdmin: adminPhones.has(data.phone), now: now() });
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict('PHONE_TAKEN');
        throw error;
      }
      const token = sessions.open(id, userAgent);
      return { user: self(repository.findById(id)), token };
    },

    async login(input, { userAgent } = {}) {
      const { phone, password } = parseLogin(input);
      const user = repository.findByPhone(phone);
      const valid = user ? await verifyPassword(password, user.password_hash) : await burnPasswordCheck(password);
      if (!valid) throw unauthenticated('INVALID_CREDENTIALS');
      if (user.is_banned) throw forbidden('ACCOUNT_BANNED');
      const current = promoteConfiguredAdmin(user);
      repository.touch(current.id, now());
      return { user: self(current), token: sessions.open(current.id, userAgent) };
    },

    logout(token) {
      sessions.close(token);
    },

    // Resolves a session cookie to the signed-in user. Banned users are signed out on the spot.
    authenticate(token) {
      const session = sessions.resolve(token);
      if (!session) return null;
      const user = repository.findById(session.userId);
      if (!user || user.is_banned) {
        sessions.close(token);
        return null;
      }
      const lastSeen = user.last_seen_at ? new Date(user.last_seen_at).getTime() : 0;
      if (clock.now().getTime() - lastSeen > LAST_SEEN_RESOLUTION_MS) repository.touch(user.id, now());
      return { user: self(user), renewed: session.renewed };
    },

    getSelf(id) {
      return self(requireActiveUser(id));
    },

    updateProfile(id, input) {
      const parsed = parseProfileUpdate(input);
      const current = requireActiveUser(id);
      const changes = { ...parsed, ...mergePlace(current, parsed) };
      const merged = {
        ...current,
        headline: changes.headline !== undefined ? changes.headline : current.headline,
        category: changes.category !== undefined ? changes.category : current.category,
        is_listed: changes.isListed !== undefined ? changes.isListed : current.is_listed,
      };
      assertListable(merged);
      const updated = db.transaction(() => repository.updateProfile(id, changes, now()))();
      return self(updated);
    },

    async changePassword(id, input, currentToken) {
      const { currentPassword, newPassword } = parsePasswordChange(input);
      const user = requireActiveUser(id);
      if (!(await verifyPassword(currentPassword, user.password_hash))) throw invalid({ currentPassword: 'wrong_password' });
      repository.setPassword(id, await hashPassword(newPassword), now());
      sessions.closeOthers(id, currentToken);
    },

    async deleteAccount(id, input) {
      const { password } = parsePasswordConfirmation(input);
      const user = requireActiveUser(id);
      if (!(await verifyPassword(password, user.password_hash))) throw invalid({ password: 'wrong_password' });
      repository.remove(id);
    },

    // Alerts follow the chosen categories, in one wilaya or (wilayaCode null) the whole country.
    setAlerts(id, input) {
      const { categories, wilayaCode } = parseAlertSettings(input);
      const scope = wilayaCode === null ? null : resolvePlace({ wilayaCode }).wilayaCode;
      requireActiveUser(id);
      repository.setAlerts(id, { categories, wilayaCode: scope }, now());
      return { categories, wilayaCode: scope };
    },

    // Listed workers, employers and anyone with a live job offer are public. Other profiles are
    // visible to their owner, admins, and employers the person applied to (`hasAppliedToViewer`).
    getProfile(id, { viewer, hasAppliedToViewer = false, hasActiveJobs = false }) {
      const user = requireActiveUser(id);
      const isSelf = viewer?.id === user.id;
      const isPublic = Boolean(user.is_listed) || user.role === 'employer' || hasActiveJobs;
      if (!isPublic && !isSelf && !viewer?.isAdmin && !hasAppliedToViewer) throw notFound('PROFILE_PRIVATE');
      const includeContact = Boolean(user.is_listed) || isSelf || Boolean(viewer?.isAdmin) || hasAppliedToViewer;
      return toProfileView(user, { includeContact });
    },

    listWorkers(query, paging) {
      const { rows, total } = repository.listDirectory(parseDirectoryQuery(query), paging);
      return pageOf(rows.map(toCardView), total, paging);
    },

    cardsByIds(ids) {
      const unique = [...new Set(ids)].filter(Number.isInteger);
      return new Map(repository.findManyByIds(unique).map((user) => [user.id, toCardView(user)]));
    },

    // Cards for listed, non-banned workers, in the order of `ids`.
    listedWorkerCards(ids) {
      const users = new Map(repository.findManyByIds([...new Set(ids)]).map((user) => [user.id, user]));
      return ids.map((id) => users.get(id))
        .filter((user) => user && user.is_listed && !user.is_banned)
        .map(toCardView);
    },

    isListedWorker(id) {
      const user = repository.findById(id);
      return Boolean(user && user.is_listed && !user.is_banned);
    },

    isActiveUser(id) {
      const user = repository.findById(id);
      return Boolean(user && !user.is_banned);
    },

    alertSubscriberIds: ({ category, wilayaCode, excludeUserId }) => repository.alertSubscriberIds({ category, wilayaCode, excludeUserId }),

    countsByWilaya: () => repository.countsByWilaya(),

    // Directory figures for the home page, for one wilaya or (null) the whole country.
    publicStats(wilayaCode = null) {
      const row = repository.publicStats(wilayaCode);
      return { availableWorkers: row.availableWorkers ?? 0, employers: row.employers ?? 0 };
    },

    indexMissingSearchText: () => repository.indexMissingSearchText(),

    stats() {
      const row = repository.stats(addDays(clock.now(), -7).toISOString());
      return {
        users: row.users ?? 0,
        newUsers: row.newUsers ?? 0,
        listedWorkers: row.listedWorkers ?? 0,
        availableWorkers: row.availableWorkers ?? 0,
        employers: row.employers ?? 0,
        banned: row.banned ?? 0,
      };
    },

    adminList(query, paging) {
      const { rows, total } = repository.listForAdmin({ q: query.q, status: query.status, wilayaCode: readWilayaFilter(query.wilaya) }, paging);
      return pageOf(rows.map(adminView), total, paging);
    },

    adminSetBanned(adminId, userId, isBanned) {
      const user = repository.findById(userId);
      if (!user) throw notFound('USER_NOT_FOUND');
      if (user.id === adminId || user.is_admin) throw forbidden('CANNOT_MODERATE_ADMIN');
      repository.setBanned(userId, isBanned, now());
      if (isBanned) sessions.closeAllForUser(userId);
      return adminView(repository.findById(userId));
    },

    adminSetVerified(userId, isVerified) {
      if (!repository.findById(userId)) throw notFound('USER_NOT_FOUND');
      repository.setVerified(userId, isVerified, now());
      return adminView(repository.findById(userId));
    },

    // Only owners appoint or remove admins, and owners themselves cannot be demoted.
    adminSetAdmin(actorId, userId, isAdmin) {
      const actor = repository.findById(actorId);
      if (!actor || !isOwner(actor)) throw forbidden('OWNER_ONLY');
      const user = repository.findById(userId);
      if (!user) throw notFound('USER_NOT_FOUND');
      if (isOwner(user)) throw forbidden('CANNOT_CHANGE_OWNER');
      if (isAdmin && user.is_banned) throw conflict('USER_BANNED');
      repository.setAdmin(userId, isAdmin);
      return adminView(repository.findById(userId));
    },

    async adminResetPassword(adminId, userId) {
      const user = repository.findById(userId);
      if (!user) throw notFound('USER_NOT_FOUND');
      if (user.is_admin && user.id !== adminId) throw forbidden('CANNOT_MODERATE_ADMIN');
      const temporaryPassword = generateTemporaryPassword();
      repository.setPassword(userId, await hashPassword(temporaryPassword), now());
      sessions.closeAllForUser(userId);
      return temporaryPassword;
    },

    // For the command line, when nobody who could reset it from the admin console can sign in.
    async resetPasswordByPhone(phone) {
      const user = repository.findByPhone(phone);
      if (!user) throw notFound('USER_NOT_FOUND');
      const temporaryPassword = generateTemporaryPassword();
      repository.setPassword(user.id, await hashPassword(temporaryPassword), now());
      sessions.closeAllForUser(user.id);
      return { user: self(repository.findById(user.id)), temporaryPassword };
    },

    grantAdminByPhone(phone) {
      const user = repository.findByPhone(phone);
      if (!user) throw notFound('USER_NOT_FOUND');
      repository.setAdmin(user.id, true);
      return self(repository.findById(user.id));
    },

    purgeExpiredSessions: () => sessions.purgeExpired(),
  };
};
