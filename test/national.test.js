import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN_PHONE, PASSWORD, PLACES, nextPhone, signUp, startTestServer, validJob } from './helpers.js';

describe('places across the country', () => {
  let server;
  let employer;
  before(async () => {
    server = await startTestServer();
    employer = await signUp(server, { role: 'employer', name: 'مؤسسة الشرق' });
  });
  after(() => server.close());

  it('requires a commune on offers and derives the wilaya from it', async () => {
    const missing = await employer.client.post('/api/jobs', validJob({ communeId: null }));
    assert.deepEqual(missing.data.error.fields, { communeId: 'required' });
    const unknown = await employer.client.post('/api/jobs', validJob({ communeId: 99999 }));
    assert.deepEqual(unknown.data.error.fields, { communeId: 'invalid' });
    const mismatch = await employer.client.post('/api/jobs', validJob({ ...PLACES.cheria, wilayaCode: 62 }));
    assert.deepEqual(mismatch.data.error.fields, { communeId: 'wrong_wilaya' });

    const created = await employer.client.post('/api/jobs', validJob({ communeId: PLACES.cheria.communeId, wilayaCode: '12' }));
    assert.equal(created.status, 201);
    assert.equal(created.data.job.wilayaCode, 12);
    assert.equal(created.data.job.communeId, PLACES.cheria.communeId);

    const moved = await employer.client.patch(`/api/jobs/${created.data.job.id}`, { communeId: PLACES.algiers.communeId });
    assert.equal(moved.data.job.wilayaCode, 16, 'moving to another commune moves the offer to its wilaya');
    const wrongWilaya = await employer.client.patch(`/api/jobs/${created.data.job.id}`, { wilayaCode: 31 });
    assert.deepEqual(wrongWilaya.data.error.fields, { communeId: 'wrong_wilaya' });
  });

  it('filters offers by wilaya and commune and finds them by place name in both languages', async () => {
    const inNegrine = (await employer.client.post('/api/jobs', validJob({ title: 'حارس مزرعة', communeId: PLACES.negrine.communeId }))).data.job;
    const inOran = (await employer.client.post('/api/jobs', validJob({ title: 'نادل في مطعم', communeId: 1110 }))).data.job;
    const anonymous = server.client();
    const ids = async (query) => (await anonymous.get(`/api/jobs?${query}`)).data.items.map((job) => job.id);

    assert.ok((await ids('wilaya=62')).includes(inNegrine.id));
    assert.ok(!(await ids('wilaya=62')).includes(inOran.id));
    assert.deepEqual(await ids(`commune=${PLACES.negrine.communeId}`), [inNegrine.id]);
    assert.ok((await ids('wilaya=all')).includes(inOran.id), 'unknown filter values are ignored');
    assert.ok((await ids(`q=${encodeURIComponent('Oran')}`)).includes(inOran.id));
    assert.ok((await ids(`q=${encodeURIComponent('وهران')}`)).includes(inOran.id));
    assert.ok((await ids(`q=${encodeURIComponent('negrine')}`)).includes(inNegrine.id));
  });

  it('keeps profile places consistent when the wilaya or the commune changes', async () => {
    const { client, user } = await signUp(server, { wilayaCode: 12 });
    assert.equal(user.wilayaCode, 12);
    const withCommune = await client.patch('/api/me', { communeId: PLACES.cheria.communeId });
    assert.deepEqual([withCommune.data.user.wilayaCode, withCommune.data.user.communeId], [12, PLACES.cheria.communeId]);
    const newWilaya = await client.patch('/api/me', { wilayaCode: 16 });
    assert.deepEqual([newWilaya.data.user.wilayaCode, newWilaya.data.user.communeId], [16, null], 'a commune of the old wilaya is dropped');
    const commune = await client.patch('/api/me', { communeId: PLACES.negrine.communeId });
    assert.deepEqual([commune.data.user.wilayaCode, commune.data.user.communeId], [62, PLACES.negrine.communeId]);
    assert.deepEqual((await client.patch('/api/me', { wilayaCode: 70 })).data.error.fields, { wilayaCode: 'invalid' });
    assert.deepEqual((await client.patch('/api/me', { wilayaCode: null })).data.error.fields, { wilayaCode: 'required' });
  });

  it('sends job alerts to followers of the wilaya and to followers of the whole country', async () => {
    const local = await signUp(server, { wilayaCode: 12 });
    const national = await signUp(server, { wilayaCode: 31 });
    const elsewhere = await signUp(server, { wilayaCode: 16 });
    assert.deepEqual((await local.client.put('/api/me/alerts', { categories: ['health'], wilayaCode: 12 })).data, { categories: ['health'], wilayaCode: 12 });
    assert.deepEqual((await national.client.put('/api/me/alerts', { categories: ['health'], wilayaCode: null })).data, { categories: ['health'], wilayaCode: null });
    await elsewhere.client.put('/api/me/alerts', { categories: ['health'], wilayaCode: 16 });
    assert.equal((await local.client.put('/api/me/alerts', { categories: ['health'], wilayaCode: 99 })).status, 422);

    await employer.client.post('/api/jobs', validJob({ category: 'health', title: 'ممرض في تبسة', communeId: PLACES.tebessa.communeId }));
    const alerts = async (person) => (await person.client.get('/api/notifications')).data.items.filter((item) => item.type === 'job.alert');
    const [localAlert] = await alerts(local);
    assert.equal(localAlert.data.title, 'ممرض في تبسة');
    assert.equal(localAlert.data.wilayaCode, 12);
    assert.equal(localAlert.data.communeId, PLACES.tebessa.communeId);
    assert.equal((await alerts(national)).length, 1);
    assert.equal((await alerts(elsewhere)).length, 0);
    assert.equal((await local.client.get('/api/session')).data.user.alertWilaya, 12);
  });

  it('gives home page figures for one wilaya or the whole country', async () => {
    const anonymous = server.client();
    const country = (await anonymous.get('/api/meta')).data;
    const tebessa = (await anonymous.get('/api/meta?wilaya=12')).data;
    assert.equal(country.wilayaCode, null);
    assert.equal(tebessa.wilayaCode, 12);
    assert.equal(tebessa.stats.activeJobs, country.jobsByWilaya[12]);
    assert.equal(country.stats.activeJobs, Object.values(country.categories).reduce((sum, total) => sum + total, 0));
    assert.ok(tebessa.stats.activeJobs < country.stats.activeJobs);
    assert.equal((await anonymous.get('/api/meta?wilaya=abc')).data.wilayaCode, null);
  });
});

