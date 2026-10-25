import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { signUp, startTestServer, validJob } from './helpers.js';

describe('messaging', () => {
  let server;
  before(async () => {
    server = await startTestServer();
  });
  after(() => server.close());

  it('opens one conversation per pair, tracks unread messages and read receipts', async () => {
    const employer = await signUp(server, { role: 'employer', name: 'مخبزة السلام' });
    const seeker = await signUp(server, { name: 'سليم' });
    const job = (await employer.client.post('/api/jobs', validJob({ title: 'مطلوب خباز بخبرة' }))).data.job;

    const started = await seeker.client.post('/api/conversations', { userId: employer.user.id, jobId: job.id });
    assert.equal(started.status, 201);
    const conversationId = started.data.conversation.id;
    const reused = await employer.client.post('/api/conversations', { userId: seeker.user.id });
    assert.equal(reused.data.conversation.id, conversationId);

    assert.deepEqual((await seeker.client.get('/api/conversations')).data.items, [], 'empty conversations stay out of the inbox');

    const sent = await seeker.client.post(`/api/conversations/${conversationId}/messages`, { body: '  السلام عليكم، هل العرض مازال متاحًا؟  ' });
    assert.equal(sent.status, 201);
    assert.equal(sent.data.message.body, 'السلام عليكم، هل العرض مازال متاحًا؟');
    assert.equal(sent.data.message.isMine, true);

    assert.equal((await employer.client.get('/api/me/summary')).data.messages, 1);
    const inbox = await employer.client.get('/api/conversations');
    assert.equal(inbox.data.items[0].other.name, 'سليم');
    assert.equal(inbox.data.items[0].unread, 1);
    assert.equal(inbox.data.items[0].job.title, 'مطلوب خباز بخبرة');
    assert.equal(inbox.data.items[0].lastMessage.isMine, false);

    const thread = await employer.client.get(`/api/conversations/${conversationId}/messages`);
    assert.equal(thread.data.conversation.other.name, 'سليم');
    assert.equal(thread.data.messages.length, 1);
    assert.equal(thread.data.messages[0].isMine, false);
    assert.equal((await employer.client.get('/api/me/summary')).data.messages, 0);

    const reply = await employer.client.post(`/api/conversations/${conversationId}/messages`, { body: 'نعم، تفضل غدًا صباحًا' });
    const newer = await seeker.client.get(`/api/conversations/${conversationId}/messages?after=${sent.data.message.id}`);
    assert.deepEqual(newer.data.messages.map((message) => message.id), [reply.data.message.id]);

    const ownView = await seeker.client.get(`/api/conversations/${conversationId}/messages`);
    assert.ok(ownView.data.messages[0].readAt, 'the first message was read by the employer');
  });

  it('keeps conversations private and validates messages', async () => {
    const alice = await signUp(server);
    const bob = await signUp(server);
    const eve = await signUp(server);
    const { id } = (await alice.client.post('/api/conversations', { userId: bob.user.id })).data.conversation;

    assert.equal((await eve.client.get(`/api/conversations/${id}/messages`)).status, 404);
    assert.equal((await eve.client.post(`/api/conversations/${id}/messages`, { body: 'مرحبا' })).status, 404);
    assert.equal((await alice.client.post(`/api/conversations/${id}/messages`, { body: '   ' })).status, 422);
    assert.equal((await alice.client.post('/api/conversations', { userId: alice.user.id })).status, 404);
    assert.equal((await alice.client.post('/api/conversations', { userId: 987654 })).status, 404);
  });

  it('stops delivering messages to banned accounts', async () => {
    const admin = server.owner;
    const sender = await signUp(server);
    const target = await signUp(server);
    const { id } = (await sender.client.post('/api/conversations', { userId: target.user.id })).data.conversation;
    await admin.client.patch(`/api/admin/users/${target.user.id}`, { isBanned: true });
    const blocked = await sender.client.post(`/api/conversations/${id}/messages`, { body: 'مرحبا' });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.data.error.code, 'RECIPIENT_UNAVAILABLE');
  });
});
