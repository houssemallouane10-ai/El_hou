import { CATEGORIES, JOB_TYPES, LOCATIONS, findById } from '../../../shared/catalog.js';
import { toFlag } from '../../shared/db/database.js';
import { buildSearchText, createFilter, searchTerms } from '../../shared/search.js';

// Poster columns are a read-only projection of the accounts table, used for display and to keep
// offers from banned accounts out of public listings.
const SELECT_JOB = `
  SELECT j.*,
    u.name AS poster_name,
    u.company_name AS poster_company,
    u.is_verified AS poster_verified,
    u.is_banned AS poster_banned,
    u.created_at AS poster_created_at
  FROM jobs j
  JOIN users u ON u.id = j.user_id
`;

const PUBLIC_VISIBILITY = "j.status = 'active' AND j.is_hidden = 0 AND j.expires_at > @now AND u.is_banned = 0";

const JOB_COLUMNS = {
  title: 'title',
  category: 'category',
  jobType: 'job_type',
  location: 'location',
  address: 'address',
  description: 'description',
  requirements: 'requirements',
  salaryPeriod: 'salary_period',
  salaryMin: 'salary_min',
  salaryMax: 'salary_max',
  positions: 'positions',
  contactPhone: 'contact_phone',
  contactWhatsapp: 'contact_whatsapp',
  isUrgent: 'is_urgent',
};

const ORDER_BY = {
  recent: 'j.is_featured DESC, j.published_at DESC, j.id DESC',
  urgent: 'j.is_urgent DESC, j.published_at DESC, j.id DESC',
  popular: 'j.views DESC, j.published_at DESC, j.id DESC',
};

const OWNER_STATE_CLAUSES = {
  active: "j.status = 'active' AND j.is_hidden = 0 AND j.expires_at > @now",
  closed: "j.status = 'closed' AND j.is_hidden = 0",
  expired: "j.status = 'active' AND j.is_hidden = 0 AND j.expires_at <= @now",
  hidden: 'j.is_hidden = 1',
};

const jobSearchText = (job) => {
  const label = (list, id) => {
    const item = findById(list, id);
    return item ? `${item.ar} ${item.fr}` : '';
  };
  return buildSearchText(
    job.title,
    job.description,
    job.requirements,
    job.address,
    label(CATEGORIES, job.category),
    label(JOB_TYPES, job.job_type),
    label(LOCATIONS, job.location),
  );
};

