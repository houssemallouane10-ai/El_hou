import { addDays } from '../../shared/clock.js';
import { parseJsonObject } from '../../shared/db/database.js';
import { pageOf } from '../../shared/paging.js';

// Notifications store a type and structured data; the browser renders the localized sentence,
// so the same record reads correctly in Arabic and French.
const NOTIFICATION_TYPES = new Set([
  'application.received',
  'application.status',
  'job.alert',
  'job.hidden',
  'account.verified',
]);

const RETENTION_DAYS = 120;

const toView = (row) => ({
  id: row.id,
  type: row.type,
  data: parseJsonObject(row.data),
  isRead: Boolean(row.is_read),
  createdAt: row.created_at,
});

export const createNotificationsService = ({ db, clock }) => {
  const statements = {
    insert: db.prepare('INSERT INTO notifications (user_id, type, data, created_at) VALUES (?, ?, ?, ?)'),
    list: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'),
    count: db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?'),
    unread: db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0'),
    markRead: db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?'),
    markAllRead: db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'),
    prune: db.prepare('DELETE FROM notifications WHERE created_at < ?'),
  };

  const assertType = (type) => {
    if (!NOTIFICATION_TYPES.has(type)) throw new Error(`Unknown notification type: ${type}`);
  };

  return {
    notify(userId, type, data) {
      assertType(type);
      statements.insert.run(userId, type, JSON.stringify(data ?? {}), clock.now().toISOString());
    },

    notifyMany(userIds, type, data) {
      assertType(type);
      if (userIds.length === 0) return;
      const payload = JSON.stringify(data ?? {});
      const createdAt = clock.now().toISOString();
      db.transaction(() => {
        for (const userId of userIds) statements.insert.run(userId, type, payload, createdAt);
      })();
    },

    list(userId, paging) {
      const rows = statements.list.all(userId, paging.limit, paging.offset);
      return pageOf(rows.map(toView), statements.count.get(userId).total, paging);
    },

    unreadCount: (userId) => statements.unread.get(userId).total,

    markRead(userId, id) {
      statements.markRead.run(userId, id);
    },

    markAllRead(userId) {
      statements.markAllRead.run(userId);
    },

    pruneOld() {
      return statements.prune.run(addDays(clock.now(), -RETENTION_DAYS).toISOString()).changes;
    },
  };
};