describe('blocking', () => {
  let server;
  before(async () => {
    server = await startTestServer();
  });
  after(() => server.close());

  it('stops messages both ways and hides the conversation from the blocker only', async () => {
    const victim = await signUp(server, { name: 'سلمى' });
    const pest = await signUp(server, { name: 'مزعج' });
    const { id } = (await pest.client.post('/api/conversations', { userId: victim.user.id })).data.conversation;
    await pest.client.post(`/api/conversations/${id}/messages`, { body: 'مرحبا' });
    assert.equal((await victim.client.get('/api/me/summary')).data.messages, 1);

    assert.equal((await victim.client.put(`/api/blocks/${pest.user.id}`)).status, 204);
    assert.equal((await victim.client.put(`/api/blocks/${pest.user.id}`)).status, 204, 'blocking twice is harmless');
    assert.equal((await victim.client.get('/api/me/summary')).data.messages, 0, 'unread messages from blocked people stop counting');
    assert.deepEqual((await victim.client.get('/api/conversations')).data.items, []);
    assert.equal((await pest.client.get('/api/conversations')).data.items.length, 1);

    const reply = await pest.client.post(`/api/conversations/${id}/messages`, { body: 'لماذا؟' });
    assert.deepEqual([reply.status, reply.data.error.code], [403, 'BLOCKED']);
    assert.equal((await victim.client.post(`/api/conversations/${id}/messages`, { body: 'لا' })).data.error.code, 'BLOCKED');
    assert.equal((await pest.client.post('/api/conversations', { userId: victim.user.id })).data.error.code, 'BLOCKED');

    const victimThread = (await victim.client.get(`/api/conversations/${id}/messages`)).data.conversation;
    assert.deepEqual([victimThread.iBlocked, victimThread.canSend], [true, false]);
    const pestThread = (await pest.client.get(`/api/conversations/${id}/messages`)).data.conversation;
    assert.deepEqual([pestThread.iBlocked, pestThread.canSend], [false, false]);

    const list = (await victim.client.get('/api/blocks')).data.items;
    assert.deepEqual(list.map((item) => item.user.id), [pest.user.id]);
    assert.equal((await victim.client.get(`/api/users/${pest.user.id}`)).status, 404, 'unlisted profiles stay private');

    assert.equal((await victim.client.del(`/api/blocks/${pest.user.id}`)).status, 204);
    assert.equal((await pest.client.post(`/api/conversations/${id}/messages`, { body: 'آسف' })).status, 201);
    assert.equal((await victim.client.get('/api/conversations')).data.items.length, 1);
    assert.deepEqual((await victim.client.get('/api/blocks')).data.items, []);
  });

  it('marks blocked people on their profile and rejects blocking oneself or nobody', async () => {
    const employer = await signUp(server, { role: 'employer', name: 'صاحب ورشة' });
    const seeker = await signUp(server);
    await seeker.client.put(`/api/blocks/${employer.user.id}`);
    assert.equal((await seeker.client.get(`/api/users/${employer.user.id}`)).data.user.isBlocked, true);
    assert.equal((await server.client().get(`/api/users/${employer.user.id}`)).data.user.isBlocked, false);
    assert.equal((await seeker.client.put(`/api/blocks/${seeker.user.id}`)).data.error.code, 'CANNOT_BLOCK_SELF');
    assert.equal((await seeker.client.put('/api/blocks/999999')).status, 404);
    assert.equal((await server.client().put(`/api/blocks/${employer.user.id}`)).status, 401);
  });
});

