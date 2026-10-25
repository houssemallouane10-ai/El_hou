import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { loadConfig } from '../server/config.js';
import { createServices } from '../server/services.js';
import { createBackups } from '../server/shared/db/backups.js';
import { openDatabase } from '../server/shared/db/database.js';
import { startupWarnings } from '../server/startup-checks.js';
import { createTestClock, signUp, startTestServer } from './helpers.js';

const FINGERPRINT = Array.from({ length: 32 }, (_, index) => (index + 16).toString(16).toUpperCase()).join(':');

describe('running the platform', () => {
  it('reads hosting settings from the environment', () => {
    assert.equal(loadConfig({ RENDER_EXTERNAL_URL: 'https://khedmati.onrender.com/' }).publicUrl, 'https://khedmati.onrender.com');
    assert.equal(loadConfig({ PUBLIC_URL: 'https://khedmati.dz', RENDER_EXTERNAL_URL: 'https://x.onrender.com' }).publicUrl, 'https://khedmati.dz');
    assert.equal(loadConfig({}).backupDays, 7);
    assert.equal(loadConfig({ BACKUP_DAYS: '0' }).backupDays, 0);
    const bare = FINGERPRINT.replace(/:/g, '').toLowerCase();
    assert.deepEqual(loadConfig({ ANDROID_SHA256_FINGERPRINTS: bare }).androidApp.fingerprints, [FINGERPRINT]);
  });

  it('names and removes owners from the command line helpers', async () => {
    const server = await startTestServer();
    try {
      const { phone } = await signUp(server);
      const { accounts } = server.services;
      assert.equal(accounts.setOwnerByPhone(phone, true).isOwner, true);
      const revoked = accounts.setOwnerByPhone(phone, false);
      assert.deepEqual([revoked.isOwner, revoked.isAdmin], [false, true], 'a removed owner stays a moderator');
      assert.throws(() => accounts.setOwnerByPhone('0559999999', true), /USER_NOT_FOUND/);
    } finally {
      await server.close();
    }
  });

  it('warns about what a new production platform still needs', async () => {
    const server = await startTestServer({ withOwner: false });
    try {
      const production = loadConfig({ NODE_ENV: 'production' });
      const warnings = startupWarnings({ config: production, services: server.services });
      assert.equal(warnings.length, 3);
      assert.match(warnings[0], /New platform: open the site now/);
      const owner = await signUp(server);
      await owner.client.patch('/api/admin/settings', { supportEmail: 'contact@khedmati.dz' });
      const configured = loadConfig({ NODE_ENV: 'production', PUBLIC_URL: 'https://khedmati.dz' });
      assert.deepEqual(startupWarnings({ config: configured, services: server.services }), []);
    } finally {
      await server.close();
    }
  });

  it('lets only owners manage the support contact and the Android app from the admin console', async () => {
    const server = await startTestServer({ env: { SUPPORT_WHATSAPP: '0661000000' } });
    try {
      const { owner } = server;
      const moderator = await signUp(server);
      await owner.client.patch(`/api/admin/users/${moderator.user.id}`, { isAdmin: true });
      assert.equal((await moderator.client.get('/api/admin/settings')).data.error.code, 'OWNER_ONLY');
      assert.equal((await server.client().get('/api/admin/settings')).status, 401);

      const initial = (await owner.client.get('/api/admin/settings')).data;
      assert.deepEqual(initial.settings, { supportWhatsapp: '0661000000', supportEmail: '', androidPackage: 'dz.khedmati.app', androidFingerprints: [] });
      assert.match(initial.assetLinksUrl, /^http:\/\/127\.0\.0\.1:\d+\/\.well-known\/assetlinks\.json$/);
      assert.deepEqual((await server.client().get('/.well-known/assetlinks.json')).data, []);

      const invalid = await owner.client.patch('/api/admin/settings', { supportEmail: 'nope', androidPackage: '1bad', androidFingerprints: ['AB:CD'] });
      assert.deepEqual(invalid.data.error.fields, { supportEmail: 'invalid_email', androidPackage: 'invalid', androidFingerprints: 'invalid_fingerprint' });

      const saved = await owner.client.patch('/api/admin/settings', {
        supportWhatsapp: '',
        supportEmail: 'contact@khedmati.dz',
        androidFingerprints: [FINGERPRINT.toLowerCase().replace(/:/g, ' ')],
      });
      assert.deepEqual(saved.data.settings, {
        supportWhatsapp: '', supportEmail: 'contact@khedmati.dz', androidPackage: 'dz.khedmati.app', androidFingerprints: [FINGERPRINT],
      }, 'a saved empty value overrides the environment');
      assert.deepEqual((await server.client().get('/api/meta')).data.support, { whatsapp: null, email: 'contact@khedmati.dz' });
      const links = (await server.client().get('/.well-known/assetlinks.json')).data;
      assert.deepEqual(links[0].target, { namespace: 'android_app', package_name: 'dz.khedmati.app', sha256_cert_fingerprints: [FINGERPRINT] });
      assert.match((await server.client().get('/privacy')).data, /contact@khedmati\.dz/);
      assert.doesNotMatch((await server.client().get('/privacy')).data, /0661000000/);
    } finally {
      await server.close();
    }
  });

  it('keeps one database copy per day and only the newest ones', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khedmati-backups-'));
    const clock = createTestClock('2026-10-01T03:00:00.000Z');
    const db = openDatabase(path.join(dir, 'khedmati.db'));
    try {
      const services = createServices({ db, clock, config: loadConfig({ NODE_ENV: 'test' }) });
      await services.accounts.register({ name: 'مستخدم', phone: '0550000001', password: 'password123', role: 'seeker', wilayaCode: 16, acceptTerms: true });
      const backups = createBackups({ db, dir: path.join(dir, 'backups'), clock, keep: 3 });
      const first = await backups.runDaily();
      assert.match(first, /khedmati-2026-10-01\.db$/);
      assert.equal(await backups.runDaily(), null, 'one copy per day');
      for (let day = 0; day < 4; day += 1) {
        clock.advanceDays(1);
        await backups.runDaily();
      }
      assert.deepEqual(fs.readdirSync(path.join(dir, 'backups')).sort(), ['khedmati-2026-10-03.db', 'khedmati-2026-10-04.db', 'khedmati-2026-10-05.db']);
      const copy = openDatabase(path.join(dir, 'backups', 'khedmati-2026-10-05.db'));
      assert.equal(copy.prepare('SELECT COUNT(*) AS total FROM users').get().total, 1, 'the copy is a working database');
      copy.close();
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
