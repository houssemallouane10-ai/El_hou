import { createHash, randomBytes } from 'node:crypto';
import { DAY_MS } from '../../shared/clock.js';

// Opaque bearer tokens kept in an HttpOnly cookie. Only a SHA-256 of each token is stored,
// so a database leak does not hand out live sessions.
const hashToken = (token) => createHash('sha256').update(token).digest('base64url');

export const createSessionStore = ({ db, clock, ttlDays }) => {
  const ttlMs = ttlDays * DAY_MS;
  const statements = {
    insert: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)'),
    find: db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'),
    extend: db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?'),
    remove: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    removeForUser: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    removeOthers: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  };

  const expiryFrom = (now) => new Date(now.getTime() + ttlMs).toISOString();

  return {
    ttlMs,

    open(userId, userAgent) {
      const token = randomBytes(32).toString('base64url');
      const now = clock.now();
      statements.insert.run(hashToken(token), userId, now.toISOString(), expiryFrom(now), userAgent ? String(userAgent).slice(0, 200) : null);
      return token;
    },

    // Returns the session owner and whether the expiry slid forward (so the cookie can be refreshed).
    resolve(token) {
      if (!token) return null;
      const tokenHash = hashToken(token);
      const row = statements.find.get(tokenHash);
      if (!row) return null;
      const now = clock.now();
      const remainingMs = new Date(row.expires_at).getTime() - now.getTime();
      if (remainingMs <= 0) {
        statements.remove.run(tokenHash);
        return null;
      }
      const renewed = remainingMs < ttlMs / 2;
      if (renewed) statements.extend.run(expiryFrom(now), tokenHash);
      return { userId: row.user_id, renewed };
    },

    close(token) {
      if (token) statements.remove.run(hashToken(token));
    },

    closeAllForUser(userId) {
      statements.removeForUser.run(userId);
    },

    closeOthers(userId, keepToken) {
      statements.removeOthers.run(userId, hashToken(keepToken));
    },

    purgeExpired() {
      return statements.purge.run(clock.now().toISOString()).changes;
    },
  };
};
