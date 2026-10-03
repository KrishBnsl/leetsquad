import { db, batchChunks } from './db.js';
import { decrypt } from './crypto.js';
import * as lc from './leetcode.js';
import { saveLink, syncCodeforces, syncGithub } from './platforms.js';
import { dispatchWorker } from './dispatch.js';

// Sync state lives in the database (sync_state) so any process — the web server, a serverless function,
// or the scheduled GitHub Actions worker — can request a sync and see its progress.
const SYNC_EVERY_S = (Number(process.env.SYNC_EVERY_MIN) || 10) * 60; // sweep re-syncs data older than this
const GITHUB_EVERY_S = (process.env.GITHUB_TOKEN ? 14 : 55) * 60;       // unauthenticated GitHub allows only 60 API calls/h
const STALE_SYNCING_S = 15 * 60;                                       // a "syncing" row this old means the worker died
const nowS = () => Math.floor(Date.now() / 1000);

// Runs the worker inside this process (local server). On Vercel the Actions worker does it instead.
export const RUN_WORKER = process.env.RUN_WORKER ? process.env.RUN_WORKER === '1' : !process.env.VERCEL;

const view = (r) => {
  if (!r) return { state: 'idle', message: '' };
  if (r.state === 'syncing' && nowS() - (r.updated_at || 0) > STALE_SYNCING_S) return { state: 'idle', message: '' };
  return { state: r.state, message: r.message || '' };
};
export async function getSyncStatus(username) {
  return view(await db.get('SELECT * FROM sync_state WHERE username = ?', username));
}
export async function getSyncStatuses() {
  const map = new Map();
  for (const r of await db.all('SELECT * FROM sync_state')) map.set(r.username.toLowerCase(), view(r));
  return map;
}
const setStatus = (username, state, message = '') => db.run(
  `INSERT INTO sync_state (username, state, message, updated_at) VALUES (?,?,?,?)
   ON CONFLICT(username) DO UPDATE SET state=excluded.state, message=excluded.message, updated_at=excluded.updated_at`,
  username, state, message, nowS());

// Ask for a sync. Cheap and safe to call from a request handler.
export async function queueSync(username, force = false) {
  const t = nowS();
  await db.run(
    `INSERT INTO sync_state (username, state, message, forced, requested_at, updated_at) VALUES (?, 'queued', 'Waiting in line…', ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       state = CASE WHEN state = 'syncing' AND updated_at > ? THEN state ELSE 'queued' END,
       message = CASE WHEN state = 'syncing' AND updated_at > ? THEN message ELSE 'Waiting in line…' END,
       forced = CASE WHEN excluded.forced = 1 THEN 1 ELSE forced END,
       requested_at = excluded.requested_at`,
    username, force ? 1 : 0, t, t, t - STALE_SYNCING_S, t - STALE_SYNCING_S);
  if (RUN_WORKER) kick();
  else await dispatchWorker();
}

/* ---------- worker ---------- */
let running = false;
function kick() {
  setImmediate(() => runSyncPass().catch((e) => console.error('[sync pass]', e)));
}

// One pass over everyone who is due: explicitly queued users first, then (when `sweep`) anyone with stale data.
export async function runSyncPass({ sweep = false } = {}) {
  if (running) return 0;
  running = true;
  let done = 0;
  try {
    const t = nowS();
    const rows = await db.all(`SELECT u.username, u.last_synced, s.state, s.forced, s.updated_at
      FROM users u LEFT JOIN sync_state s ON s.username = u.username`);
    const due = rows.filter((r) => {
      if (r.state === 'syncing' && t - (r.updated_at || 0) < STALE_SYNCING_S) return false; // someone is on it
      return r.state === 'queued' || (sweep && t - (r.last_synced || 0) >= SYNC_EVERY_S * 0.8);
    }).sort((a, b) => (b.state === 'queued') - (a.state === 'queued'));
    for (const r of due) {
      await syncUser(r.username, !!r.forced).catch((e) => console.error(`[sync] ${r.username}:`, e));
      done++;
    }
  } finally { running = false; }
  return done;
}

export function startScheduler() {
  if (!RUN_WORKER) return;
  const sweep = () => runSyncPass({ sweep: true }).catch((e) => console.error('[sync pass]', e));
  setTimeout(sweep, 2000);
  setInterval(sweep, SYNC_EVERY_S * 1000).unref();
}

