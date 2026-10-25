import { CATEGORIES, findById } from '../../../shared/catalog.js';
import { toFlag } from '../../shared/db/database.js';
import { placeSearchText } from '../../shared/places.js';
import { buildSearchText, createFilter, searchTerms } from '../../shared/search.js';

const PROFILE_COLUMNS = {
  name: 'name',
  role: 'role',
  companyName: 'company_name',
  headline: 'headline',
  bio: 'bio',
  category: 'category',
  experienceYears: 'experience_years',
  skills: 'skills',
  wilayaCode: 'wilaya_code',
  communeId: 'commune_id',
  whatsapp: 'whatsapp',
  expectedPay: 'expected_pay',
  isListed: 'is_listed',
  isAvailable: 'is_available',
};

const toColumnValue = (field, value) => {
  if (field === 'skills') return JSON.stringify(value ?? []);
  if (field === 'isListed' || field === 'isAvailable') return toFlag(value);
  return value;
};

const userSearchText = (user) => {
  const category = findById(CATEGORIES, user.category);
  return buildSearchText(
    user.name,
    user.company_name,
    user.headline,
    user.bio,
    user.skills,
    user.expected_pay,
    category?.ar,
    category?.fr,
    placeSearchText({ wilayaCode: user.wilaya_code, communeId: user.commune_id }),
  );
};

