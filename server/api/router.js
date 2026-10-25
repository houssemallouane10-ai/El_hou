import express, { Router } from 'express';
import { normalizePhone } from '../../shared/phone.js';
import { authenticate, createAccountsRoutes, createSessionCookie, requireUser } from '../domains/accounts/index.js';
import { createApplicationsRoutes } from '../domains/applications/index.js';
import { createBookmarksRoutes } from '../domains/bookmarks/index.js';
import { createJobsRoutes } from '../domains/jobs/index.js';
import { createMessagingRoutes } from '../domains/messaging/index.js';
import { createModerationRoutes } from '../domains/moderation/index.js';
import { createNotificationsRoutes } from '../domains/notifications/index.js';
import { createPlatformRoutes } from '../domains/platform/index.js';
import { apiNotFound } from '../shared/http/errors.js';
import { createRateLimiter, limitBy } from '../shared/http/rate-limit.js';
import { requireJsonBody, sameOriginOnly } from '../shared/http/security.js';
import { readWilayaFilter } from '../shared/places.js';

const MINUTE = 60_000;

const createLimits = ({ rateLimits: enabled }) => {
  const limiter = (windowMs, max) => createRateLimiter({ windowMs, max });
  const byIp = (req) => req.ip;
  const byUser = (req) => (req.user ? `user:${req.user.id}` : req.ip);
  const loginPhone = (req) => normalizePhone(req.body?.phone) || null;
  return {
    register: limitBy(limiter(60 * MINUTE, 10), byIp, { enabled }),
    loginByIp: limitBy(limiter(15 * MINUTE, 30), byIp, { enabled }),
    loginByPhone: limitBy(limiter(15 * MINUTE, 8), loginPhone, { enabled }),
    sensitive: limitBy(limiter(15 * MINUTE, 10), byUser, { enabled }),
    writes: limitBy(limiter(MINUTE, 30), byUser, { enabled }),
  };
};

const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

const requestLog = (logger) => (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
};

export const createApiRouter = ({ config, services, logger }) => {
  const { accounts, applications, bookmarks, jobs, messaging, moderation, notifications, platform } = services;
  const router = Router();
  const cookie = createSessionCookie({ ttlMs: accounts.sessions.ttlMs });
  const limits = createLimits(config);
  const publicUrlOf = (req) => config.publicUrl || `${req.protocol}://${req.get('host')}`;

  if (config.logRequests) router.use(requestLog(logger));
  router.use(noStore);
  router.use(sameOriginOnly(config));
  router.use(requireJsonBody);
  router.use(express.json({ limit: '64kb' }));
  router.use(authenticate({ accounts, cookie }));

  const summaryFor = (userId) => ({
    notifications: notifications.unreadCount(userId),
    messages: messaging.unreadCount(userId),
    applications: applications.unseenForOwner(userId),
  });

  router.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  // Home page figures for one wilaya (`?wilaya=12`) or the whole country, plus live offers per
  // wilaya for the region picker.
  router.get('/meta', (req, res) => {
    const wilayaCode = readWilayaFilter(req.query.wilaya);
    const categories = jobs.categoryCounts(wilayaCode);
    const activeJobs = Object.values(categories).reduce((sum, total) => sum + total, 0);
    res.json({
      wilayaCode,
      stats: { activeJobs, ...accounts.publicStats(wilayaCode) },
      categories,
      jobsByWilaya: jobs.countsByWilaya(),
      support: platform.support(),
    });
  });

  // Everything the app needs at start-up in one round trip.
  // `setupRequired` is true on a brand-new platform: the first account created becomes the owner.
  router.get('/session', (req, res) => {
    if (!req.user) return res.json({ user: null, saved: { jobs: [], workers: [] }, summary: null, setupRequired: accounts.needsSetup() });
    return res.json({ user: req.user, saved: bookmarks.ids(req.user.id), summary: summaryFor(req.user.id) });
  });

  router.get('/me/summary', requireUser, (req, res) => {
    res.json(summaryFor(req.user.id));
  });

  router.use(createAccountsRoutes({ accounts, applications, jobs, messaging, cookie, limits }));
  router.use(createJobsRoutes({ jobs, applications, limits }));
  router.use(createApplicationsRoutes({ applications, limits }));
  router.use(createBookmarksRoutes({ bookmarks }));
  router.use(createNotificationsRoutes({ notifications }));
  router.use(createMessagingRoutes({ messaging, limits }));
  router.use(createPlatformRoutes({ platform, publicUrlOf }));
  router.use(createModerationRoutes({ moderation, accounts, jobs, limits }));
  router.use(apiNotFound);

  return router;
};
