import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN_PHONE, PASSWORD, signUp, startTestServer, validJob } from './helpers.js';

describe('moderation and admin', () => {
  let server;
  let admin;
  before(async () => {
    server = await startTestServer();
    admin = await signUp(server, { phone: ADMIN_PHONE, name: 'المشرف' });
  });
  after(() => server.close());

  it('keeps the admin console for admins only', async () => {
    const regular = await signUp(server);
    assert.equal((await server.client().get('/api/admin/dashboard')).status, 401);
    assert.equal((await regular.client.get('/api/admin/dashboard')).data.error.code, 'ADMIN_ONLY');
    const dashboard = await admin.client.get('/api/admin/dashboard');
    assert.equal(dashboard.status, 200);
    assert.ok(dashboard.data.users.users >= 2);
    assert.deepEqual(Object.keys(dashboard.data).sort(), ['applications', 'jobs', 'messages', 'reports', 'users']);
  });

  it('accepts one open report per person and target, and lets admins resolve it', async () => {
    const owner = await signUp(server, { role: 'employer' });
    const job = (await owner.client.post('/api/jobs', validJob({ title: 'عرض مشبوه يطلب دفع مال' }))).data.job;
    const reporter = await signUp(server, { name: 'مبلّغ' });

    assert.equal((await reporter.client.post('/api/reports', { targetType: 'job', targetId: job.id, reason: 'fraud' })).status, 422);
    const created = await reporter.client.post('/api/reports', { targetType: 'job', targetId: job.id, reason: 'scam', details: 'طلب مني 2000 دج' });
    assert.equal(created.status, 201);
    assert.equal((await reporter.client.post('/api/reports', { targetType: 'job', targetId: job.id, reason: 'spam' })).data.error.code, 'ALREADY_REPORTED');
    assert.equal((await reporter.client.post('/api/reports', { targetType: 'user', targetId: reporter.user.id, reason: 'spam' })).data.error.code, 'CANNOT_REPORT_SELF');

    const open = await admin.client.get('/api/admin/reports');
    const report = open.data.items.find((item) => item.id === created.data.report.id);
    assert.equal(report.target.title, 'عرض مشبوه يطلب دفع مال');
    assert.equal(report.reporter.name, 'مبلّغ');
    assert.equal((await admin.client.get('/api/admin/dashboard')).data.reports.open >= 1, true);

    await admin.client.patch(`/api/admin/reports/${report.id}`, { status: 'resolved' });
    assert.ok(!(await admin.client.get('/api/admin/reports')).data.items.some((item) => item.id === report.id));
    assert.ok((await admin.client.get('/api/admin/reports?status=resolved')).data.items.some((item) => item.id === report.id));
  });

  it('hides offers from everyone but their owner and tells the owner', async () => {
    const owner = await signUp(server, { role: 'employer' });
    const job = (await owner.client.post('/api/jobs', validJob())).data.job;
    const hidden = await admin.client.patch(`/api/admin/jobs/${job.id}`, { isHidden: true });
    assert.equal(hidden.data.job.state, 'hidden');

    assert.equal((await server.client().get(`/api/jobs/${job.id}`)).status, 404);
    assert.ok(!(await server.client().get('/api/jobs')).data.items.some((item) => item.id === job.id));
    assert.equal((await owner.client.get(`/api/jobs/${job.id}`)).data.job.state, 'hidden');
    assert.equal((await owner.client.post(`/api/jobs/${job.id}/status`, { action: 'renew' })).data.error.code, 'JOB_HIDDEN');
    const notice = (await owner.client.get('/api/notifications')).data.items.find((item) => item.type === 'job.hidden');
    assert.equal(notice.data.jobId, job.id);

    const featured = await admin.client.patch(`/api/admin/jobs/${job.id}`, { isHidden: false, isFeatured: true });
    assert.equal(featured.data.job.isFeatured, true);
    assert.equal((await server.client().get('/api/jobs')).data.items[0].id, job.id, 'featured offers lead the feed');
  });

  it('bans accounts: signs them out, blocks login and hides their offers', async () => {
    const offender = await signUp(server, { role: 'employer', name: 'محتال' });
    const job = (await offender.client.post('/api/jobs', validJob())).data.job;
    const banned = await admin.client.patch(`/api/admin/users/${offender.user.id}`, { isBanned: true });
    assert.equal(banned.data.user.isBanned, true);

    assert.equal((await offender.client.get('/api/session')).data.user, null);
    assert.equal((await server.client().post('/api/auth/login', { phone: offender.phone, password: PASSWORD })).data.error.code, 'ACCOUNT_BANNED');
    assert.equal((await server.client().get(`/api/jobs/${job.id}`)).status, 404);
    assert.equal((await admin.client.patch(`/api/admin/users/${admin.user.id}`, { isBanned: true })).data.error.code, 'CANNOT_MODERATE_ADMIN');

    await admin.client.patch(`/api/admin/users/${offender.user.id}`, { isBanned: false });
    assert.equal((await server.client().post('/api/auth/login', { phone: offender.phone, password: PASSWORD })).status, 200);
  });

  it('verifies accounts, resets passwords and searches users', async () => {
    const employer = await signUp(server, { role: 'employer', name: 'مؤسسة الواحة' });
    const verified = await admin.client.patch(`/api/admin/users/${employer.user.id}`, { isVerified: true });
    assert.equal(verified.data.user.isVerified, true);
    assert.ok((await employer.client.get('/api/notifications')).data.items.some((item) => item.type === 'account.verified'));

    const reset = await admin.client.post(`/api/admin/users/${employer.user.id}/reset-password`);
    assert.match(reset.data.temporaryPassword, /^[a-z2-9]{10}$/);
    assert.equal((await employer.client.get('/api/session')).data.user, null, 'reset signs the user out');
    assert.equal((await server.client().post('/api/auth/login', { phone: employer.phone, password: reset.data.temporaryPassword })).status, 200);

    const byName = await admin.client.get(`/api/admin/users?q=${encodeURIComponent('الواحه')}`);
    assert.ok(byName.data.items.some((user) => user.id === employer.user.id));
    const byPhone = await admin.client.get(`/api/admin/users?q=${employer.phone.slice(-6)}`);
    assert.deepEqual(byPhone.data.items.map((user) => user.id), [employer.user.id]);
  });

  it('lets admins delete any offer', async () => {
    const owner = await signUp(server, { role: 'employer' });
    const job = (await owner.client.post('/api/jobs', validJob())).data.job;
    assert.equal((await admin.client.del(`/api/admin/jobs/${job.id}`)).status, 204);
    assert.equal((await owner.client.get(`/api/jobs/${job.id}`)).status, 404);
  });
});
