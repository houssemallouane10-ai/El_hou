import { Router } from 'express';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from '../accounts/index.js';

export const createMessagingRoutes = ({ messaging, limits }) => {
  const router = Router();
  const conversationId = (req) => requireIdParam(req.params.id, 'CONVERSATION_NOT_FOUND');

  router.get('/conversations', requireUser, (req, res) => {
    res.json({ items: messaging.list(req.user.id) });
  });

  router.post('/conversations', requireUser, limits.writes, (req, res) => {
    res.status(201).json({ conversation: messaging.start(req.user.id, req.body) });
  });

  router.get('/conversations/:id/messages', requireUser, (req, res) => {
    res.json(messaging.thread(req.user.id, conversationId(req), { after: req.query.after, before: req.query.before }));
  });

  router.post('/conversations/:id/messages', requireUser, (req, res) => {
    res.status(201).json({ message: messaging.send(req.user.id, conversationId(req), req.body) });
  });

  return router;
};
