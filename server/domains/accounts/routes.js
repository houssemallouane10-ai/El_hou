import { Router } from 'express';
import { readPaging } from '../../shared/paging.js';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from './http.js';

export const createAccountsRoutes = ({ accounts, applications, jobs, messaging, cookie, limits }) => {
  const router = Router();
  const userAgentOf = (req) => ({ userAgent: req.get('user-agent') });

  router.post('/auth/register', limits.register, async (req, res) => {
    const { user, token } = await accounts.register(req.body, userAgentOf(req));
    cookie.write(req, res, token);
    res.status(201).json({ user });
  });

  router.post('/auth/login', limits.loginByIp, limits.loginByPhone, async (req, res) => {
    const { user, token } = await accounts.login(req.body, userAgentOf(req));
    cookie.write(req, res, token);
    res.json({ user });
  });

  router.post('/auth/logout', (req, res) => {
    accounts.logout(req.sessionToken ?? cookie.read(req));
    cookie.clear(req, res);
    res.status(204).end();
  });

  router.patch('/me', requireUser, (req, res) => {
    res.json({ user: accounts.updateProfile(req.user.id, req.body) });
  });

  router.put('/me/password', requireUser, limits.sensitive, async (req, res) => {
    await accounts.changePassword(req.user.id, req.body, req.sessionToken);
    res.status(204).end();
  });

  router.post('/me/owner', requireUser, limits.sensitive, (req, res) => {
    res.json({ user: accounts.claimOwnership(req.user.id, req.body) });
  });

  router.put('/me/alerts', requireUser, (req, res) => {
    res.json(accounts.setAlerts(req.user.id, req.body));
  });

  router.post('/me/deletion', requireUser, limits.sensitive, async (req, res) => {
    await accounts.deleteAccount(req.user.id, req.body);
    cookie.clear(req, res);
    res.status(204).end();
  });

  router.get('/workers', (req, res) => {
    res.json(accounts.listWorkers(req.query, readPaging(req.query)));
  });

  router.get('/users/:id', (req, res) => {
    const id = requireIdParam(req.params.id, 'USER_NOT_FOUND');
    const viewer = req.user;
    const hasAppliedToViewer = Boolean(viewer) && applications.hasAppliedToEmployer(id, viewer.id);
    const hasActiveJobs = jobs.hasActiveJobs(id);
    const user = accounts.getProfile(id, { viewer, hasAppliedToViewer, hasActiveJobs });
    res.json({ user: { ...user, isBlocked: Boolean(viewer) && messaging.hasBlocked(viewer.id, id) } });
  });

  return router;
};
