// Forward-only schema migrations. Append new entries; never edit an applied one.

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial schema',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('seeker', 'employer')),
        is_admin INTEGER NOT NULL DEFAULT 0,
        is_verified INTEGER NOT NULL DEFAULT 0,
        is_banned INTEGER NOT NULL DEFAULT 0,
        company_name TEXT,
        headline TEXT,
        bio TEXT,
        category TEXT,
        experience_years INTEGER,
        skills TEXT NOT NULL DEFAULT '[]',
        location TEXT NOT NULL DEFAULT 'bir-el-ater',
        whatsapp TEXT,
        expected_pay TEXT,
        is_listed INTEGER NOT NULL DEFAULT 0,
        is_available INTEGER NOT NULL DEFAULT 1,
        alert_categories TEXT NOT NULL DEFAULT '[]',
        search_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_seen_at TEXT
      );
      CREATE INDEX users_directory_idx ON users (is_listed, is_banned, category, location);

      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        user_agent TEXT
      );
      CREATE INDEX sessions_user_idx ON sessions (user_id);
      CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

      CREATE TABLE jobs (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        job_type TEXT NOT NULL,
        location TEXT NOT NULL,
        address TEXT,
        description TEXT NOT NULL,
        requirements TEXT,
        salary_min INTEGER,
        salary_max INTEGER,
        salary_period TEXT NOT NULL DEFAULT 'negotiable',
        positions INTEGER NOT NULL DEFAULT 1,
        contact_phone TEXT NOT NULL,
        contact_whatsapp TEXT,
        is_urgent INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        views INTEGER NOT NULL DEFAULT 0,
        search_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        published_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX jobs_feed_idx ON jobs (status, is_hidden, expires_at, published_at);
      CREATE INDEX jobs_category_idx ON jobs (category, published_at);
      CREATE INDEX jobs_owner_idx ON jobs (user_id, created_at);

      CREATE TABLE applications (
        id INTEGER PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected')),
        is_seen INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (job_id, user_id)
      );
      CREATE INDEX applications_user_idx ON applications (user_id, created_at);

      CREATE TABLE saved_jobs (
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        job_id INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, job_id)
      );

      CREATE TABLE saved_workers (
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, worker_id)
      );

      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        data TEXT NOT NULL DEFAULT '{}',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX notifications_user_idx ON notifications (user_id, id);

      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY,
        user_low INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        user_high INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        job_id INTEGER REFERENCES jobs (id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
        last_message_at TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (user_low, user_high),
        CHECK (user_low < user_high)
      );
      CREATE INDEX conversations_high_idx ON conversations (user_high);

      CREATE TABLE messages (
        id INTEGER PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        read_at TEXT
      );
      CREATE INDEX messages_conversation_idx ON messages (conversation_id, id);
      CREATE INDEX messages_sender_idx ON messages (sender_id, created_at);

      CREATE TABLE reports (
        id INTEGER PRIMARY KEY,
        reporter_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('job', 'user')),
        target_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by INTEGER REFERENCES users (id) ON DELETE SET NULL
      );
      CREATE INDEX reports_status_idx ON reports (status, created_at);
      CREATE INDEX reports_target_idx ON reports (target_type, target_id);
    `,
  },
];

export const migrate = (db, { now = () => new Date() } = {}) => {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').pluck().all());
  const record = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
  const apply = db.transaction((migration) => {
    db.exec(migration.sql);
    record.run(migration.version, migration.name, now().toISOString());
  });
  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) apply(migration);
  }
};
