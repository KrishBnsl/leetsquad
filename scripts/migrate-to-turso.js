// One-off: copy a local SQLite database (default data/leaderboard.db) into Turso (or any libSQL URL).
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.js [path/to/leaderboard.db]
// Safe to re-run: rows are upserted by primary key. Your SECRET_KEY_HEX must match data/secret.key, otherwise the
// copied LeetCode cookies can't be decrypted — this script prints the right value if you haven't set it.
import '../server/env.js';
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(process.argv[2] || 'data/leaderboard.db');
if (!fs.existsSync(src)) { console.error(`No local database at ${src}`); process.exit(1); }
if (!process.env.TURSO_DATABASE_URL) { console.error('Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) first.'); process.exit(1); }

const keyFile = path.join(path.dirname(src), 'secret.key');
if (!process.env.SECRET_KEY_HEX && !process.env.SECRET_KEY) {
  if (!fs.existsSync(keyFile)) { console.error('Set SECRET_KEY_HEX (the contents of data/secret.key).'); process.exit(1); }
  process.env.SECRET_KEY_HEX = fs.readFileSync(keyFile, 'utf8').trim();
}

const { DatabaseSync } = await import('node:sqlite');
const { db, ready, batchChunks } = await import('../server/db.js');
await ready;

const local = new DatabaseSync(src, { readOnly: true });
// Parents before children; sync_state / rate_hits are transient and skipped.
const TABLES = ['users', 'questions', 'clist_ratings', 'submissions', 'sessions', 'squads', 'squad_members', 'challenges',
  'avatars', 'activities', 'user_links', 'gh_days', 'kv'];

for (const table of TABLES) {
  const exists = local.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!exists) { console.log(`- ${table}: (not in source, skipped)`); continue; }
  const rows = local.prepare(`SELECT * FROM ${table}`).all()
    .filter((r) => table !== 'kv' || !['schema_version', 'last_dispatch'].includes(r.key));
  if (!rows.length) { console.log(`- ${table}: 0 rows`); continue; }
  const cols = Object.keys(rows[0]);
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  await batchChunks(rows.map((r) => [sql, ...cols.map((c) => (r[c] instanceof Uint8Array ? Buffer.from(r[c]) : r[c]))]), 300);
  const remote = (await db.get(`SELECT COUNT(*) AS n FROM ${table}`)).n;
  console.log(`- ${table}: ${rows.length} copied (destination now has ${remote})`);
}
console.log('\nDone. Remember: SECRET_KEY_HEX must be set to the value in data/secret.key on Vercel and in GitHub Actions secrets.');
process.exit(0);
