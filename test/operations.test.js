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
import { OWNER_CODE, createTestClock, signUp, startTestServer } from './helpers.js';

describe('running the platform', () => {
  it('reads hosting settings and refuses owner codes that are too short', () => {
    assert.equal(loadConfig({ RENDER_EXTERNAL_URL: 'https://khedmati.onrender.com/' }).publicUrl, 'https://khedmati.onrender.com');
    assert.equal(loadConfig({ PUBLIC_URL: 'https://khedmati.dz', RENDER_EXTERNAL_URL: 'https://x.onrender.com' }).publicUrl, 'https://khedmati.dz');
    assert.equal(loadConfig({}).backupDays, 7);
    assert.equal(loadConfig({ BACKUP_DAYS: '0' }).backupDays, 0);
    assert.equal(loadConfig({ OWNER_CODE: '  long-enough-code ' }).ownerCode, 'long-enough-code');
    assert.throws(() => loadConfig({ OWNER_CODE: 'short' }), /at least 8 characters/);
  });

  it('accepts no owner code at all when none is configured', async () => {
    const server = await startTestServer({ env: { OWNER_CODE: '' } });
    try {
      const { client } = await signUp(server);
      assert.deepEqual((await client.post('/api/me/owner', { ownerCode: OWNER_CODE })).data.error.fields, { ownerCode: 'wrong_code' });
    } finally {
      await server.close();
    }
  });

  it('names and removes owners from the command line helpers', async () => {
    const server = await startTestServer();
    try {
      const { phone } = await signUp(server);
      const { accounts } = server.services;
      assert.equal(accounts.hasOwner(), false);
      assert.deepEqual([accounts.setOwnerByPhone(phone, true).isOwner, accounts.hasOwner()], [true, true]);
      const revoked = accounts.setOwnerByPhone(phone, false);
      assert.deepEqual([revoked.isOwner, revoked.isAdmin], [false, true], 'a removed owner stays a moderator');
      assert.throws(() => accounts.setOwnerByPhone('0559999999', true), /USER_NOT_FOUND/);
    } finally {
      await server.close();
    }
  });

  it('warns about missing production settings until an owner exists', async () => {
    const server = await startTestServer();
    try {
      const config = loadConfig({ NODE_ENV: 'production', ADMIN_PHONES: '0661234567', OWNER_CODE: OWNER_CODE });
      const warnings = startupWarnings({ config, services: server.services });
      assert.equal(warnings.length, 4);
      assert.match(warnings.join('\n'), /ADMIN_PHONES is no longer used/);
      assert.match(warnings.join('\n'), /No owner yet: sign up/);
      await signUp(server, { ownerCode: OWNER_CODE });
      const configured = loadConfig({ NODE_ENV: 'production', OWNER_CODE, PUBLIC_URL: 'https://khedmati.dz', SUPPORT_EMAIL: 'contact@khedmati.dz' });
      assert.deepEqual(startupWarnings({ config: configured, services: server.services }), []);
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
