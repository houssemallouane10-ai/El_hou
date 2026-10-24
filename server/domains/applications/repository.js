import { createFilter } from '../../shared/search.js';

export const createApplicationsRepository = (db) => {
  const statements = {
    insert: db.prepare(`
      INSERT INTO applications (job_id, user_id, message, created_at, updated_at)
      VALUES (@jobId, @userId, @message, @now, @now)
    `),
    byId: db.prepare(`
      SELECT a.*, j.user_id AS job_owner_id, j.title AS job_title
      FROM applications a JOIN jobs j ON j.id = a.job_id
      WHERE a.id = ?
    `),
    byJobAndUser: db.prepare('SELECT * FROM applications WHERE job_id = ? AND user_id = ?'),
    setStatus: db.prepare('UPDATE applications SET status = ?, updated_at = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM applications WHERE id = ?'),
    markSeenForJob: db.prepare('UPDATE applications SET is_seen = 1 WHERE job_id = ? AND is_seen = 0'),
    countForJob: db.prepare('SELECT COUNT(*) AS total FROM applications WHERE job_id = ?'),
    statusCountsForJob: db.prepare('SELECT status, COUNT(*) AS total FROM applications WHERE job_id = ? GROUP BY status'),
    unseenForOwner: db.prepare(`
      SELECT COUNT(*) AS total FROM applications a JOIN jobs j ON j.id = a.job_id
      WHERE j.user_id = ? AND a.is_seen = 0
    `),
    countCreatedSince: db.prepare('SELECT COUNT(*) AS total FROM applications WHERE user_id = ? AND created_at >= ?'),
    appliedToEmployer: db.prepare(`
      SELECT EXISTS (
        SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = ? AND j.user_id = ?
      ) AS found
    `),
    total: db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS recent FROM applications'),
  };

  return {
    insert: (application) => Number(statements.insert.run(application).lastInsertRowid),
    findById: (id) => statements.byId.get(id) ?? null,
    findByJobAndUser: (jobId, userId) => statements.byJobAndUser.get(jobId, userId) ?? null,
    setStatus: (id, status, now) => statements.setStatus.run(status, now, id),
    remove: (id) => statements.remove.run(id),
    markSeenForJob: (jobId) => statements.markSeenForJob.run(jobId),
    countForJob: (jobId) => statements.countForJob.get(jobId).total,
    unseenForOwner: (ownerId) => statements.unseenForOwner.get(ownerId).total,
    countCreatedSince: (userId, since) => statements.countCreatedSince.get(userId, since).total,
    hasAppliedToEmployer: (applicantId, employerId) => Boolean(statements.appliedToEmployer.get(applicantId, employerId).found),
    totals: (since) => statements.total.get(since),

    statusCountsForJob(jobId) {
      const counts = { pending: 0, shortlisted: 0, accepted: 0, rejected: 0 };
      for (const row of statements.statusCountsForJob.all(jobId)) counts[row.status] = row.total;
      return counts;
    },

    countsByJobIds(jobIds) {
      if (jobIds.length === 0) return [];
      const placeholders = jobIds.map(() => '?').join(', ');
      return db.prepare(`
        SELECT job_id, COUNT(*) AS total, SUM(CASE WHEN is_seen = 0 THEN 1 ELSE 0 END) AS unseen
        FROM applications WHERE job_id IN (${placeholders}) GROUP BY job_id
      `).all(...jobIds);
    },

    // Applicant columns are a read-only projection of the accounts table for the employer's view.
    listForJob(jobId, status) {
      const filter = createFilter().add('a.job_id = @jobId', { jobId });
      if (status) filter.add('a.status = @status', { status });
      return db.prepare(`
        SELECT a.*,
          u.name AS applicant_name, u.phone AS applicant_phone, u.whatsapp AS applicant_whatsapp,
          u.headline AS applicant_headline, u.category AS applicant_category,
          u.experience_years AS applicant_experience, u.location AS applicant_location,
          u.skills AS applicant_skills, u.is_verified AS applicant_verified, u.is_listed AS applicant_listed
        FROM applications a JOIN users u ON u.id = a.user_id
        ${filter.where()}
        ORDER BY a.created_at DESC, a.id DESC
      `).all(filter.params);
    },

    // Job columns are a read-only projection of the jobs table for the applicant's history.
    listForUser(userId, status, { limit, offset }) {
      const filter = createFilter().add('a.user_id = @userId', { userId });
      if (status) filter.add('a.status = @status', { status });
      const where = filter.where();
      const total = db.prepare(`SELECT COUNT(*) AS total FROM applications a ${where}`).get(filter.params).total;
      const rows = db.prepare(`
        SELECT a.*,
          j.title AS job_title, j.category AS job_category, j.location AS job_location, j.job_type AS job_type,
          j.status AS job_status, j.is_hidden AS job_hidden, j.expires_at AS job_expires_at,
          j.salary_min AS job_salary_min, j.salary_max AS job_salary_max, j.salary_period AS job_salary_period,
          j.user_id AS job_owner_id, u.name AS job_owner_name, u.company_name AS job_owner_company
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN users u ON u.id = j.user_id
        ${where}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT @limit OFFSET @offset
      `).all({ ...filter.params, limit, offset });
      return { rows, total };
    },
  };
};
