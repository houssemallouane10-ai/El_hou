import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { signUp, startTestServer, validJob } from './helpers.js';

describe('applications', () => {
  let server;
  let employer;
  let jobId;
  before(async () => {
    server = await startTestServer();
    employer = await signUp(server, { role: 'employer', name: 'مقاولة الأمل' });
    jobId = (await employer.client.post('/api/jobs', validJob({ title: 'مطلوب عمال بناء للورشة' }))).data.job.id;
  });
  after(() => server.close());

  it('lets a seeker apply once and notifies the employer', async () => {
    const seeker = await signUp(server, { name: 'يوسف' });
    const applied = await seeker.client.post(`/api/jobs/${jobId}/applications`, { message: 'عندي خبرة 3 سنوات في البناء' });
    assert.equal(applied.status, 201);
    assert.equal(applied.data.application.status, 'pending');

    const again = await seeker.client.post(`/api/jobs/${jobId}/applications`, {});
    assert.equal(again.status, 409);
    assert.equal(again.data.error.code, 'ALREADY_APPLIED');

    const detail = await seeker.client.get(`/api/jobs/${jobId}`);
    assert.equal(detail.data.myApplication.status, 'pending');
    assert.ok(detail.data.job.applicationsCount >= 1);

    const summary = await employer.client.get('/api/me/summary');
    assert.ok(summary.data.applications >= 1);
    const inbox = await employer.client.get('/api/notifications');
    const notice = inbox.data.items.find((item) => item.type === 'application.received' && item.data.applicantName === 'يوسف');
    assert.equal(notice.data.jobId, jobId);
  });

  it('refuses applications to own, closed or missing offers', async () => {
    assert.equal((await employer.client.post(`/api/jobs/${jobId}/applications`, {})).data.error.code, 'OWN_JOB');
    assert.equal((await server.client().post(`/api/jobs/${jobId}/applications`, {})).status, 401);

    const seeker = await signUp(server);
    assert.equal((await seeker.client.post('/api/jobs/999999/applications', {})).status, 404);

    const other = await employer.client.post('/api/jobs', validJob());
    await employer.client.post(`/api/jobs/${other.data.job.id}/status`, { action: 'close' });
    const closed = await seeker.client.post(`/api/jobs/${other.data.job.id}/applications`, {});
    assert.equal(closed.status, 409);
    assert.equal(closed.data.error.code, 'JOB_NOT_ACTIVE');
  });

  it('shows applicants with contact details only to the job owner and marks them seen', async () => {
    const seeker = await signUp(server, { name: 'كريم' });
    await seeker.client.patch('/api/me', { headline: 'مساعد بنّاء', category: 'construction', experienceYears: 2 });
    await seeker.client.post(`/api/jobs/${jobId}/applications`, { message: 'متوفر من الغد' });

    const stranger = await signUp(server);
    assert.equal((await stranger.client.get(`/api/jobs/${jobId}/applications`)).status, 404);

    const list = await employer.client.get(`/api/jobs/${jobId}/applications`);
    assert.equal(list.status, 200);
    assert.equal(list.data.job.id, jobId);
    const entry = list.data.items.find((item) => item.applicant.name === 'كريم');
    assert.equal(entry.isNew, true);
    assert.equal(entry.message, 'متوفر من الغد');
    assert.equal(entry.applicant.headline, 'مساعد بنّاء');
    assert.equal(entry.applicant.contact.phone, seeker.phone);
    assert.ok(list.data.counts.pending >= 1);

    const again = await employer.client.get(`/api/jobs/${jobId}/applications`);
    assert.equal(again.data.items.find((item) => item.applicant.name === 'كريم').isNew, false);
    assert.equal((await employer.client.get('/api/me/summary')).data.applications, 0);
  });

  it('updates the status, notifies the applicant and filters by status', async () => {
    const seeker = await signUp(server, { name: 'نور' });
    const { data } = await seeker.client.post(`/api/jobs/${jobId}/applications`, {});
    const applicationId = data.application.id;

    assert.equal((await seeker.client.patch(`/api/applications/${applicationId}`, { status: 'accepted' })).status, 404);
    assert.equal((await employer.client.patch(`/api/applications/${applicationId}`, { status: 'hired' })).status, 422);

    const accepted = await employer.client.patch(`/api/applications/${applicationId}`, { status: 'accepted' });
    assert.deepEqual(accepted.data.application, { id: applicationId, status: 'accepted' });

    const notice = (await seeker.client.get('/api/notifications')).data.items.find((item) => item.type === 'application.status');
    assert.equal(notice.data.status, 'accepted');
    assert.equal(notice.data.jobTitle, 'مطلوب عمال بناء للورشة');

    const mine = await seeker.client.get('/api/me/applications');
    assert.equal(mine.data.items[0].status, 'accepted');
    assert.equal(mine.data.items[0].job.title, 'مطلوب عمال بناء للورشة');
    assert.equal(mine.data.items[0].job.state, 'active');

    const acceptedOnly = await employer.client.get(`/api/jobs/${jobId}/applications?status=accepted`);
    assert.deepEqual(acceptedOnly.data.items.map((item) => item.id), [applicationId]);
  });

  it('lets applicants withdraw pending applications only', async () => {
    const seeker = await signUp(server);
    const pending = (await seeker.client.post(`/api/jobs/${jobId}/applications`, {})).data.application.id;
    const intruder = await signUp(server);
    assert.equal((await intruder.client.del(`/api/applications/${pending}`)).status, 404);
    assert.equal((await seeker.client.del(`/api/applications/${pending}`)).status, 204);
    assert.equal((await seeker.client.get(`/api/jobs/${jobId}`)).data.myApplication, null);

    const reapplied = (await seeker.client.post(`/api/jobs/${jobId}/applications`, {})).data.application.id;
    await employer.client.patch(`/api/applications/${reapplied}`, { status: 'rejected' });
    assert.equal((await seeker.client.del(`/api/applications/${reapplied}`)).data.error.code, 'CANNOT_WITHDRAW');
  });
});
