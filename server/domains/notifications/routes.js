import { Router } from 'express';
import { readPaging } from '../../shared/paging.js';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from '../accounts/index.js';

export const createNotificationsRoutes = ({ notifications }) => {
  const router = Router();

  router.get('/notifications', requireUser, (req, res) => {
    res.json(notifications.list(req.user.id, readPaging(req.query)));
  });

  router.post('/notifications/read-all', requireUser, (req, res) => {
    notifications.markAllRead(req.user.id);
    res.status(204).end();
  });

  router.post('/notifications/:id/read', requireUser, (req, res) => {
    notifications.markRead(req.user.id, requireIdParam(req.params.id, 'NOTIFICATION_NOT_FOUND'));
    res.status(204).end();
  });

  return router;
};
