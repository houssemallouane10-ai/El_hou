// Who has blocked whom. A block works one way for listing (the blocker no longer sees the
// conversation) and both ways for writing (neither side can send or start a conversation).
export const createBlockStore = ({ db, clock }) => {
  const statements = {
    add: db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)'),
    remove: db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?'),
    has: db.prepare('SELECT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?) AS found'),
    between: db.prepare(`SELECT EXISTS (
      SELECT 1 FROM blocks WHERE (blocker_id = @a AND blocked_id = @b) OR (blocker_id = @b AND blocked_id = @a)
    ) AS found`),
    listByBlocker: db.prepare('SELECT blocked_id AS userId, created_at AS createdAt FROM blocks WHERE blocker_id = ? ORDER BY created_at DESC'),
    count: db.prepare('SELECT COUNT(*) AS total FROM blocks'),
  };

  return {
    add: (blockerId, blockedId) => statements.add.run(blockerId, blockedId, clock.now().toISOString()),
    remove: (blockerId, blockedId) => statements.remove.run(blockerId, blockedId),
    has: (blockerId, blockedId) => Boolean(statements.has.get(blockerId, blockedId).found),
    between: (a, b) => Boolean(statements.between.get({ a, b }).found),
    listByBlocker: (blockerId) => statements.listByBlocker.all(blockerId),
    count: () => statements.count.get().total,
  };
};
