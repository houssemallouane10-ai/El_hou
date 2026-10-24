import { communeById } from '../../../shared/geo.js';

// Forward-only schema migrations. Append new entries; never edit an applied one.
// A migration is either plain `sql` or an `up(db)` function; each runs in one transaction.

// Version 1 stored places as slugs of the communes of Tébessa; version 2 maps them to the
// national commune ids of shared/geo.js. "outside" had no commune and becomes unknown.
const LEGACY_LOCATIONS = {
  'bir-el-ater': 365, tebessa: 364, 'oum-ali': 384, bedjene: 389, bekkaria: 380, boukhadra: 381,
  'boulhaf-dyr': 388, 'bir-dheb': 377, 'bir-mokkadem': 373, thlidjene: 385, 'el-hammamet': 371,
  'el-houidjbet': 369, cheria: 366, 'stah-guentis': 367, 'safsaf-el-ouesra': 370, 'el-ogla': 378,
  'el-ogla-el-malha': 376, 'el-aouinet': 368, 'ain-zerga': 386, ferkane: 391, gorriguer: 379,
  'el-kouif': 374, 'el-ma-labiodh': 383, morsott: 375, 'el-meridj': 387, 'el-mezeraa': 390,
  negrine: 372, ouenza: 382,
};

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
  {
    version: 2,
    name: 'national places, user blocks, terms acceptance',
    up(db) {
      db.exec(`
        ALTER TABLE users ADD COLUMN wilaya_code INTEGER;
        ALTER TABLE users ADD COLUMN commune_id INTEGER;
        ALTER TABLE users ADD COLUMN alert_wilaya INTEGER;
        ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
        ALTER TABLE jobs ADD COLUMN wilaya_code INTEGER;
        ALTER TABLE jobs ADD COLUMN commune_id INTEGER;
      `);
      for (const table of ['users', 'jobs']) {
        const update = db.prepare(`UPDATE ${table} SET commune_id = ?, wilaya_code = ?, search_text = '' WHERE id = ?`);
        for (const row of db.prepare(`SELECT id, location FROM ${table}`).all()) {
          const commune = communeById(LEGACY_LOCATIONS[row.location]);
          update.run(commune?.id ?? null, commune?.wilaya ?? null, row.id);
        }
      }
      db.exec(`
        DROP INDEX users_directory_idx;
        ALTER TABLE users DROP COLUMN location;
        ALTER TABLE jobs DROP COLUMN location;
        CREATE INDEX users_directory_idx ON users (is_listed, is_banned, wilaya_code, category);
        CREATE INDEX jobs_wilaya_idx ON jobs (wilaya_code, published_at);
        CREATE INDEX jobs_commune_idx ON jobs (commune_id);

        CREATE TABLE blocks (
          blocker_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          blocked_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          PRIMARY KEY (blocker_id, blocked_id),
          CHECK (blocker_id != blocked_id)
        );
        CREATE INDEX blocks_blocked_idx ON blocks (blocked_id);
      `);
    },
  },
  {
    version: 3,
    name: 'owners recorded on the account',
    sql: 'ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0;',
  },
];

// `upTo` stops at a given version (used by tests to build an older schema).
export const migrate = (db, { now = () => new Date(), upTo = Infinity } = {}) => {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').pluck().all());
  const record = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
  const apply = db.transaction((migration) => {
    if (migration.up) migration.up(db);
    else db.exec(migration.sql);
    record.run(migration.version, migration.name, now().toISOString());
  });
  for (const migration of MIGRATIONS) {
    if (migration.version <= upTo && !applied.has(migration.version)) apply(migration);
  }
};