export const createJobsRepository = (db) => {
  const statements = {
    byId: db.prepare(`${SELECT_JOB} WHERE j.id = ?`),
    insert: db.prepare(`
      INSERT INTO jobs (
        user_id, title, category, job_type, location, address, description, requirements,
        salary_min, salary_max, salary_period, positions, contact_phone, contact_whatsapp,
        is_urgent, search_text, created_at, published_at, updated_at, expires_at
      ) VALUES (
        @userId, @title, @category, @jobType, @location, @address, @description, @requirements,
        @salaryMin, @salaryMax, @salaryPeriod, @positions, @contactPhone, @contactWhatsapp,
        @isUrgent, '', @now, @now, @now, @expiresAt
      )
    `),
    setSearchText: db.prepare('UPDATE jobs SET search_text = ? WHERE id = ?'),
    setStatus: db.prepare(`
      UPDATE jobs SET status = @status,
        published_at = COALESCE(@publishedAt, published_at),
        expires_at = COALESCE(@expiresAt, expires_at),
        updated_at = @now
      WHERE id = @id
    `),
    setHidden: db.prepare('UPDATE jobs SET is_hidden = ?, updated_at = ? WHERE id = ?'),
    setFeatured: db.prepare('UPDATE jobs SET is_featured = ?, updated_at = ? WHERE id = ?'),
    addView: db.prepare('UPDATE jobs SET views = views + 1 WHERE id = ?'),
    remove: db.prepare('DELETE FROM jobs WHERE id = ?'),
    countCreatedSince: db.prepare('SELECT COUNT(*) AS total FROM jobs WHERE user_id = ? AND created_at >= ?'),
    hasActive: db.prepare(`SELECT EXISTS (
      SELECT 1 FROM jobs WHERE user_id = ? AND status = 'active' AND is_hidden = 0 AND expires_at > ?
    ) AS found`),
    categoryCounts: db.prepare(`
      SELECT j.category AS category, COUNT(*) AS total FROM jobs j JOIN users u ON u.id = j.user_id
      WHERE ${PUBLIC_VISIBILITY} GROUP BY j.category
    `),
    stats: db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN j.status = 'active' AND j.is_hidden = 0 AND j.expires_at > @now AND u.is_banned = 0 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN j.created_at >= @since THEN 1 ELSE 0 END) AS newJobs,
        SUM(j.is_hidden) AS hidden,
        SUM(j.views) AS views
      FROM jobs j JOIN users u ON u.id = j.user_id
    `),
    sitemap: db.prepare(`
      SELECT j.id, j.updated_at FROM jobs j JOIN users u ON u.id = j.user_id
      WHERE ${PUBLIC_VISIBILITY} ORDER BY j.published_at DESC LIMIT @limit
    `),
    similar: db.prepare(`
      ${SELECT_JOB} WHERE ${PUBLIC_VISIBILITY} AND j.category = @category AND j.id != @id
      ORDER BY j.published_at DESC LIMIT @limit
    `),
  };

  const refreshSearchText = (id) => {
    const row = statements.byId.get(id);
    statements.setSearchText.run(jobSearchText(row), id);
    return statements.byId.get(id);
  };

  const page = (filter, orderBy, { limit, offset }) => {
    const where = filter.where();
    const total = db.prepare(`SELECT COUNT(*) AS total FROM jobs j JOIN users u ON u.id = j.user_id ${where}`).get(filter.params).total;
    const rows = db.prepare(`${SELECT_JOB} ${where} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`)
      .all({ ...filter.params, limit, offset });
    return { rows, total };
  };

  return {
    findById: (id) => statements.byId.get(id) ?? null,

    findManyByIds(ids) {
      if (ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(', ');
      return db.prepare(`${SELECT_JOB} WHERE j.id IN (${placeholders})`).all(...ids);
    },

    insert(job) {
      const id = Number(statements.insert.run({ ...job, isUrgent: toFlag(job.isUrgent) }).lastInsertRowid);
      return refreshSearchText(id);
    },

    update(id, changes, now) {
      const fields = Object.keys(changes).filter((field) => JOB_COLUMNS[field]);
      if (fields.length > 0) {
        const assignments = fields.map((field) => `${JOB_COLUMNS[field]} = @${field}`).join(', ');
        const params = Object.fromEntries(fields.map((field) => [field, field === 'isUrgent' ? toFlag(changes[field]) : changes[field]]));
        db.prepare(`UPDATE jobs SET ${assignments}, updated_at = @now WHERE id = @id`).run({ ...params, now, id });
      }
      return refreshSearchText(id);
    },

    setStatus: (id, { status, publishedAt = null, expiresAt = null }, now) => statements.setStatus.run({ id, status, publishedAt, expiresAt, now }),
    setHidden: (id, isHidden, now) => statements.setHidden.run(toFlag(isHidden), now, id),
    setFeatured: (id, isFeatured, now) => statements.setFeatured.run(toFlag(isFeatured), now, id),
    addView: (id) => statements.addView.run(id),
    remove: (id) => statements.remove.run(id),
    countCreatedSince: (userId, since) => statements.countCreatedSince.get(userId, since).total,
    hasActive: (userId, now) => Boolean(statements.hasActive.get(userId, now).found),
    categoryCounts: (now) => Object.fromEntries(statements.categoryCounts.all({ now }).map((row) => [row.category, row.total])),
    stats: (now, since) => statements.stats.get({ now, since }),
    sitemapEntries: (now, limit) => statements.sitemap.all({ now, limit }),
    similar: (job, now, limit) => statements.similar.all({ now, category: job.category, id: job.id, limit }),

    listPublic(query, paging, now) {
      const filter = createFilter().add(PUBLIC_VISIBILITY, { now });
      if (query.category) filter.add('j.category = @category', { category: query.category });
      if (query.jobType) filter.add('j.job_type = @jobType', { jobType: query.jobType });
      if (query.location) filter.add('j.location = @location', { location: query.location });
      if (query.urgentOnly) filter.add('j.is_urgent = 1');
      if (query.withSalary) filter.add("j.salary_period != 'negotiable'");
      if (query.since) filter.add('j.published_at >= @since', { since: query.since });
      if (query.posterId) filter.add('j.user_id = @posterId', { posterId: query.posterId });
      filter.addSearch('j.search_text', searchTerms(query.q));
      return page(filter, ORDER_BY[query.sort] ?? ORDER_BY.recent, paging);
    },

    listByOwner(userId, state, paging, now) {
      const filter = createFilter().add('j.user_id = @userId', { userId, now });
      if (OWNER_STATE_CLAUSES[state]) filter.add(OWNER_STATE_CLAUSES[state]);
      return page(filter, 'j.created_at DESC, j.id DESC', paging);
    },

    listForAdmin({ q, state }, paging, now) {
      const filter = createFilter().add('1 = 1', { now });
      if (OWNER_STATE_CLAUSES[state]) filter.add(OWNER_STATE_CLAUSES[state]);
      if (state === 'featured') filter.add('j.is_featured = 1');
      filter.addSearch('j.search_text', searchTerms(q));
      return page(filter, 'j.created_at DESC, j.id DESC', paging);
    },
  };
};
