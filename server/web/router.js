import path from 'node:path';
import express, { Router } from 'express';
import { createServiceWorker } from './service-worker.js';
import { STATIC_PAGES, createShell } from './shell.js';

const SITEMAP_PAGES = ['/', '/jobs', '/workers', ...Object.keys(STATIC_PAGES)];

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);

const staticHeaders = (res, filePath) => {
  const immutable = filePath.includes(`${path.sep}fonts${path.sep}`);
  res.set('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
};

export const createWebRouter = ({ config, services }) => {
  const router = Router();
  const shell = createShell({ publicDir: config.publicDir, cacheTemplate: config.isProduction, services });
  const serviceWorker = createServiceWorker(config);
  const baseUrlOf = (req) => config.publicUrl || `${req.protocol}://${req.get('host')}`;

  router.get('/sw.js', (req, res) => {
    res.type('application/javascript')
      .set({ 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' })
      .send(serviceWorker.source({ rebuild: !config.isProduction }));
  });

  // Digital Asset Links: lets the Play Store app open this site full screen, without a URL bar.
  router.get('/.well-known/assetlinks.json', (req, res) => {
    const app = services.platform.androidApp();
    const statements = app ? [{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: app.packageName, sha256_cert_fingerprints: app.fingerprints },
    }] : [];
    res.set('Cache-Control', 'public, max-age=3600').json(statements);
  });

  router.get('/robots.txt', (req, res) => {
    const lines = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /admin', 'Disallow: /me', 'Disallow: /messages', 'Disallow: /u/'];
    res.type('text/plain').send(`${lines.join('\n')}\nSitemap: ${baseUrlOf(req)}/sitemap.xml\n`);
  });

  router.get('/sitemap.xml', (req, res) => {
    const base = baseUrlOf(req);
    const urls = [
      ...SITEMAP_PAGES.map((page) => `<url><loc>${escapeXml(`${base}${page}`)}</loc></url>`),
      ...services.jobs.sitemapEntries().map((job) => `<url><loc>${escapeXml(`${base}/jobs/${job.id}`)}</loc><lastmod>${job.updated_at.slice(0, 10)}</lastmod></url>`),
    ];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  });

  router.use('/shared', express.static(config.sharedDir, { index: false, setHeaders: staticHeaders }));
  router.use(express.static(config.publicDir, { index: false, setHeaders: staticHeaders }));

  // Every other GET without a file extension is an app route: send the shell with page meta.
  router.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || path.extname(req.path)) return next();
    res.type('html').set('Cache-Control', 'no-cache').send(shell.render(req.path, baseUrlOf(req)));
  });

  router.use((req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  return router;
};
