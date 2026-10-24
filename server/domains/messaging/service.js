import { LIMITS } from '../../../shared/limits.js';
import { addDays } from '../../shared/clock.js';
import { forbidden, notFound, rateLimited } from '../../shared/errors.js';
import { createValidator, parseId } from '../../shared/validation.js';

const MAX_NEW_CONVERSATIONS_PER_DAY = 30;
const MAX_MESSAGES_PER_MINUTE = 20;
const PAGE_SIZE = 50;
const PREVIEW_LENGTH = 120;

const parseStart = (input) => {
  const userId = parseId(input?.userId);
  const jobId = input?.jobId === undefined || input?.jobId === null ? null : parseId(input.jobId);
  return { userId, jobId };
};

const parseMessage = (input) => createValidator(input)
  .text('body', { required: true, ...LIMITS.messageBody, multiline: true })
  .result();

const toMessageView = (row, viewerId) => ({
  id: row.id,
  body: row.body,
  isMine: row.sender_id === viewerId,
  createdAt: row.created_at,
  readAt: row.read_at,
});

export const createMessagingService = ({ db, clock, accounts, jobs }) => {
  const statements = {
    byId: db.prepare('SELECT * FROM conversations WHERE id = ?'),
    byPair: db.prepare('SELECT * FROM conversations WHERE user_low = ? AND user_high = ?'),
    create: db.prepare('INSERT INTO conversations (user_low, user_high, job_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)'),
    setJob: db.prepare('UPDATE conversations SET job_id = ? WHERE id = ?'),
    startedSince: db.prepare('SELECT COUNT(*) AS total FROM conversations WHERE created_by = ? AND created_at >= ?'),
    list: db.prepare(`
      SELECT c.id, c.job_id, c.last_message_at,
        CASE WHEN c.user_low = @me THEN c.user_high ELSE c.user_low END AS other_id,
        (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body,
        (SELECT sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender_id,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != @me AND m.read_at IS NULL) AS unread
      FROM conversations c
      WHERE (c.user_low = @me OR c.user_high = @me) AND c.last_message_at IS NOT NULL
      ORDER BY c.last_message_at DESC
      LIMIT 100
    `),
    latest: db.prepare('SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC'),
    after: db.prepare('SELECT * FROM messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC LIMIT ?'),
    before: db.prepare('SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? AND id < ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC'),
    insert: db.prepare('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)'),
    byMessageId: db.prepare('SELECT * FROM messages WHERE id = ?'),
    touch: db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?'),
    markRead: db.prepare('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL'),
    unread: db.prepare(`
      SELECT COUNT(*) AS total FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE (c.user_low = @me OR c.user_high = @me) AND m.sender_id != @me AND m.read_at IS NULL
    `),
    sentSince: db.prepare('SELECT COUNT(*) AS total FROM messages WHERE sender_id = ? AND created_at >= ?'),
    total: db.prepare('SELECT COUNT(*) AS total FROM messages'),
  };

  const otherParticipant = (conversation, userId) => (conversation.user_low === userId ? conversation.user_high : conversation.user_low);

  const requireParticipant = (userId, conversationId) => {
    const conversation = statements.byId.get(conversationId);
    if (!conversation || (conversation.user_low !== userId && conversation.user_high !== userId)) throw notFound('CONVERSATION_NOT_FOUND');
    return conversation;
  };

  const jobContext = (jobId) => {
    const job = jobId ? jobs.describe(jobId) : null;
    return job && job.isVisible ? { id: job.id, title: job.title } : null;
  };

  return {
    // Opens (or reuses) the one conversation between two people, optionally about a job offer.
    start(userId, input) {
      const { userId: otherId, jobId } = parseStart(input);
      if (!otherId || otherId === userId || !accounts.isActiveUser(otherId)) throw notFound('USER_NOT_FOUND');
      const context = jobContext(jobId);
      const [low, high] = userId < otherId ? [userId, otherId] : [otherId, userId];
      const existing = statements.byPair.get(low, high);
      if (existing) {
        if (context && existing.job_id !== context.id) statements.setJob.run(context.id, existing.id);
        return { id: existing.id };
      }
      const now = clock.now();
      if (statements.startedSince.get(userId, addDays(now, -1).toISOString()).total >= MAX_NEW_CONVERSATIONS_PER_DAY) throw rateLimited();
      const id = statements.create.run(low, high, context?.id ?? null, userId, now.toISOString()).lastInsertRowid;
      return { id: Number(id) };
    },

    list(userId) {
      const rows = statements.list.all({ me: userId });
      const people = accounts.cardsByIds(rows.map((row) => row.other_id));
      return rows.map((row) => ({
        id: row.id,
        other: people.get(row.other_id) ?? null,
        job: jobContext(row.job_id),
        lastMessage: row.last_body === null ? null : {
          preview: row.last_body.slice(0, PREVIEW_LENGTH),
          isMine: row.last_sender_id === userId,
          createdAt: row.last_message_at,
        },
        unread: row.unread,
      }));
    },

    // Messages in ascending order. `after` polls for new ones, `before` pages back in history.
    // Reading a thread marks the other person's messages as read.
    thread(userId, conversationId, { after = null, before = null } = {}) {
      const conversation = requireParticipant(userId, conversationId);
      const afterId = parseId(after);
      const beforeId = parseId(before);
      let rows;
      if (afterId) rows = statements.after.all(conversationId, afterId, PAGE_SIZE);
      else if (beforeId) rows = statements.before.all(conversationId, beforeId, PAGE_SIZE);
      else rows = statements.latest.all(conversationId, PAGE_SIZE);
      statements.markRead.run(clock.now().toISOString(), conversationId, userId);
      const otherId = otherParticipant(conversation, userId);
      return {
        conversation: {
          id: conversation.id,
          other: accounts.cardsByIds([otherId]).get(otherId) ?? null,
          otherIsActive: accounts.isActiveUser(otherId),
          job: jobContext(conversation.job_id),
        },
        messages: rows.map((row) => toMessageView(row, userId)),
        hasOlder: !afterId && rows.length === PAGE_SIZE,
      };
    },

    send(userId, conversationId, input) {
      const { body } = parseMessage(input);
      const conversation = requireParticipant(userId, conversationId);
      if (!accounts.isActiveUser(otherParticipant(conversation, userId))) throw forbidden('RECIPIENT_UNAVAILABLE');
      const now = clock.now();
      if (statements.sentSince.get(userId, new Date(now.getTime() - 60_000).toISOString()).total >= MAX_MESSAGES_PER_MINUTE) throw rateLimited();
      const id = db.transaction(() => {
        const inserted = statements.insert.run(conversationId, userId, body, now.toISOString()).lastInsertRowid;
        statements.touch.run(now.toISOString(), conversationId);
        return Number(inserted);
      })();
      return toMessageView(statements.byMessageId.get(id), userId);
    },

    unreadCount: (userId) => statements.unread.get({ me: userId }).total,

    stats: () => ({ total: statements.total.get().total }),
  };
};
