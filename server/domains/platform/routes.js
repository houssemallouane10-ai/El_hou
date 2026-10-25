import { Router } from 'express';
import { requireOwner } from '../accounts/index.js';

export const createPlatformRoutes = ({ platform, publicUrlOf }) => {
  const router = Router();

  const view = (req) => ({ settings: platform.settings(), assetLinksUrl: `${publicUrlOf(req)}/.well-known/assetlinks.json` });

  router.get('/admin/settings', requireOwner, (req, res) => {
    res.json(view(req));
  });

  router.patch('/admin/settings', requireOwner, (req, res) => {
    platform.update(req.user.id, req.body);
    res.json(view(req));
  });

  return router;
};
