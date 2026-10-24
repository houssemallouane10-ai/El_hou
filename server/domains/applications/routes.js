import { Router } from 'express';
import { readPaging } from '../../shared/paging.js';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from '../accounts/index.js';

export const createApplicationsRoutes = ({ applications, limits }) => {
  const router = Router();
  const applicationId = (req) => requireIdParam(req.params.id, 'APPLICATION_NOT_FOUND');

  router.post('/jobs/:id/applications', requireUser, limits.writes, (req, res) => {
    const jobId = requireIdParam(req.params.id, 'JOB_NOT_FOUND');
    res.status(201).json({ application: applications.apply(req.user.id, jobId, req.body) });
  });

  router.get('/jobs/:id/applications', requireUser, (req, res) => {
    const jobId = requireIdParam(req.params.id, 'JOB_NOT_FOUND');
    res.json(applications.listForJob(req.user, jobId, req.query));
  });

  router.get('/me/applications', requireUser, (req, res) => {
    res.json(applications.listMine(req.user.id, req.query, readPaging(req.query)));
  });

  router.patch('/applications/:id', requireUser, (req, res) => {
    res.json({ application: applications.setStatus(req.user.id, applicationId(req), req.body) });
  });

  router.delete('/applications/:id', requireUser, (req, res) => {
    applications.withdraw(req.user.id, applicationId(req));
    res.status(204).end();
  });

  return router;
};