export const createAccountsRepository = (db) => {
  const statements = {
    byId: db.prepare('SELECT * FROM users WHERE id = ?'),
    byPhone: db.prepare('SELECT * FROM users WHERE phone = ?'),
    insert: db.prepare(`
      INSERT INTO users (
        name, phone, password_hash, role, is_admin, is_owner, wilaya_code, alert_wilaya, terms_accepted_at,
        created_at, updated_at, last_seen_at
      ) VALUES (
        @name, @phone, @passwordHash, @role, @isOwner, @isOwner, @wilayaCode, @wilayaCode, @now, @now, @now, @now
      )
    `),
    setPassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'),
    setSearchText: db.prepare('UPDATE users SET search_text = ? WHERE id = ?'),
    setAlerts: db.prepare('UPDATE users SET alert_categories = ?, alert_wilaya = ?, updated_at = ? WHERE id = ?'),
    setAdmin: db.prepare('UPDATE users SET is_admin = ? WHERE id = ?'),
    grantOwner: db.prepare('UPDATE users SET is_owner = 1, is_admin = 1 WHERE id = ?'),
    revokeOwner: db.prepare('UPDATE users SET is_owner = 0 WHERE id = ?'),
    hasOwner: db.prepare('SELECT EXISTS (SELECT 1 FROM users WHERE is_owner = 1 AND is_banned = 0) AS found'),
    hasAnyAccount: db.prepare('SELECT EXISTS (SELECT 1 FROM users) AS found'),
    countOwners: db.prepare('SELECT COUNT(*) AS total FROM users WHERE is_owner = 1'),
    setBanned: db.prepare('UPDATE users SET is_banned = ?, updated_at = ? WHERE id = ?'),
    setVerified: db.prepare('UPDATE users SET is_verified = ?, updated_at = ? WHERE id = ?'),
    touch: db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM users WHERE id = ?'),
    alertSubscribers: db.prepare(`
      SELECT id FROM users
      WHERE is_banned = 0 AND id != @excludeUserId
        AND (alert_wilaya IS NULL OR alert_wilaya = @wilayaCode)
        AND EXISTS (SELECT 1 FROM json_each(users.alert_categories) WHERE value = @category)
      LIMIT 2000
    `),
    unindexed: db.prepare("SELECT * FROM users WHERE search_text = '' LIMIT 500"),
    publicStats: db.prepare(`
      SELECT
        SUM(CASE WHEN is_listed = 1 AND is_available = 1 THEN 1 ELSE 0 END) AS availableWorkers,
        SUM(CASE WHEN role = 'employer' THEN 1 ELSE 0 END) AS employers
      FROM users
      WHERE is_banned = 0 AND (@wilayaCode IS NULL OR wilaya_code = @wilayaCode)
    `),
    countsByWilaya: db.prepare(`
      SELECT wilaya_code AS wilayaCode, COUNT(*) AS users FROM users
      WHERE is_banned = 0 AND wilaya_code IS NOT NULL GROUP BY wilaya_code
    `),
    stats: db.prepare(`
      SELECT
        COUNT(*) AS users,
        SUM(CASE WHEN is_listed = 1 AND is_banned = 0 THEN 1 ELSE 0 END) AS listedWorkers,
        SUM(CASE WHEN is_listed = 1 AND is_available = 1 AND is_banned = 0 THEN 1 ELSE 0 END) AS availableWorkers,
        SUM(CASE WHEN role = 'employer' AND is_banned = 0 THEN 1 ELSE 0 END) AS employers,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS newUsers,
        SUM(is_banned) AS banned
      FROM users
    `),
  };

  return {
    findById: (id) => statements.byId.get(id) ?? null,
    findByPhone: (phone) => statements.byPhone.get(phone) ?? null,

    findManyByIds(ids) {
      if (ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(', ');
      return db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...ids);
    },

    insert({ name, phone, passwordHash, role, isOwner, wilayaCode, now }) {
      const id = Number(statements.insert.run({ name, phone, passwordHash, role, isOwner: toFlag(isOwner), wilayaCode, now }).lastInsertRowid);
      statements.setSearchText.run(userSearchText(statements.byId.get(id)), id);
      return id;
    },

    // Rows migrated or imported without search text get it on the next maintenance pass.
    indexMissingSearchText() {
      const rows = statements.unindexed.all();
      for (const row of rows) statements.setSearchText.run(userSearchText(row) || ' ', row.id);
      return rows.length;
    },

    updateProfile(id, changes, now) {
      const fields = Object.keys(changes).filter((field) => PROFILE_COLUMNS[field]);
      if (fields.length > 0) {
        const assignments = fields.map((field) => `${PROFILE_COLUMNS[field]} = @${field}`).join(', ');
        const params = Object.fromEntries(fields.map((field) => [field, toColumnValue(field, changes[field])]));
        db.prepare(`UPDATE users SET ${assignments}, updated_at = @now WHERE id = @id`).run({ ...params, now, id });
      }
      const user = statements.byId.get(id);
      statements.setSearchText.run(userSearchText(user), id);
      return statements.byId.get(id);
    },

    setPassword: (id, passwordHash, now) => statements.setPassword.run(passwordHash, now, id),
    setAlerts: (id, { categories, wilayaCode }, now) => statements.setAlerts.run(JSON.stringify(categories), wilayaCode, now, id),
    setAdmin: (id, isAdmin) => statements.setAdmin.run(toFlag(isAdmin), id),
    grantOwner: (id) => statements.grantOwner.run(id),
    revokeOwner: (id) => statements.revokeOwner.run(id),
    hasOwner: () => Boolean(statements.hasOwner.get().found),
    hasAnyAccount: () => Boolean(statements.hasAnyAccount.get().found),
    countOwners: () => statements.countOwners.get().total,
    setBanned: (id, isBanned, now) => statements.setBanned.run(toFlag(isBanned), now, id),
    setVerified: (id, isVerified, now) => statements.setVerified.run(toFlag(isVerified), now, id),
    touch: (id, now) => statements.touch.run(now, id),
    remove: (id) => statements.remove.run(id),
    alertSubscriberIds: ({ category, wilayaCode, excludeUserId }) => statements.alertSubscribers
      .all({ category, wilayaCode, excludeUserId })
      .map((row) => row.id),
    stats: (since) => statements.stats.get(since),
    countsByWilaya: () => statements.countsByWilaya.all(),
    publicStats: (wilayaCode) => statements.publicStats.get({ wilayaCode }),

    listDirectory({ q, category, wilayaCode, communeId, availableOnly }, { limit, offset }) {
      const filter = createFilter().add('is_listed = 1').add('is_banned = 0');
      if (category) filter.add('category = @category', { category });
      if (wilayaCode) filter.add('wilaya_code = @wilayaCode', { wilayaCode });
      if (communeId) filter.add('commune_id = @communeId', { communeId });
      if (availableOnly) filter.add('is_available = 1');
      filter.addSearch('search_text', searchTerms(q));
      const where = filter.where();
      const total = db.prepare(`SELECT COUNT(*) AS total FROM users ${where}`).get(filter.params).total;
      const rows = db.prepare(`
        SELECT * FROM users ${where}
        ORDER BY is_available DESC, is_verified DESC, updated_at DESC, id DESC
        LIMIT @limit OFFSET @offset
      `).all({ ...filter.params, limit, offset });
      return { rows, total };
    },

    listForAdmin({ q, status, wilayaCode }, { limit, offset }) {
      const filter = createFilter();
      if (wilayaCode) filter.add('wilaya_code = @wilayaCode', { wilayaCode });
      if (status === 'banned') filter.add('is_banned = 1');
      if (status === 'admins') filter.add('is_admin = 1');
      if (status === 'verified') filter.add('is_verified = 1');
      if (status === 'unverified_employers') filter.add("role = 'employer' AND is_verified = 0");
      const digits = String(q ?? '').replace(/\D/g, '');
      if (digits.length >= 3) filter.add('phone LIKE @phone', { phone: `%${digits}%` });
      else filter.addSearch('search_text', searchTerms(q));
      const where = filter.where();
      const total = db.prepare(`SELECT COUNT(*) AS total FROM users ${where}`).get(filter.params).total;
      const rows = db.prepare(`SELECT * FROM users ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
        .all({ ...filter.params, limit, offset });
      return { rows, total };
    },
  };
};
