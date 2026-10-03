// Database adapter. One async API, two interchangeable backends:
//   - local file (node:sqlite)       default, used on your laptop
//   - Turso / libSQL (hosted SQLite) when TURSO_DATABASE_URL is set (Vercel + GitHub Actions)
// Callers use: db.get / db.all / db.run / db.batch  (all async, positional `?` params).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initKey } from './crypto.js';

export const IS_TURSO = !!process.env.TURSO_DATABASE_URL;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = IS_TURSO ? null : (process.env.DATA_DIR || path.join(root, 'data'));
if (DATA_DIR) fs.mkdirSync(DATA_DIR, { recursive: true });
initKey(DATA_DIR);

const SCHEMA_VERSION = 5;
const DDL = `
CREATE TABLE IF NOT EXISTS users (
  username     TEXT PRIMARY KEY COLLATE NOCASE,
  real_name    TEXT,
  avatar       TEXT,
  ranking      INTEGER,
  totals_json  TEXT,
  session_enc  TEXT,
  csrf_enc     TEXT,
  session_ok   INTEGER NOT NULL DEFAULT 1,
  full_synced  INTEGER NOT NULL DEFAULT 0,
  added_at     INTEGER NOT NULL,
  last_synced  INTEGER,
  sync_error   TEXT
);
CREATE TABLE IF NOT EXISTS questions (
  slug        TEXT PRIMARY KEY,
  frontend_id TEXT,
  title       TEXT NOT NULL,
  difficulty  TEXT NOT NULL,
  topics      TEXT NOT NULL DEFAULT '[]',
  rating      INTEGER
);
CREATE TABLE IF NOT EXISTS submissions (
  id        INTEGER PRIMARY KEY,
  username  TEXT NOT NULL COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  slug      TEXT NOT NULL,
  title     TEXT NOT NULL,
  status    TEXT NOT NULL,
  lang      TEXT,
  ts        INTEGER NOT NULL,
  platform  TEXT NOT NULL DEFAULT 'leetcode'
);
CREATE INDEX IF NOT EXISTS idx_sub_user_ts ON submissions(username, ts);
CREATE INDEX IF NOT EXISTS idx_sub_ts ON submissions(ts);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  username   TEXT NOT NULL COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS squads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  owner      TEXT NOT NULL COLLATE NOCASE,
  created_at INTEGER NOT NULL,
  tagline    TEXT,
  about      TEXT,
  audience   TEXT,
  rules      TEXT,
  tags       TEXT NOT NULL DEFAULT '[]',
  join_mode  TEXT NOT NULL DEFAULT 'invite',
  listed     INTEGER NOT NULL DEFAULT 0,
  color      TEXT NOT NULL DEFAULT 'pink'
);
CREATE INDEX IF NOT EXISTS idx_squads_listed ON squads(listed, created_at);
CREATE TABLE IF NOT EXISTS squad_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_id   INTEGER NOT NULL,
  username   TEXT NOT NULL COLLATE NOCASE,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  UNIQUE (squad_id, username)
);
CREATE INDEX IF NOT EXISTS idx_sr_squad ON squad_requests(squad_id, status);
CREATE TABLE IF NOT EXISTS squad_members (
  squad_id  INTEGER NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  username  TEXT NOT NULL COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (squad_id, username)
);
CREATE TABLE IF NOT EXISTS challenges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_id    INTEGER REFERENCES squads(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  creator     TEXT NOT NULL COLLATE NOCASE,
  start_day   TEXT NOT NULL,
  end_day     TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ch_squad ON challenges(squad_id);
CREATE TABLE IF NOT EXISTS avatars (
  username   TEXT PRIMARY KEY COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  mime       TEXT NOT NULL,
  data       BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  notes      TEXT,
  minutes    INTEGER,
  link       TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_act_user_day ON activities(username, day);
CREATE TABLE IF NOT EXISTS user_links (
  username    TEXT NOT NULL COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  platform    TEXT NOT NULL,
  handle      TEXT NOT NULL,
  data_json   TEXT,
  last_synced INTEGER,
  sync_error  TEXT,
  full_synced INTEGER NOT NULL DEFAULT 0,
  linked_at   INTEGER NOT NULL,
  PRIMARY KEY (username, platform)
);
CREATE TABLE IF NOT EXISTS clist_ratings (
  slug   TEXT PRIMARY KEY,
  rating INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS gh_days (
  username TEXT NOT NULL COLLATE NOCASE REFERENCES users(username) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  count    INTEGER NOT NULL,
  PRIMARY KEY (username, day)
);
CREATE TABLE IF NOT EXISTS sync_state (
  username     TEXT PRIMARY KEY COLLATE NOCASE,
  state        TEXT NOT NULL DEFAULT 'idle',
  message      TEXT,
  forced       INTEGER NOT NULL DEFAULT 0,
  requested_at INTEGER,
  updated_at   INTEGER
);
CREATE TABLE IF NOT EXISTS forum_posts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  author            TEXT NOT NULL COLLATE NOCASE,
  category          TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  tags              TEXT NOT NULL DEFAULT '[]',
  link              TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  last_activity     INTEGER NOT NULL,
  accepted_reply_id INTEGER,
  reply_count       INTEGER NOT NULL DEFAULT 0,
  like_count        INTEGER NOT NULL DEFAULT 0,
  squad_id          INTEGER,
  challenge_id      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_fp_activity ON forum_posts(last_activity);
CREATE INDEX IF NOT EXISTS idx_fp_squad ON forum_posts(squad_id, last_activity);
CREATE INDEX IF NOT EXISTS idx_fp_challenge ON forum_posts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_fp_cat ON forum_posts(category, last_activity);
CREATE INDEX IF NOT EXISTS idx_fp_author ON forum_posts(author);
CREATE TABLE IF NOT EXISTS forum_replies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author     TEXT NOT NULL COLLATE NOCASE,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fr_post ON forum_replies(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fr_author ON forum_replies(author);
CREATE TABLE IF NOT EXISTS forum_likes (
  target     TEXT NOT NULL,
  target_id  INTEGER NOT NULL,
  username   TEXT NOT NULL COLLATE NOCASE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (target, target_id, username)
);
CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL COLLATE NOCASE,
  type         TEXT NOT NULL,
  actor        TEXT,
  post_id      INTEGER,
  reply_id     INTEGER,
  squad_id     INTEGER,
  challenge_id INTEGER,
  title        TEXT,
  created_at   INTEGER NOT NULL,
  read_at      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(username, read_at, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_post ON notifications(post_id);
CREATE TABLE IF NOT EXISTS rate_hits (
  key TEXT NOT NULL,
  ts  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_key ON rate_hits(key, ts);
`.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);

