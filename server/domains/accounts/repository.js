import { CATEGORIES, findById } from '../../../shared/catalog.js';
import { toFlag } from '../../shared/db/database.js';
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
  location: 'location',
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
  );
};

export const createAccountsRepository = (db) => {
  const statements = {
    byId: db.prepare('SELECT * FROM users WHERE id = ?'),
    byPhone: db.prepare('SELECT * FROM users WHERE phone = ?'),
    insert: db.prepare(`
      INSERT INTO users (name, phone, password_hash, role, is_admin, search_text, created_at, updated_at, last_seen_at)
      VALUES (@name, @phone, @passwordHash, @role, @isAdmin, @searchText, @now, @now, @now)
    `),
    setPassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'),
    setSearchText: db.prepare('UPDATE users SET search_text = ? WHERE id = ?'),
    setAlerts: db.prepare('UPDATE users SET alert_categories = ?, updated_at = ? WHERE id = ?'),
    setAdmin: db.prepare('UPDATE users SET is_admin = ? WHERE id = ?'),
    setBanned: db.prepare('UPDATE users SET is_banned = ?, updated_at = ? WHERE id = ?'),
    setVerified: db.prepare('UPDATE users SET is_verified = ?, updated_at = ? WHERE id = ?'),
    touch: db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM users WHERE id = ?'),
    alertSubscribers: db.prepare(`
      SELECT id FROM users
      WHERE is_banned = 0 AND id != ? AND EXISTS (SELECT 1 FROM json_each(users.alert_categories) WHERE value = ?)
      LIMIT 2000
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

    insert({ name, phone, passwordHash, role, isAdmin, now }) {
      const searchText = buildSearchText(name);
      return Number(statements.insert.run({ name, phone, passwordHash, role, isAdmin: toFlag(isAdmin), searchText, now }).lastInsertRowid);
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
    setAlertCategories: (id, categories, now) => statements.setAlerts.run(JSON.stringify(categories), now, id),
    setAdmin: (id, isAdmin) => statements.setAdmin.run(toFlag(isAdmin), id),
    setBanned: (id, isBanned, now) => statements.setBanned.run(toFlag(isBanned), now, id),
    setVerified: (id, isVerified, now) => statements.setVerified.run(toFlag(isVerified), now, id),
    touch: (id, now) => statements.touch.run(now, id),
    remove: (id) => statements.remove.run(id),
    alertSubscriberIds: (category, excludeUserId) => statements.alertSubscribers.all(excludeUserId, category).map((row) => row.id),
    stats: (since) => statements.stats.get(since),

    listDirectory({ q, category, location, availableOnly }, { limit, offset }) {
      const filter = createFilter().add('is_listed = 1').add('is_banned = 0');
      if (category) filter.add('category = @category', { category });
      if (location) filter.add('location = @location', { location });
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

    listForAdmin({ q, status }, { limit, offset }) {
      const filter = createFilter();
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
