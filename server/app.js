import compression from 'compression';
import express from 'express';
import { createApiRouter } from './api/router.js';
import { errorHandler } from './shared/http/errors.js';
import { securityHeaders } from './shared/http/security.js';
import { createWebRouter } from './web/router.js';

export const createApp = ({ config, services, logger = console }) => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders(config));
  app.use(compression());
  app.use('/api', createApiRouter({ config, services, logger }));
  app.use(createWebRouter({ config, services }));
  app.use(errorHandler(logger));
  return app;
};