async function syncUser(name, force = false) {
  const user = await db.get('SELECT * FROM users WHERE username = ?', name);
  if (!user) return;
  const username = user.username;

  // Claim: flip to "syncing" only if nobody else is mid-sync on this user.
  const t = nowS();
  await db.run("INSERT OR IGNORE INTO sync_state (username, state, updated_at) VALUES (?, 'idle', ?)", username, t);
  const claimed = await db.run(
    "UPDATE sync_state SET state='syncing', message='Fetching profile…', forced=0, updated_at=? WHERE username=? AND (state != 'syncing' OR updated_at < ?)",
    t, username, t - STALE_SYNCING_S);
  if (!claimed.changes) return;

  // Progress messages are written in order, fire-and-forget; awaited before the final status below.
  let chain = Promise.resolve();
  const report = (msg) => { chain = chain.then(() => setStatus(username, 'syncing', msg)).catch(() => {}); };
  let lcError = null;

  // LeetCode
  try {
    const prof = await lc.getProfile(username);
    await db.run('UPDATE users SET real_name=?, avatar=?, ranking=?, totals_json=? WHERE username=?',
      prof.realName, prof.avatar, prof.ranking, JSON.stringify(prof.totals), username);

    let usedSession = false;
    if (user.session_enc && user.session_ok) {
      try {
        await syncViaSession(user, report);
        usedSession = true;
      } catch (e) {
        if (e.code !== 'AUTH') throw e;
        await db.run('UPDATE users SET session_ok=0 WHERE username=?', username);
      }
    }
    if (!usedSession) {
      report('Session expired — using public data only…');
      await syncViaPublic(username);
    }
    await fillQuestions(username, report);
    let contest = null;
    try { contest = await lc.getContestInfo(username); } catch { /* contests are optional */ }
    await saveLink(username, 'leetcode', username, { contest, about: prof.about || '' });
  } catch (e) {
    lcError = String(e.message).slice(0, 300);
  }
  await db.run('UPDATE users SET last_synced=?, sync_error=? WHERE username=?',
    lcError ? user.last_synced : nowS(), lcError, username);

  // Linked platforms — independent, so one failing never blocks the rest.
  const links = await db.all("SELECT * FROM user_links WHERE username = ? AND platform IN ('codeforces','github')", username);
  for (const link of links) {
    if (link.platform === 'github' && !force && link.last_synced && nowS() - link.last_synced < GITHUB_EVERY_S) continue;
    try {
      await (link.platform === 'codeforces' ? syncCodeforces : syncGithub)(username, link, report);
    } catch (e) {
      await db.run('UPDATE user_links SET sync_error=? WHERE username=? AND platform=?', String(e.message).slice(0, 300), username, link.platform);
    }
  }
  await chain;
  await setStatus(username, lcError ? 'error' : 'idle', lcError || '');
}

const insertSql = 'INSERT OR IGNORE INTO submissions (id, username, slug, title, status, lang, ts) VALUES (?,?,?,?,?,?,?)';

async function syncViaSession(user, report) {
  const auth = { session: decrypt(user.session_enc), csrf: decrypt(user.csrf_enc) };
  let offset = 0, lastKey = null, fetched = 0, finished = false;

  for (let page = 0; page < 2000; page++) {
    const r = await lc.getSubmissionPage(auth, offset, lastKey);
    const subs = r.submissions || [];
    const ids = subs.map((s) => Number(s.id));
    const hitKnown = ids.length
      ? (await db.get(`SELECT COUNT(*) AS n FROM submissions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)).n > 0
      : false;
    await db.batch(subs.map((s) => [insertSql, Number(s.id), user.username, s.titleSlug, s.title, s.statusDisplay, s.lang, Number(s.timestamp)]));
    fetched += subs.length;
    report(`Pulled ${fetched} submissions…`);
    if (!r.hasNext || !subs.length) { finished = true; break; }
    if (hitKnown && user.full_synced) { finished = true; break; }
    offset += subs.length;
    lastKey = r.lastKey;
    await lc.sleep(250);
  }
  if (finished) await db.run('UPDATE users SET full_synced=1 WHERE username=?', user.username);
}

async function syncViaPublic(username) {
  const recent = await lc.getRecentAccepted(username);
  await db.batch(recent.map((s) => [insertSql, Number(s.id), username, s.titleSlug, s.title, 'Accepted', null, Number(s.timestamp)]));
}

async function fillQuestions(username, report) {
  const missing = await db.all(`
    SELECT DISTINCT s.slug, s.title FROM submissions s
    LEFT JOIN questions q ON q.slug = s.slug
    WHERE s.username = ? AND s.platform = 'leetcode' AND s.status = 'Accepted' AND q.slug IS NULL`, username);
  let n = 0;
  for (const m of missing) {
    n++;
    report(`Classifying problems (${n}/${missing.length})…`);
    let q = null;
    try { q = await lc.getQuestion(m.slug); } catch { /* retried next sync */ continue; }
    await db.run('INSERT OR REPLACE INTO questions (slug, frontend_id, title, difficulty, topics) VALUES (?,?,?,?,?)',
      m.slug, q?.questionFrontendId ?? null, q?.title || m.title, q?.difficulty || 'Unknown',
      JSON.stringify((q?.topicTags || []).map((t) => t.name)));
    await lc.sleep(120);
  }
}
