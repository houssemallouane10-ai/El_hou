import { conflict, notFound } from '../../shared/errors.js';

const MAX_SAVED_PER_KIND = 300;

export const createBookmarksService = ({ db, clock, jobs, accounts }) => {
  const statements = {
    jobIds: db.prepare('SELECT job_id AS id FROM saved_jobs WHERE user_id = ? ORDER BY created_at DESC'),
    workerIds: db.prepare('SELECT worker_id AS id FROM saved_workers WHERE user_id = ? ORDER BY created_at DESC'),
    addJob: db.prepare('INSERT OR IGNORE INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, ?)'),
    removeJob: db.prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?'),
    addWorker: db.prepare('INSERT OR IGNORE INTO saved_workers (user_id, worker_id, created_at) VALUES (?, ?, ?)'),
    removeWorker: db.prepare('DELETE FROM saved_workers WHERE user_id = ? AND worker_id = ?'),
    countJobs: db.prepare('SELECT COUNT(*) AS total FROM saved_jobs WHERE user_id = ?'),
    countWorkers: db.prepare('SELECT COUNT(*) AS total FROM saved_workers WHERE user_id = ?'),
  };

  const ids = (statement, userId) => statement.all(userId).map((row) => row.id);

  return {
    ids(userId) {
      return { jobs: ids(statements.jobIds, userId), workers: ids(statements.workerIds, userId) };
    },

    list(userId) {
      return {
        jobs: jobs.publicCardsByIds(ids(statements.jobIds, userId)),
        workers: accounts.listedWorkerCards(ids(statements.workerIds, userId)),
      };
    },

    saveJob(userId, jobId) {
      const job = jobs.describe(jobId);
      if (!job || !job.isVisible) throw notFound('JOB_NOT_FOUND');
      if (statements.countJobs.get(userId).total >= MAX_SAVED_PER_KIND) throw conflict('SAVED_LIMIT_REACHED');
      statements.addJob.run(userId, jobId, clock.now().toISOString());
    },

    unsaveJob(userId, jobId) {
      statements.removeJob.run(userId, jobId);
    },

    saveWorker(userId, workerId) {
      if (!accounts.isListedWorker(workerId)) throw notFound('USER_NOT_FOUND');
      if (statements.countWorkers.get(userId).total >= MAX_SAVED_PER_KIND) throw conflict('SAVED_LIMIT_REACHED');
      statements.addWorker.run(userId, workerId, clock.now().toISOString());
    },

    unsaveWorker(userId, workerId) {
      statements.removeWorker.run(userId, workerId);
    },
  };
};