describe('terms, owners and moderators', () => {
  let server;
  let owner;
  before(async () => {
    server = await startTestServer();
    owner = await signUp(server, { phone: ADMIN_PHONE, name: 'المالك' });
  });
  after(() => server.close());

  it('refuses accounts that did not explicitly accept the terms', async () => {
    const body = { name: 'زائر', phone: nextPhone(), password: PASSWORD, role: 'seeker', wilayaCode: 62 };
    assert.deepEqual((await server.client().post('/api/auth/register', body)).data.error.fields, { acceptTerms: 'must_accept' });
    assert.deepEqual((await server.client().post('/api/auth/register', { ...body, acceptTerms: 'true' })).data.error.fields, { acceptTerms: 'must_accept' });
    assert.equal((await server.client().post('/api/auth/register', { ...body, acceptTerms: true })).status, 201);
  });

  it('lets only owners appoint and remove moderators', async () => {
    assert.equal(owner.user.isOwner, true);
    const helper = await signUp(server, { name: 'مشرف مساعد' });
    const other = await signUp(server);

    const appointed = await owner.client.patch(`/api/admin/users/${helper.user.id}`, { isAdmin: true });
    assert.deepEqual([appointed.data.user.isAdmin, appointed.data.user.isOwner], [true, false]);
    const session = (await helper.client.get('/api/session')).data.user;
    assert.deepEqual([session.isAdmin, session.isOwner], [true, false]);
    assert.equal((await helper.client.get('/api/admin/dashboard')).status, 200);

    assert.equal((await helper.client.patch(`/api/admin/users/${other.user.id}`, { isAdmin: true })).data.error.code, 'OWNER_ONLY');
    assert.equal((await owner.client.patch(`/api/admin/users/${owner.user.id}`, { isAdmin: false })).data.error.code, 'CANNOT_CHANGE_OWNER');
    assert.equal((await helper.client.patch(`/api/admin/users/${owner.user.id}`, { isBanned: true })).data.error.code, 'CANNOT_MODERATE_ADMIN');

    await owner.client.patch(`/api/admin/users/${other.user.id}`, { isBanned: true });
    assert.equal((await owner.client.patch(`/api/admin/users/${other.user.id}`, { isAdmin: true })).data.error.code, 'USER_BANNED');

    const removed = await owner.client.patch(`/api/admin/users/${helper.user.id}`, { isAdmin: false });
    assert.equal(removed.data.user.isAdmin, false);
    assert.equal((await helper.client.get('/api/admin/dashboard')).data.error.code, 'ADMIN_ONLY');
  });

  it('shows activity per wilaya and filters admin lists by wilaya', async () => {
    const tebessa = await signUp(server, { role: 'employer', wilayaCode: 12 });
    await tebessa.client.post('/api/jobs', validJob({ communeId: PLACES.tebessa.communeId }));
    const dashboard = (await owner.client.get('/api/admin/dashboard')).data;
    const row = dashboard.byWilaya.find((item) => item.wilayaCode === 12);
    assert.deepEqual(row, { wilayaCode: 12, users: 1, activeJobs: 1 });
    assert.equal(dashboard.byWilaya[0].wilayaCode, 12, 'busiest wilaya first');

    const users = (await owner.client.get('/api/admin/users?wilaya=12')).data.items;
    assert.deepEqual(users.map((user) => user.id), [tebessa.user.id]);
    const jobs = (await owner.client.get('/api/admin/jobs?wilaya=12')).data.items;
    assert.ok(jobs.length === 1 && jobs[0].wilayaCode === 12);
  });
});

