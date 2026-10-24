import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { signUp, startTestServer, validJob } from './helpers.js';

describe('jobs', () => {
  let server;
  let employer;
  before(async () => {
    server = await startTestServer();
    employer = await signUp(server, { role: 'employer', name: 'شركة النور' });
  });
  after(() => server.close());

  it('requires a signed-in user to publish', async () => {
    const response = await server.client().post('/api/jobs', validJob());
    assert.equal(response.status, 401);
    assert.equal(response.data.error.code, 'AUTH_REQUIRED');
  });

  it('validates fields and salary rules', async () => {
    const missing = await employer.client.post('/api/jobs', { title: 'قصير' });
    assert.equal(missing.status, 422);
    assert.equal(missing.data.error.fields.title, 'too_short');
    assert.equal(missing.data.error.fields.category, 'required');
    assert.equal(missing.data.error.fields.contactPhone, 'required');

    const inverted = await employer.client.post('/api/jobs', validJob({ salaryMin: 50000, salaryMax: 20000 }));
    assert.deepEqual(inverted.data.error.fields, { salaryMax: 'less_than_min' });

    const noAmount = await employer.client.post('/api/jobs', validJob({ salaryMin: null, salaryMax: null }));
    assert.deepEqual(noAmount.data.error.fields, { salaryMin: 'required' });

    const negotiable = await employer.client.post('/api/jobs', validJob({ salaryPeriod: 'negotiable', salaryMin: 1000 }));
    assert.equal(negotiable.status, 201);
    assert.deepEqual(negotiable.data.job.salary, { min: null, max: null, period: 'negotiable' });
  });

  it('publishes an offer that appears in filtered, searchable listings', async () => {
    const created = await employer.client.post('/api/jobs', validJob({
      title: 'سائق شاحنة لنقل البضائع',
      category: 'transport',
      jobType: 'daily',
      communeId: 372,
      isUrgent: true,
      contactPhone: '037 12 34 56',
      contactWhatsapp: '+213661234567',
    }));
    assert.equal(created.status, 201);
    const job = created.data.job;
    assert.equal(job.state, 'active');
    assert.equal(job.isOwner, true);
    assert.deepEqual(job.contact, { phone: '037123456', whatsapp: '0661234567' });
    assert.equal(job.poster.name, 'شركة النور');

    const anonymous = server.client();
    const bySearch = await anonymous.get(`/api/jobs?q=${encodeURIComponent('سايق شاحنه')}`);
    assert.ok(bySearch.data.items.some((item) => item.id === job.id), 'search folds ة/ه and tolerates missing hamza');

    assert.equal(job.wilayaCode, 62, 'the wilaya follows from the commune');
    assert.equal(job.communeId, 372);
    const byFilters = await anonymous.get('/api/jobs?category=transport&jobType=daily&commune=372&urgent=1');
    assert.deepEqual(byFilters.data.items.map((item) => item.id), [job.id]);
    assert.equal(byFilters.data.total, 1);
    assert.equal(byFilters.data.hasMore, false);

    const french = await anonymous.get(`/api/jobs?q=${encodeURIComponent('transport negrine')}`);
    assert.ok(french.data.items.some((item) => item.id === job.id), 'category and place names are searchable in French');

    const none = await anonymous.get('/api/jobs?category=health');
    assert.ok(!none.data.items.some((item) => item.id === job.id));
  });

  it('counts views once per visitor and never for the owner', async () => {
    const { data } = await employer.client.post('/api/jobs', validJob());
    const id = data.job.id;
    await employer.client.get(`/api/jobs/${id}`);
    const visitor = server.client();
    await visitor.get(`/api/jobs/${id}`);
    await visitor.get(`/api/jobs/${id}`);
    const { user: viewer, client: signedIn } = await signUp(server);
    assert.ok(viewer.id);
    await signedIn.get(`/api/jobs/${id}`);
    const detail = await employer.client.get(`/api/jobs/${id}`);
    assert.equal(detail.data.job.views, 2);
  });

  it('lets only the owner edit, close, reopen and delete', async () => {
    const { data } = await employer.client.post('/api/jobs', validJob());
    const id = data.job.id;
    const intruder = await signUp(server);

    assert.equal((await intruder.client.patch(`/api/jobs/${id}`, { title: 'عنوان مختطف للعرض' })).status, 404);
    assert.equal((await intruder.client.post(`/api/jobs/${id}/status`, { action: 'close' })).status, 404);
    assert.equal((await intruder.client.del(`/api/jobs/${id}`)).status, 404);

    const edited = await employer.client.patch(`/api/jobs/${id}`, { title: 'مطلوب بائعة في محل ملابس', salaryMax: 45000 });
    assert.equal(edited.data.job.title, 'مطلوب بائعة في محل ملابس');
    assert.deepEqual(edited.data.job.salary, { min: 30000, max: 45000, period: 'month' });

    const closed = await employer.client.post(`/api/jobs/${id}/status`, { action: 'close' });
    assert.equal(closed.data.job.state, 'closed');
    assert.ok(!(await server.client().get('/api/jobs')).data.items.some((item) => item.id === id));
    assert.equal((await server.client().get(`/api/jobs/${id}`)).data.job.state, 'closed', 'closed offers stay readable');
    assert.equal((await employer.client.post(`/api/jobs/${id}/status`, { action: 'renew' })).status, 200);

    const reopenActive = await employer.client.post(`/api/jobs/${id}/status`, { action: 'reopen' });
    assert.equal(reopenActive.data.error.code, 'JOB_NOT_CLOSED');

    assert.equal((await employer.client.del(`/api/jobs/${id}`)).status, 204);
    assert.equal((await server.client().get(`/api/jobs/${id}`)).status, 404);
  });

  it('expires offers and renews them for a new period', async () => {
    const local = await startTestServer();
    try {
      const owner = await signUp(local, { role: 'employer' });
      const { data } = await owner.client.post('/api/jobs', validJob({ durationDays: 7 }));
      const id = data.job.id;
      local.clock.advanceDays(8);
      assert.equal((await local.client().get('/api/jobs')).data.total, 0);
      assert.equal((await owner.client.get('/api/me/jobs?state=expired')).data.items[0].id, id);
      assert.equal((await owner.client.post(`/api/jobs/${id}/status`, { action: 'close' })).data.job.state, 'closed');
      assert.equal((await owner.client.post(`/api/jobs/${id}/status`, { action: 'reopen' })).data.error.code, 'JOB_EXPIRED');
      const renewed = await owner.client.post(`/api/jobs/${id}/status`, { action: 'renew', durationDays: 15 });
      assert.equal(renewed.data.job.state, 'active');
      assert.equal((await local.client().get('/api/jobs')).data.total, 1);
    } finally {
      await local.close();
    }
  });

  it('notifies people who follow the category, except the poster', async () => {
    const follower = await signUp(server);
    await follower.client.put('/api/me/alerts', { categories: ['health'] });
    await employer.client.put('/api/me/alerts', { categories: ['health'] });
    const { data } = await employer.client.post('/api/jobs', validJob({ category: 'health', title: 'مطلوب ممرض في عيادة خاصة' }));

    const inbox = await follower.client.get('/api/notifications');
    const alert = inbox.data.items.find((item) => item.type === 'job.alert');
    assert.equal(alert.data.jobId, data.job.id);
    assert.equal(alert.data.title, 'مطلوب ممرض في عيادة خاصة');
    assert.equal((await follower.client.get('/api/me/summary')).data.notifications, 1);
    assert.ok(!(await employer.client.get('/api/notifications')).data.items.some((item) => item.type === 'job.alert'));

    await follower.client.post('/api/notifications/read-all');
    assert.equal((await follower.client.get('/api/me/summary')).data.notifications, 0);
  });

  it('limits how many offers one account publishes per day', async () => {
    const local = await startTestServer();
    try {
      const busy = await signUp(local, { role: 'employer' });
      for (let index = 0; index < 10; index += 1) {
        assert.equal((await busy.client.post('/api/jobs', validJob())).status, 201);
      }
      assert.equal((await busy.client.post('/api/jobs', validJob())).status, 429);
      local.clock.advanceDays(1.1);
      assert.equal((await busy.client.post('/api/jobs', validJob())).status, 201);
    } finally {
      await local.close();
    }
  });

  it('renders share previews with escaped job data and lists offers in the sitemap', async () => {
    const { data } = await employer.client.post('/api/jobs', validJob({ title: 'عامل <script>alert(1)</script> بناء' }));
    const page = await server.client().get(`/jobs/${data.job.id}`);
    assert.equal(page.status, 200);
    assert.match(page.data, /<title>عامل &lt;script&gt;alert\(1\)&lt;\/script&gt; بناء — بئر العاتر \| خدمتي<\/title>/);
    assert.match(page.data, /og:description" content="30\.000 - 40\.000 دج شهريًا · /);
    assert.doesNotMatch(page.data, /<script>alert/);

    const sitemap = await server.client().get('/sitemap.xml');
    assert.match(sitemap.data, new RegExp(`/jobs/${data.job.id}</loc>`));
    const privatePage = await server.client().get('/messages');
    assert.match(privatePage.data, /<meta name="robots" content="noindex">/);
  });

  it('lists the owner dashboard with application counts', async () => {
    const owner = await signUp(server, { role: 'employer' });
    const { data } = await owner.client.post('/api/jobs', validJob());
    const applicant = await signUp(server);
    await applicant.client.post(`/api/jobs/${data.job.id}/applications`, {});
    const dashboard = await owner.client.get('/api/me/jobs');
    assert.equal(dashboard.data.items[0].id, data.job.id);
    assert.deepEqual(dashboard.data.items[0].applications, { total: 1, unseen: 1 });
  });
});
