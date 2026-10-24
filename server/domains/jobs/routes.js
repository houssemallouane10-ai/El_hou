import { Router } from 'express';
import { readPaging } from '../../shared/paging.js';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from '../accounts/index.js';

export const createJobsRoutes = ({ jobs, applications, limits }) => {
  const router = Router();
  const jobId = (req) => requireIdParam(req.params.id, 'JOB_NOT_FOUND');

  router.get('/jobs', (req, res) => {
    res.json(jobs.list(req.query, readPaging(req.query)));
  });

  router.post('/jobs', requireUser, limits.writes, (req, res) => {
    res.status(201).json({ job: jobs.create(req.user.id, req.body) });
  });

  router.get('/jobs/:id', (req, res) => {
    const id = jobId(req);
    const viewer = req.user;
    const job = jobs.get(id, { viewer, viewerKey: viewer ? `user:${viewer.id}` : `ip:${req.ip}` });
    res.json({
      job: { ...job, applicationsCount: applications.countForJob(id) },
      myApplication: viewer && !job.isOwner ? applications.mineForJob(viewer.id, id) : null,
      similar: jobs.similar(id),
    });
  });

  router.patch('/jobs/:id', requireUser, limits.writes, (req, res) => {
    res.json({ job: jobs.update(req.user.id, jobId(req), req.body) });
  });

  router.post('/jobs/:id/status', requireUser, (req, res) => {
    res.json({ job: jobs.changeStatus(req.user.id, jobId(req), req.body) });
  });

  router.delete('/jobs/:id', requireUser, (req, res) => {
    jobs.remove(req.user.id, jobId(req));
    res.status(204).end();
  });

  router.get('/me/jobs', requireUser, (req, res) => {
    const page = jobs.listOwned(req.user.id, req.query, readPaging(req.query));
    const counts = applications.countsByJobIds(page.items.map((job) => job.id));
    res.json({
      ...page,
      items: page.items.map((job) => ({ ...job, applications: counts.get(job.id) ?? { total: 0, unseen: 0 } })),
    });
  });

  return router;
};
