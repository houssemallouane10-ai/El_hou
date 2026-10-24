import { Router } from 'express';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from '../accounts/index.js';

export const createBookmarksRoutes = ({ bookmarks }) => {
  const router = Router();
  const jobId = (req) => requireIdParam(req.params.id, 'JOB_NOT_FOUND');
  const workerId = (req) => requireIdParam(req.params.id, 'USER_NOT_FOUND');

  router.get('/saved', requireUser, (req, res) => {
    res.json(bookmarks.list(req.user.id));
  });

  router.put('/saved/jobs/:id', requireUser, (req, res) => {
    bookmarks.saveJob(req.user.id, jobId(req));
    res.status(204).end();
  });

  router.delete('/saved/jobs/:id', requireUser, (req, res) => {
    bookmarks.unsaveJob(req.user.id, jobId(req));
    res.status(204).end();
  });

  router.put('/saved/workers/:id', requireUser, (req, res) => {
    bookmarks.saveWorker(req.user.id, workerId(req));
    res.status(204).end();
  });

  router.delete('/saved/workers/:id', requireUser, (req, res) => {
    bookmarks.unsaveWorker(req.user.id, workerId(req));
    res.status(204).end();
  });

  return router;
};