describe('Google Play endpoints and public pages', () => {
  it('publishes Digital Asset Links only when the Android app is configured', async () => {
    const fingerprint = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, '0').toUpperCase()).join(':');
    const plain = await startTestServer();
    const android = await startTestServer({ env: { ANDROID_PACKAGE_NAME: 'dz.khedmati.app', ANDROID_SHA256_FINGERPRINTS: fingerprint.toLowerCase() } });
    try {
      assert.deepEqual((await plain.client().get('/.well-known/assetlinks.json')).data, []);
      const links = await android.client().get('/.well-known/assetlinks.json');
      assert.match(links.headers.get('content-type'), /application\/json/);
      assert.deepEqual(links.data, [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'dz.khedmati.app', sha256_cert_fingerprints: [fingerprint] },
      }]);
    } finally {
      await plain.close();
      await android.close();
    }
    await assert.rejects(startTestServer({ env: { ANDROID_PACKAGE_NAME: 'dz.khedmati.app', ANDROID_SHA256_FINGERPRINTS: 'AB:CD' } }), /malformed/);
  });

  it('renders the legal pages on the server for readers without JavaScript', async () => {
    const server = await startTestServer({ env: { SUPPORT_WHATSAPP: '0661000000', SUPPORT_EMAIL: 'contact@example.dz' } });
    try {
      const privacy = await server.client().get('/privacy');
      assert.match(privacy.data, /<title>سياسة الخصوصية — خدمتي<\/title>/);
      assert.match(privacy.data, /<h2>ما الذي نجمعه؟<\/h2>\n<ul><li>/, 'a heading followed by a list renders as both');
      assert.doesNotMatch(privacy.data, /class="splash"/);
      const deletion = await server.client().get('/account-deletion');
      assert.match(deletion.data, /<h1>حذف الحساب<\/h1>/);
      assert.match(deletion.data, /contact@example\.dz/);
      assert.match(deletion.data, /0661000000/);
      assert.match((await server.client().get('/jobs')).data, /class="splash"/, 'other routes keep the splash screen');
      assert.match((await server.client().get('/sitemap.xml')).data, /\/account-deletion<\/loc>/);
      assert.deepEqual((await server.client().get('/api/meta')).data.support, { whatsapp: '0661000000', email: 'contact@example.dz' });
    } finally {
      await server.close();
    }
  });
});

describe('upgrading a database from the Tébessa-only version', () => {
  it('maps old place slugs to national communes and re-indexes search text', async () => {
    const { default: Database } = await import('better-sqlite3');
    const { migrate } = await import('../server/shared/db/migrations.js');
    const { createServices, runMaintenance } = await import('../server/services.js');
    const { loadConfig } = await import('../server/config.js');
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migrate(db, { upTo: 1 });
    const now = '2026-09-01T10:00:00.000Z';
    const insertUser = db.prepare(`INSERT INTO users (name, phone, password_hash, role, location, search_text, created_at, updated_at)
      VALUES (?, ?, 'x', 'seeker', ?, 'old', ?, ?)`);
    const negrine = Number(insertUser.run('عامل من نقرين', '0550000001', 'negrine', now, now).lastInsertRowid);
    const outside = Number(insertUser.run('عامل من خارج الولاية', '0550000002', 'outside', now, now).lastInsertRowid);
    db.prepare(`INSERT INTO jobs (user_id, title, category, job_type, location, description, contact_phone, search_text,
      created_at, published_at, updated_at, expires_at) VALUES (?, 'بائع', 'commerce', 'full_time', 'tebessa', 'وصف', '0550000001', 'old', ?, ?, ?, ?)`)
      .run(negrine, now, now, now, '2026-12-01T00:00:00.000Z');

    migrate(db);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(negrine);
    assert.deepEqual([user.wilaya_code, user.commune_id, user.search_text], [62, 372, '']);
    assert.equal(user.location, undefined, 'the old column is gone');
    const away = db.prepare('SELECT * FROM users WHERE id = ?').get(outside);
    assert.deepEqual([away.wilaya_code, away.commune_id], [null, null]);
    const job = db.prepare('SELECT * FROM jobs').get();
    assert.deepEqual([job.wilaya_code, job.commune_id], [12, 364]);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'blocks'").get());

    const services = createServices({ db, clock: { now: () => new Date(now) }, config: loadConfig({ NODE_ENV: 'test' }) });
    const result = runMaintenance(services);
    assert.deepEqual([result.indexedUsers, result.indexedJobs], [2, 1]);
    assert.match(db.prepare('SELECT search_text FROM users WHERE id = ?').get(negrine).search_text, /negrine/);
    assert.match(db.prepare('SELECT search_text FROM jobs').get().search_text, /tebessa/);
    assert.equal(runMaintenance(services).indexedJobs, 0, 'indexing happens once');
    db.close();
  });
});
