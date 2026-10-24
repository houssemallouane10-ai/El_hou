import { APPLICATION_STATUS_IDS } from '../../../shared/catalog.js';
import { LIMITS } from '../../../shared/limits.js';
import { addDays } from '../../shared/clock.js';
import { parseJsonArray } from '../../shared/db/database.js';
import { conflict, forbidden, notFound, rateLimited } from '../../shared/errors.js';
import { pageOf } from '../../shared/paging.js';
import { createValidator } from '../../shared/validation.js';
import { jobState } from '../jobs/index.js';
import { createApplicationsRepository } from './repository.js';

const MAX_APPLICATIONS_PER_DAY = 30;
const WITHDRAWABLE = new Set(['pending', 'shortlisted']);
const NOTIFIED_STATUSES = new Set(['shortlisted', 'accepted', 'rejected']);

const parseApplication = (input) => createValidator(input)
  .text('message', { ...LIMITS.applicationMessage, multiline: true })
  .result();

const parseStatus = (input) => createValidator(input)
  .oneOf('status', APPLICATION_STATUS_IDS, { required: true })
  .result();

const readStatusFilter = (value) => (APPLICATION_STATUS_IDS.has(value) ? value : null);

const toApplicantView = (row) => ({
  id: row.id,
  status: row.status,
  message: row.message,
  isNew: !row.is_seen,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  applicant: {
    id: row.user_id,
    name: row.applicant_name,
    headline: row.applicant_headline,
    category: row.applicant_category,
    experienceYears: row.applicant_experience,
    location: row.applicant_location,
    skills: parseJsonArray(row.applicant_skills).slice(0, 5),
    isVerified: Boolean(row.applicant_verified),
    isListed: Boolean(row.applicant_listed),
    contact: { phone: row.applicant_phone, whatsapp: row.applicant_whatsapp || row.applicant_phone },
  },
});

const toMyApplicationView = (row, nowIso) => ({
  id: row.id,
  status: row.status,
  message: row.message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  job: row.job_hidden ? null : {
    id: row.job_id,
    title: row.job_title,
    category: row.job_category,
    location: row.job_location,
    jobType: row.job_type,
    salary: { min: row.job_salary_min, max: row.job_salary_max, period: row.job_salary_period },
    state: jobState({ is_hidden: row.job_hidden, status: row.job_status, expires_at: row.job_expires_at }, nowIso),
    poster: { id: row.job_owner_id, name: row.job_owner_name, companyName: row.job_owner_company },
  },
});

export const createApplicationsService = ({ db, clock, jobs, accounts, notifications }) => {
  const repository = createApplicationsRepository(db);
  const nowIso = () => clock.now().toISOString();

  return {
    apply(userId, jobId, input) {
      const { message } = parseApplication(input);
      const job = jobs.describe(jobId);
      if (!job || !job.isVisible) throw notFound('JOB_NOT_FOUND');
      if (job.ownerId === userId) throw forbidden('OWN_JOB');
      if (job.state !== 'active') throw conflict('JOB_NOT_ACTIVE');
      if (repository.findByJobAndUser(jobId, userId)) throw conflict('ALREADY_APPLIED');
      const now = clock.now();
      if (repository.countCreatedSince(userId, addDays(now, -1).toISOString()) >= MAX_APPLICATIONS_PER_DAY) throw rateLimited();
      const applicant = accounts.getSelf(userId);
      const id = db.transaction(() => {
        let inserted;
        try {
          inserted = repository.insert({ jobId, userId, message, now: now.toISOString() });
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict('ALREADY_APPLIED');
          throw error;
        }
        notifications.notify(job.ownerId, 'application.received', {
          jobId,
          jobTitle: job.title,
          applicationId: inserted,
          applicantName: applicant.name,
        });
        return inserted;
      })();
      return { id, status: 'pending', message, createdAt: now.toISOString() };
    },

    withdraw(userId, applicationId) {
      const application = repository.findById(applicationId);
      if (!application || application.user_id !== userId) throw notFound('APPLICATION_NOT_FOUND');
      if (!WITHDRAWABLE.has(application.status)) throw conflict('CANNOT_WITHDRAW');
      repository.remove(applicationId);
    },

    listMine(userId, query, paging) {
      const now = nowIso();
      const { rows, total } = repository.listForUser(userId, readStatusFilter(query.status), paging);
      return pageOf(rows.map((row) => toMyApplicationView(row, now)), total, paging);
    },

    // The employer's applicant list. Opening it marks the applications as seen.
    listForJob(viewer, jobId, query) {
      const job = jobs.ownedDescription(viewer.id, jobId, { isAdmin: viewer.isAdmin });
      const items = repository.listForJob(jobId, readStatusFilter(query.status)).map(toApplicantView);
      const counts = repository.statusCountsForJob(jobId);
      if (job.ownerId === viewer.id) repository.markSeenForJob(jobId);
      return { job, counts, items };
    },

    setStatus(ownerId, applicationId, input) {
      const { status } = parseStatus(input);
      const application = repository.findById(applicationId);
      if (!application || application.job_owner_id !== ownerId) throw notFound('APPLICATION_NOT_FOUND');
      if (application.status !== status) {
        db.transaction(() => {
          repository.setStatus(applicationId, status, nowIso());
          if (NOTIFIED_STATUSES.has(status)) {
            notifications.notify(application.user_id, 'application.status', {
              jobId: application.job_id,
              jobTitle: application.job_title,
              applicationId,
              status,
            });
          }
        })();
      }
      return { id: applicationId, status };
    },

    mineForJob(userId, jobId) {
      const row = repository.findByJobAndUser(jobId, userId);
      return row ? { id: row.id, status: row.status, createdAt: row.created_at } : null;
    },

    countForJob: (jobId) => repository.countForJob(jobId),

    countsByJobIds(jobIds) {
      return new Map(repository.countsByJobIds(jobIds).map((row) => [row.job_id, { total: row.total, unseen: row.unseen ?? 0 }]));
    },

    unseenForOwner: (ownerId) => repository.unseenForOwner(ownerId),

    hasAppliedToEmployer: (applicantId, employerId) => repository.hasAppliedToEmployer(applicantId, employerId),

    stats() {
      const row = repository.totals(addDays(clock.now(), -7).toISOString());
      return { total: row.total ?? 0, recent: row.recent ?? 0 };
    },
  };
};