/* ---------- value normalisation (both backends return the same shapes) ---------- */
const norm = (v) => (v instanceof ArrayBuffer ? Buffer.from(v) : v instanceof Uint8Array ? Buffer.from(v) : v);
const toRow = (r) => { if (!r) return undefined; const o = {}; for (const k of Object.keys(r)) o[k] = norm(r[k]); return o; };
const cleanArgs = (a) => a.map((x) => (x === undefined ? null : x));

/* ---------- backends ---------- */
let backend;
export let localDb = null; // raw node:sqlite handle, local mode only (used by backups)

if (IS_TURSO) {
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const res = (r) => ({ changes: Number(r.rowsAffected || 0), lastInsertRowid: Number(r.lastInsertRowid ?? 0) });
  backend = {
    get: async (sql, args) => toRow((await client.execute({ sql, args })).rows[0]),
    all: async (sql, args) => (await client.execute({ sql, args })).rows.map(toRow),
    run: async (sql, args) => res(await client.execute({ sql, args })),
    batch: async (stmts) => (await client.batch(stmts.map(([sql, args]) => ({ sql, args })), 'write')).map(res),
  };
} else {
  const { DatabaseSync } = await import('node:sqlite');
  const sdb = new DatabaseSync(path.join(DATA_DIR, 'leaderboard.db'));
  sdb.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  localDb = sdb;
  const cache = new Map();
  const prep = (sql) => { let s = cache.get(sql); if (!s) { s = sdb.prepare(sql); if (cache.size < 300) cache.set(sql, s); } return s; };
  const res = (r) => ({ changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) });
  backend = {
    get: async (sql, args) => toRow(prep(sql).get(...args)),
    all: async (sql, args) => prep(sql).all(...args).map(toRow),
    run: async (sql, args) => res(prep(sql).run(...args)),
    batch: async (stmts) => {
      sdb.exec('BEGIN');
      try {
        const out = stmts.map(([sql, args]) => res(prep(sql).run(...args)));
        sdb.exec('COMMIT');
        return out;
      } catch (e) { sdb.exec('ROLLBACK'); throw e; }
    },
  };
}

