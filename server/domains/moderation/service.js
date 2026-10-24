import { REPORT_REASON_IDS } from '../../../shared/catalog.js';
import { LIMITS } from '../../../shared/limits.js';
import { addDays } from '../../shared/clock.js';
import { conflict, forbidden, notFound, rateLimited } from '../../shared/errors.js';
import { pageOf } from '../../shared/paging.js';
import { createFilter } from '../../shared/search.js';
import { createValidator } from '../../shared/validation.js';

const MAX_REPORTS_PER_DAY = 10;
const TARGET_TYPES = new Set(['job', 'user']);
const REPORT_STATUSES = new Set(['open', 'resolved', 'dismissed']);
const RESOLUTIONS = new Set(['resolved', 'dismissed']);

const parseReport = (input) => createValidator(input)
  .oneOf('targetType', TARGET_TYPES, { required: true })
  .integer('targetId', { required: true, min: 1 })
  .oneOf('reason', REPORT_REASON_IDS, { required: true })
  .text('details', { ...LIMITS.reportDetails, multiline: true })
  .result();

const parseResolution = (input) => createValidator(input)
  .oneOf('status', RESOLUTIONS, { required: true })
  .result();

const parseFlags = (input, fields) => {
  const validator = createValidator(input, { partial: true });
  for (const field of fields) validator.boolean(field);
  return validator.result();
};

export const createModerationService = ({ db, clock, accounts, jobs, applications, messaging, notifications }) => {
  const statements = {
    insert: db.prepare(`
      INSERT INTO reports (reporter_id, target_type, target_id, reason, details, created_at)
      VALUES (@reporterId, @targetType, @targetId, @reason, @details, @now)
    `),
    openDuplicate: db.prepare(`
      SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'
    `),
    countSince: db.prepare('SELECT COUNT(*) AS total FROM reports WHERE reporter_id = ? AND created_at >= ?'),
    byId: db.prepare('SELECT * FROM reports WHERE id = ?'),
    resolve: db.prepare('UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?'),
    openCount: db.prepare("SELECT COUNT(*) AS total FROM reports WHERE status = 'open'"),
  };

  const describeTarget = (type, id) => {
    if (type === 'job') {
      const job = jobs.describe(id);
      return job ? { type, id, title: job.title, ownerId: job.ownerId, state: job.state } : { type, id, deleted: true };
    }
    const person = accounts.cardsByIds([id]).get(id);
    return person ? { type, id, title: person.name, ownerId: id } : { type, id, deleted: true };
  };

  return {
    report(userId, input) {
      const data = parseReport(input);
      const exists = data.targetType === 'job' ? Boolean(jobs.describe(data.targetId)?.isVisible) : accounts.isActiveUser(data.targetId);
      if (!exists) throw notFound('TARGET_NOT_FOUND');
      if (data.targetType === 'user' && data.targetId === userId) throw forbidden('CANNOT_REPORT_SELF');
      if (statements.openDuplicate.get(userId, data.targetType, data.targetId)) throw conflict('ALREADY_REPORTED');
      const now = clock.now();
      if (statements.countSince.get(userId, addDays(now, -1).toISOString()).total >= MAX_REPORTS_PER_DAY) throw rateLimited();
      const id = statements.insert.run({ ...data, reporterId: userId, now: now.toISOString() }).lastInsertRowid;
      return { id: Number(id) };
    },

    listReports(query, paging) {
      const status = REPORT_STATUSES.has(query.status) ? query.status : 'open';
      const filter = createFilter().add('r.status = @status', { status });
      const where = filter.where();
      const total = db.prepare(`SELECT COUNT(*) AS total FROM reports r ${where}`).get(filter.params).total;
      const rows = db.prepare(`
        SELECT r.*, u.name AS reporter_name FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
        ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT @limit OFFSET @offset
      `).all({ ...filter.params, limit: paging.limit, offset: paging.offset });
      const items = rows.map((row) => ({
        id: row.id,
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        reporter: row.reporter_id ? { id: row.reporter_id, name: row.reporter_name } : null,
        target: describeTarget(row.target_type, row.target_id),
      }));
      return pageOf(items, total, paging);
    },

    resolveReport(adminId, reportId, input) {
      const { status } = parseResolution(input);
      if (!statements.byId.get(reportId)) throw notFound('REPORT_NOT_FOUND');
      statements.resolve.run(status, clock.now().toISOString(), adminId, reportId);
      return { id: reportId, status };
    },

    dashboard() {
      return {
        users: accounts.stats(),
        jobs: jobs.stats(),
        applications: applications.stats(),
        messages: messaging.stats(),
        reports: { open: statements.openCount.get().total },
      };
    },

    updateUser(adminId, userId, input) {
      const flags = parseFlags(input, ['isBanned', 'isVerified']);
      let user = null;
      if (flags.isBanned !== undefined) user = accounts.adminSetBanned(adminId, userId, flags.isBanned);
      if (flags.isVerified !== undefined) {
        const wasVerified = Boolean(accounts.cardsByIds([userId]).get(userId)?.isVerified);
        user = accounts.adminSetVerified(userId, flags.isVerified);
        if (flags.isVerified && !wasVerified) notifications.notify(userId, 'account.verified', {});
      }
      if (!user) throw notFound('USER_NOT_FOUND');
      return user;
    },

    updateJob(jobId, input) {
      const flags = parseFlags(input, ['isHidden', 'isFeatured']);
      let job = jobs.describe(jobId);
      if (!job) throw notFound('JOB_NOT_FOUND');
      if (flags.isHidden !== undefined) {
        const result = jobs.adminSetHidden(jobId, flags.isHidden);
        if (result.changed && flags.isHidden) notifications.notify(result.job.ownerId, 'job.hidden', { jobId, jobTitle: result.job.title });
        job = result.job;
      }
      if (flags.isFeatured !== undefined) job = jobs.adminSetFeatured(jobId, flags.isFeatured);
      return job;
    },
  };
};
