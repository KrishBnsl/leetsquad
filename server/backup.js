// Daily consistent snapshots of the SQLite database (safe while the server is running), kept for 14 days.
// The encryption key is copied alongside: without it the stored LeetCode cookies in a backup can't be read.
import fs from 'node:fs';
import path from 'node:path';
import { localDb, DATA_DIR } from './db.js';

export const BACKUP_DIR = DATA_DIR ? path.join(DATA_DIR, 'backups') : null;
const KEEP = 14;

export function backupNow() {
  if (!localDb) throw new Error('Backups here only apply to the local database file');
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const file = path.join(BACKUP_DIR, `leaderboard-${new Date().toISOString().slice(0, 10)}.db`);
  if (fs.existsSync(file)) fs.rmSync(file); // refresh today's snapshot
  localDb.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  fs.chmodSync(file, 0o600);

  const key = path.join(DATA_DIR, 'secret.key');
  if (fs.existsSync(key)) fs.copyFileSync(key, path.join(BACKUP_DIR, 'secret.key'));

  const old = fs.readdirSync(BACKUP_DIR).filter((f) => /^leaderboard-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -KEEP);
  for (const f of old) fs.rmSync(path.join(BACKUP_DIR, f));
  return file;
}

export function startBackups() {
  const run = () => { try { console.log(`[backup] wrote ${path.relative(process.cwd(), backupNow())}`); } catch (e) { console.error('[backup] failed:', e.message); } };
  setTimeout(run, 30_000);
  setInterval(run, 6 * 3600_000).unref();
}
