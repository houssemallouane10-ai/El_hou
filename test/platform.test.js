import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PASSWORD, signUp, startTestServer, validJob } from './helpers.js';

describe('platform: security, bookmarks and web shell', () => {
  let server;
  before(async () => {
    server = await startTestServer();
  });
  after(() => server.close());

  it('sends security headers and no-store on API responses', async () => {
    const response = await server.client().get('/api/health');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-powered-by'), null);
  });

  it('rejects cross-site writes, non-JSON bodies and malformed JSON', async () => {
    const { client } = await signUp(server, { role: 'employer' });
    const crossSite = await client.post('/api/jobs', validJob(), { origin: 'https://evil.example' });
    assert.equal(crossSite.status, 403);
    assert.equal(crossSite.data.error.code, 'BAD_ORIGIN');

    const sameSite = await client.post('/api/jobs', validJob(), { origin: server.baseUrl });
    assert.equal(sameSite.status, 201);

    const form = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'phone=0550000001&password=x',
    });
    assert.equal(form.status, 415);

    const broken = await fetch(`${server.baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"phone":' });
    assert.equal(broken.status, 400);
    assert.equal((await broken.json()).error.code, 'INVALID_JSON');
  });

  it('answers unknown API routes with JSON 404 and unknown ids with domain codes', async () => {
    const missing = await server.client().get('/api/nothing-here');
    assert.equal(missing.status, 404);
    assert.equal(missing.data.error.code, 'ROUTE_NOT_FOUND');
    assert.equal((await server.client().get('/api/jobs/abc')).data.error.code, 'JOB_NOT_FOUND');
    assert.equal((await server.client().get('/api/users/0')).data.error.code, 'USER_NOT_FOUND');
  });

  it('rate limits repeated login attempts for one phone when limits are on', async () => {
    const local = await startTestServer({ env: { RATE_LIMITS: 'on' } });
    try {
      const { phone } = await signUp(local);
      const statuses = [];
      for (let attempt = 0; attempt < 9; attempt += 1) {
        statuses.push((await local.client().post('/api/auth/login', { phone, password: 'wrong-password' })).status);
      }
      assert.deepEqual(statuses.slice(0, 8), Array(8).fill(401));
      assert.equal(statuses[8], 429);
      assert.equal((await local.client().post('/api/auth/login', { phone, password: PASSWORD })).status, 429);
    } finally {
      await local.close();
    }
  });

  it('saves and unsaves offers and listed workers', async () => {
    const employer = await signUp(server, { role: 'employer' });
    const job = (await employer.client.post('/api/jobs', validJob())).data.job;
    const worker = await signUp(server, { name: 'حرفي' });
    await worker.client.patch('/api/me', { isListed: true, headline: 'سبّاك', category: 'crafts' });
    const hiddenWorker = await signUp(server);
    const saver = await signUp(server);

    assert.equal((await saver.client.put(`/api/saved/jobs/${job.id}`)).status, 204);
    assert.equal((await saver.client.put(`/api/saved/jobs/${job.id}`)).status, 204, 'saving twice is harmless');
    assert.equal((await saver.client.put(`/api/saved/workers/${worker.user.id}`)).status, 204);
    assert.equal((await saver.client.put(`/api/saved/workers/${hiddenWorker.user.id}`)).status, 404);
    assert.equal((await saver.client.put('/api/saved/jobs/424242')).status, 404);

    const session = await saver.client.get('/api/session');
    assert.deepEqual(session.data.saved, { jobs: [job.id], workers: [worker.user.id] });
    const saved = await saver.client.get('/api/saved');
    assert.equal(saved.data.jobs[0].title, job.title);
    assert.equal(saved.data.workers[0].headline, 'سبّاك');

    await saver.client.del(`/api/saved/jobs/${job.id}`);
    assert.deepEqual((await saver.client.get('/api/saved')).data.jobs, []);
  });

  it('serves the app shell for client routes and a versioned service worker', async () => {
    const page = await server.client().get('/jobs');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(page.data, /<div class="app" id="app">/);

    const worker = await server.client().get('/sw.js');
    assert.equal(worker.status, 200);
    assert.match(worker.headers.get('content-type'), /javascript/);
    assert.doesNotMatch(worker.data, /__VERSION__|__PRECACHE__/);
    assert.match(worker.data, /"\/css\/app\.css"/);
    assert.match(worker.data, /"\/shared\/catalog\.js"/);

    assert.equal((await server.client().get('/missing-file.js')).status, 404);
    assert.match((await server.client().get('/robots.txt')).data, /Sitemap: http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml/);
  });
});
