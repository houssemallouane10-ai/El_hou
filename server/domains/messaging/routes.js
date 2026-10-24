import { Router } from 'express';
import { requireIdParam } from '../../shared/validation.js';
import { requireUser } from '../accounts/index.js';

export const createMessagingRoutes = ({ messaging, limits }) => {
  const router = Router();
  const conversationId = (req) => requireIdParam(req.params.id, 'CONVERSATION_NOT_FOUND');
  const userId = (req) => requireIdParam(req.params.userId, 'USER_NOT_FOUND');

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

  router.get('/blocks', requireUser, (req, res) => {
    res.json({ items: messaging.blockedList(req.user.id) });
  });

  router.put('/blocks/:userId', requireUser, limits.writes, (req, res) => {
    messaging.block(req.user.id, userId(req));
    res.status(204).end();
  });

  router.delete('/blocks/:userId', requireUser, (req, res) => {
    messaging.unblock(req.user.id, userId(req));
    res.status(204).end();
  });

  return router;
};
