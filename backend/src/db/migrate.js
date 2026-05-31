// src/db/migrate.js
// Run this once with: node src/db/migrate.js
// It creates all tables that don't already exist (idempotent).

require('dotenv').config();
const pool = require('./pool');

const migrations = [
  // ──────────────────────────────────────────────
  // STEP 1 TABLES
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name   TEXT NOT NULL,
    bio         TEXT DEFAULT '',
    institution TEXT DEFAULT '',
    avatar_url  TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS skills (
    id       SERIAL PRIMARY KEY,
    name     TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'General'
  )`,

  `CREATE TABLE IF NOT EXISTS user_skills (
    user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    level    SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, skill_id)
  )`,

  // ──────────────────────────────────────────────
  // STEP 4 TABLES  (created early so they exist when needed)
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'recruiting'
                  CHECK (status IN ('recruiting','active','completed')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS project_skills (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    skill_id   INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    importance SMALLINT NOT NULL CHECK (importance BETWEEN 1 AND 5),
    PRIMARY KEY (project_id, skill_id)
  )`,

  // ──────────────────────────────────────────────
  // STEP 6 TABLES
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS applications (
    id         SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','rejected')),
    message    TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ──────────────────────────────────────────────
  // STEP 7 TABLES
  // ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    sender_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ──────────────────────────────────────────────
  // FIREBASE AUTH MIGRATION
  // Adds firebase_uid for OAuth users (Google Sign-In, etc.)
  // Makes password_hash nullable so Google-only accounts don't need a local password.
  // Both ALTER statements are safe to re-run (idempotent via IF NOT EXISTS / IF EXISTS).
  // ──────────────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT`,

  `CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_idx
   ON users (firebase_uid)
   WHERE firebase_uid IS NOT NULL`,

  // Make password_hash nullable for Firebase/OAuth-only accounts
  // This ALTER is safe: existing rows keep their password_hash value unchanged.
  `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,

  // ──────────────────────────────────────────────
  // SEED: common engineering skills (idempotent via INSERT … ON CONFLICT)
  // ──────────────────────────────────────────────
  `INSERT INTO skills (name, category) VALUES
    ('JavaScript', 'Frontend'),
    ('TypeScript', 'Frontend'),
    ('React', 'Frontend'),
    ('Next.js', 'Frontend'),
    ('HTML/CSS', 'Frontend'),
    ('Node.js', 'Backend'),
    ('Express', 'Backend'),
    ('Python', 'Backend'),
    ('FastAPI', 'Backend'),
    ('Django', 'Backend'),
    ('PostgreSQL', 'Database'),
    ('MongoDB', 'Database'),
    ('Redis', 'Database'),
    ('Docker', 'DevOps'),
    ('AWS', 'DevOps'),
    ('Git', 'DevOps'),
    ('Machine Learning', 'AI/ML'),
    ('Deep Learning', 'AI/ML'),
    ('Computer Vision', 'AI/ML'),
    ('NLP', 'AI/ML'),
    ('React Native', 'Mobile'),
    ('Flutter', 'Mobile'),
    ('Java', 'Backend'),
    ('C++', 'Systems'),
    ('Rust', 'Systems')
  ON CONFLICT (name) DO NOTHING`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄  Running migrations…');
    for (const sql of migrations) {
      await client.query(sql);
    }
    console.log('✅  All migrations complete.');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
