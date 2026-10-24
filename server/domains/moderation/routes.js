import { Router } from 'express';
import { readPaging } from '../../shared/paging.js';
import { requireIdParam } from '../../shared/validation.js';
import { requireAdmin, requireUser } from '../accounts/index.js';

export const createModerationRoutes = ({ moderation, accounts, jobs, limits }) => {
  const router = Router();
  const admin = Router();
  const idOf = (req, code) => requireIdParam(req.params.id, code);

  router.post('/reports', requireUser, limits.writes, (req, res) => {
    res.status(201).json({ report: moderation.report(req.user.id, req.body) });
  });

  admin.use(requireAdmin);

  admin.get('/dashboard', (req, res) => {
    res.json(moderation.dashboard());
  });

  admin.get('/reports', (req, res) => {
    res.json(moderation.listReports(req.query, readPaging(req.query)));
  });

  admin.patch('/reports/:id', (req, res) => {
    res.json({ report: moderation.resolveReport(req.user.id, idOf(req, 'REPORT_NOT_FOUND'), req.body) });
  });

  admin.get('/users', (req, res) => {
    res.json(accounts.adminList(req.query, readPaging(req.query)));
  });

  admin.patch('/users/:id', (req, res) => {
    res.json({ user: moderation.updateUser(req.user.id, idOf(req, 'USER_NOT_FOUND'), req.body) });
  });

  admin.post('/users/:id/reset-password', async (req, res) => {
    const temporaryPassword = await accounts.adminResetPassword(req.user.id, idOf(req, 'USER_NOT_FOUND'));
    res.json({ temporaryPassword });
  });

  admin.get('/jobs', (req, res) => {
    res.json(jobs.adminList(req.query, readPaging(req.query)));
  });

  admin.patch('/jobs/:id', (req, res) => {
    res.json({ job: moderation.updateJob(idOf(req, 'JOB_NOT_FOUND'), req.body) });
  });

  admin.delete('/jobs/:id', (req, res) => {
    jobs.remove(req.user.id, idOf(req, 'JOB_NOT_FOUND'), { isAdmin: true });
    res.status(204).end();
  });

  router.use('/admin', admin);
  return router;
};