/* ---------- schema (once per process; cheap check after the first deploy) ---------- */
async function ensureSchema() {
  const hasKv = await backend.get("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='kv'", []);
  const ver = hasKv ? (await backend.get("SELECT value FROM kv WHERE key='schema_version'", []))?.value : null;
  if (ver === String(SCHEMA_VERSION)) return;
  // Older databases: add columns the CREATE TABLE above already contains for fresh ones.
  const cols = async (t) => (await backend.all(`PRAGMA table_info(${t})`, [])).map((c) => c.name);
  const hasTable = async (t) => !!(await backend.get("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?", [t]));
  const alters = [];
  if (await hasTable('submissions') && !(await cols('submissions')).includes('platform')) alters.push("ALTER TABLE submissions ADD COLUMN platform TEXT NOT NULL DEFAULT 'leetcode'");
  if (await hasTable('questions') && !(await cols('questions')).includes('rating')) alters.push('ALTER TABLE questions ADD COLUMN rating INTEGER');
  if (await hasTable('squads')) {
    const sc = await cols('squads');
    for (const [name, def] of [['tagline', 'TEXT'], ['about', 'TEXT'], ['audience', 'TEXT'], ['rules', 'TEXT'], ['tags', "TEXT NOT NULL DEFAULT '[]'"],
      ['join_mode', "TEXT NOT NULL DEFAULT 'invite'"], ['listed', 'INTEGER NOT NULL DEFAULT 0'], ['color', "TEXT NOT NULL DEFAULT 'pink'"]])
      if (!sc.includes(name)) alters.push(`ALTER TABLE squads ADD COLUMN ${name} ${def}`);
  }
  if (await hasTable('forum_posts')) {
    const fc = await cols('forum_posts');
    if (!fc.includes('squad_id')) alters.push('ALTER TABLE forum_posts ADD COLUMN squad_id INTEGER');
    if (!fc.includes('challenge_id')) alters.push('ALTER TABLE forum_posts ADD COLUMN challenge_id INTEGER');
  }
  for (const sql of alters) { try { await backend.run(sql, []); } catch { /* another instance got there first */ } }
  await backend.batch(DDL.map((s) => [s, []]));
  await backend.run("INSERT INTO kv (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [String(SCHEMA_VERSION)]);
}
export const ready = ensureSchema();

export const db = {
  get: async (sql, ...args) => { await ready; return backend.get(sql, cleanArgs(args)); },
  all: async (sql, ...args) => { await ready; return backend.all(sql, cleanArgs(args)); },
  run: async (sql, ...args) => { await ready; return backend.run(sql, cleanArgs(args)); },
  // Atomic: [[sql, ...params], ...]. Over Turso this is a single network round trip.
  batch: async (stmts) => { await ready; return stmts.length ? backend.batch(stmts.map(([sql, ...args]) => [sql, cleanArgs(args)])) : []; },
};

// Insert many rows in atomic chunks (keeps each round trip a sensible size).
export async function batchChunks(stmts, size = 400) {
  for (let i = 0; i < stmts.length; i += size) await db.batch(stmts.slice(i, i + size));
}
