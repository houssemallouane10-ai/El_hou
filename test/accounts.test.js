import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN_PHONE, PASSWORD, nextPhone, signUp, startTestServer, validJob } from './helpers.js';

describe('accounts', () => {
  let server;
  before(async () => {
    server = await startTestServer();
  });
  after(() => server.close());

  it('registers a user, sets a session cookie and returns the profile', async () => {
    const client = server.client();
    const phone = nextPhone();
    const response = await client.post('/api/auth/register', { name: '  أحمد   بن علي ', phone, password: PASSWORD, role: 'seeker' });
    assert.equal(response.status, 201);
    assert.equal(response.data.user.name, 'أحمد بن علي');
    assert.equal(response.data.user.phone, phone);
    assert.equal(response.data.user.location, 'bir-el-ater');
    assert.equal(response.data.user.passwordHash, undefined);
    const cookie = response.headers.getSetCookie().find((header) => header.startsWith('kh_session='));
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);

    const session = await client.get('/api/session');
    assert.equal(session.data.user.id, response.data.user.id);
    assert.deepEqual(session.data.saved, { jobs: [], workers: [] });
    assert.deepEqual(session.data.summary, { notifications: 0, messages: 0, applications: 0 });
  });

  it('reports every invalid registration field at once', async () => {
    const response = await server.client().post('/api/auth/register', { name: 'x', phone: '12345', password: 'short', role: 'boss' });
    assert.equal(response.status, 422);
    assert.equal(response.data.error.code, 'VALIDATION_FAILED');
    assert.deepEqual(response.data.error.fields, { name: 'too_short', phone: 'invalid_mobile', password: 'too_short', role: 'invalid' });
  });

  it('normalizes international and Arabic-Indic phone numbers', async () => {
    const response = await server.client().post('/api/auth/register', {
      name: 'سارة',
      phone: '+213 ٧٧٠ ١٢ ٣٤ ٥٦',
      password: PASSWORD,
      role: 'seeker',
    });
    assert.equal(response.status, 201);
    assert.equal(response.data.user.phone, '0770123456');
    const login = await server.client().post('/api/auth/login', { phone: '00213770123456', password: PASSWORD });
    assert.equal(login.status, 200);
  });

  it('rejects a phone number that is already registered', async () => {
    const { phone } = await signUp(server);
    const response = await server.client().post('/api/auth/register', { name: 'مكرر', phone, password: PASSWORD, role: 'seeker' });
    assert.equal(response.status, 409);
    assert.equal(response.data.error.code, 'PHONE_TAKEN');
  });

  it('logs in, rejects wrong passwords and logs out', async () => {
    const { phone } = await signUp(server);
    const client = server.client();
    assert.equal((await client.post('/api/auth/login', { phone, password: 'wrong-password' })).data.error.code, 'INVALID_CREDENTIALS');
    assert.equal((await client.post('/api/auth/login', { phone: '0551999999', password: PASSWORD })).status, 401);
    assert.equal((await client.post('/api/auth/login', { phone, password: PASSWORD })).status, 200);
    assert.ok((await client.get('/api/session')).data.user);
    assert.equal((await client.post('/api/auth/logout')).status, 204);
    assert.equal((await client.get('/api/session')).data.user, null);
    assert.equal((await client.get('/api/me/summary')).status, 401);
  });

  it('grants admin rights to phones listed in ADMIN_PHONES', async () => {
    const { user } = await signUp(server, { phone: ADMIN_PHONE, name: 'المشرف' });
    assert.equal(user.isAdmin, true);
    const { user: regular } = await signUp(server);
    assert.equal(regular.isAdmin, false);
  });

  it('requires a headline and a category before listing a worker profile', async () => {
    const { client } = await signUp(server);
    const rejected = await client.patch('/api/me', { isListed: true });
    assert.equal(rejected.status, 422);
    assert.deepEqual(rejected.data.error.fields, { headline: 'required_for_listing', category: 'required_for_listing' });

    const accepted = await client.patch('/api/me', {
      isListed: true,
      headline: 'كهربائي معتمد',
      category: 'crafts',
      experienceYears: 6,
      skills: ['تركيب', 'صيانة', 'تركيب'],
      whatsapp: '0661 11 22 33',
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.user.isListed, true);
    assert.deepEqual(accepted.data.user.skills, ['تركيب', 'صيانة']);
    assert.equal(accepted.data.user.whatsapp, '0661112233');

    const partial = await client.patch('/api/me', { bio: 'خبرة في البيوت والمحلات' });
    assert.equal(partial.data.user.headline, 'كهربائي معتمد');
    assert.equal(partial.data.user.bio, 'خبرة في البيوت والمحلات');
  });

  it('finds listed workers with spelling-tolerant Arabic search', async () => {
    const { client, user } = await signUp(server, { name: 'عمر' });
    await client.patch('/api/me', { isListed: true, headline: 'أستاذ رياضيات للدروس الخصوصية', category: 'education', location: 'cheria' });
    const found = await server.client().get(`/api/workers?q=${encodeURIComponent('استاذ رياضيات')}`);
    assert.ok(found.data.items.some((worker) => worker.id === user.id));
    const filtered = await server.client().get('/api/workers?category=education&location=cheria');
    assert.ok(filtered.data.items.every((worker) => worker.category === 'education' && worker.location === 'cheria'));
    const other = await server.client().get('/api/workers?location=ouenza');
    assert.ok(!other.data.items.some((worker) => worker.id === user.id));
  });

  it('keeps unlisted seeker profiles private except for employers they applied to', async () => {
    const seeker = await signUp(server, { name: 'باحث خاص' });
    const employer = await signUp(server, { role: 'employer', name: 'صاحب عمل' });
    const stranger = await signUp(server);

    assert.equal((await stranger.client.get(`/api/users/${seeker.user.id}`)).data.error.code, 'PROFILE_PRIVATE');
    assert.equal((await seeker.client.get(`/api/users/${seeker.user.id}`)).status, 200);

    const job = await employer.client.post('/api/jobs', validJob());
    await seeker.client.post(`/api/jobs/${job.data.job.id}/applications`, { message: 'مهتم' });
    const visible = await employer.client.get(`/api/users/${seeker.user.id}`);
    assert.equal(visible.status, 200);
    assert.equal(visible.data.user.contact.phone, seeker.phone);

    const employerProfile = await stranger.client.get(`/api/users/${employer.user.id}`);
    assert.equal(employerProfile.status, 200);
    assert.equal(employerProfile.data.user.contact, null);
  });

  it('changes the password and signs out other sessions', async () => {
    const { client, phone } = await signUp(server);
    const otherDevice = server.client();
    await otherDevice.post('/api/auth/login', { phone, password: PASSWORD });

    const wrong = await client.put('/api/me/password', { currentPassword: 'nope-nope', newPassword: 'new-password-1' });
    assert.deepEqual(wrong.data.error.fields, { currentPassword: 'wrong_password' });

    assert.equal((await client.put('/api/me/password', { currentPassword: PASSWORD, newPassword: 'new-password-1' })).status, 204);
    assert.ok((await client.get('/api/session')).data.user);
    assert.equal((await otherDevice.get('/api/session')).data.user, null);
    assert.equal((await server.client().post('/api/auth/login', { phone, password: 'new-password-1' })).status, 200);
  });

  it('saves job alert categories and rejects unknown ones', async () => {
    const { client } = await signUp(server);
    assert.deepEqual((await client.put('/api/me/alerts', { categories: ['transport', 'crafts'] })).data.categories, ['transport', 'crafts']);
    assert.equal((await client.put('/api/me/alerts', { categories: ['astronaut'] })).status, 422);
    assert.deepEqual((await client.get('/api/session')).data.user.alertCategories, ['transport', 'crafts']);
  });

  it('deletes the account and everything it owns after password confirmation', async () => {
    const { client, user, phone } = await signUp(server, { role: 'employer' });
    const job = await client.post('/api/jobs', validJob());
    assert.equal((await client.post('/api/me/deletion', { password: 'wrong-password' })).status, 422);
    assert.equal((await client.post('/api/me/deletion', { password: PASSWORD })).status, 204);
    assert.equal((await client.get('/api/session')).data.user, null);
    assert.equal((await server.client().get(`/api/jobs/${job.data.job.id}`)).status, 404);
    assert.equal((await server.client().get(`/api/users/${user.id}`)).status, 404);
    assert.equal((await server.client().post('/api/auth/login', { phone, password: PASSWORD })).status, 401);
  });
});
