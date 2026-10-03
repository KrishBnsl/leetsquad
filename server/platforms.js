// Codeforces + GitHub integrations. Both use public endpoints — no credentials needed.
import { db, batchChunks } from './db.js';
import { sleep } from './leetcode.js';

const UA = 'Mozilla/5.0 (compatible; LeetSquad/1.0)';
const now = () => Math.floor(Date.now() / 1000);

export const CF_RE = /^[A-Za-z0-9_.-]{3,24}$/;
export const GH_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/* ---------- link storage ---------- */
export async function saveLink(username, platform, handle, data, { fullSynced } = {}) {
  await db.run(`INSERT INTO user_links (username, platform, handle, data_json, last_synced, sync_error, linked_at)
    VALUES (?,?,?,?,?,NULL,?) ON CONFLICT(username, platform) DO UPDATE SET handle=excluded.handle,
    data_json=excluded.data_json, last_synced=excluded.last_synced, sync_error=NULL`,
  username, platform, handle, JSON.stringify(data), now(), now());
  if (fullSynced) await db.run('UPDATE user_links SET full_synced=1 WHERE username=? AND platform=?', username, platform);
}

export async function addLink(username, platform, handle) {
  const prev = await db.get('SELECT handle FROM user_links WHERE username=? AND platform=?', username, platform);
  if (prev && prev.handle.toLowerCase() !== handle.toLowerCase()) await unlink(username, platform); // different account: start clean
  await db.run(`INSERT INTO user_links (username, platform, handle, linked_at) VALUES (?,?,?,?)
    ON CONFLICT(username, platform) DO UPDATE SET handle=excluded.handle`, username, platform, handle, now());
}

export async function unlink(username, platform) {
  const stmts = [['DELETE FROM user_links WHERE username=? AND platform=?', username, platform]];
  if (platform === 'codeforces') stmts.push(["DELETE FROM submissions WHERE username=? AND platform='codeforces'", username]);
  if (platform === 'github') stmts.push(['DELETE FROM gh_days WHERE username=?', username]);
  await db.batch(stmts);
}

/* ---------- Codeforces ---------- */
export const CF_ID_OFFSET = 1e12; // keeps CF submission ids clear of LeetCode's in the shared table
// Map CF's problem rating onto the same Easy/Medium/Hard buckets used for scoring everywhere else.
export const cfDifficulty = (r) => (r == null ? 'Unknown' : r <= 1300 ? 'Easy' : r <= 1900 ? 'Medium' : 'Hard');

const CF_TAGS = {
  dp: 'Dynamic Programming', graphs: 'Graph', trees: 'Tree', strings: 'String', math: 'Math', greedy: 'Greedy', sortings: 'Sorting',
  'binary search': 'Binary Search', 'two pointers': 'Two Pointers', 'dfs and similar': 'Depth-First Search', bitmasks: 'Bit Manipulation',
  dsu: 'Union Find', hashing: 'Hash Table', 'data structures': 'Data Structures', implementation: 'Implementation',
  'brute force': 'Brute Force', 'constructive algorithms': 'Constructive', 'number theory': 'Number Theory', combinatorics: 'Combinatorics',
  geometry: 'Geometry', 'shortest paths': 'Shortest Path', 'divide and conquer': 'Divide and Conquer', games: 'Game Theory',
  probabilities: 'Probability', matrices: 'Matrix', 'graph matchings': 'Graph Matching', flows: 'Flows', fft: 'FFT', '2-sat': '2-SAT',
  'string suffix structures': 'Suffix Structures', 'expression parsing': 'Parsing', 'meet-in-the-middle': 'Meet in the Middle',
  schedules: 'Scheduling', 'ternary search': 'Ternary Search', 'chinese remainder theorem': 'Chinese Remainder Theorem',
};
const mapTag = (t) => CF_TAGS[t] || t.replace(/\b\w/g, (c) => c.toUpperCase());

let lastCf = 0;
async function cf(method, params, attempt = 0) {
  const wait = lastCf + 2100 - Date.now(); // CF allows ~1 request / 2s
  if (wait > 0) await sleep(wait);
  lastCf = Date.now();
  let json;
  try {
    const res = await fetch(`https://codeforces.com/api/${method}?${new URLSearchParams(params)}`,
      { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45000) });
    json = await res.json();
  } catch (e) {
    if (attempt < 3) { await sleep(3000 * (attempt + 1)); return cf(method, params, attempt + 1); }
    throw new Error(`Could not reach Codeforces (${e.message})`);
  }
  if (json.status !== 'OK') {
    if (/limit exceeded/i.test(json.comment || '') && attempt < 4) { await sleep(3000); return cf(method, params, attempt + 1); }
    throw new Error(json.comment || 'Codeforces returned an error');
  }
  return json.result;
}

export async function cfInfo(handle) {
  const [u] = await cf('user.info', { handles: handle });
  return u;
}

export async function syncCodeforces(username, link, report) {
  const handle = link.handle;
  report('Codeforces: profile…');
  const u = await cfInfo(handle);

  let contests = [];
  try {
    contests = (await cf('user.rating', { handle })).map((c) => ({
      id: c.contestId, name: c.contestName, rank: c.rank, oldRating: c.oldRating, newRating: c.newRating, ts: c.ratingUpdateTimeSeconds,
    }));
  } catch { /* never rated */ }

  const PAGE = link.full_synced ? 200 : 2000;
  let offset = 0, fetched = 0, finished = false;

  for (let page = 0; page < 100; page++) {
    const subs = await cf('user.status', { handle, from: 1 + offset, count: PAGE });
    const ids = subs.filter((s) => s.problem).map((s) => CF_ID_OFFSET + s.id);
    let hitKnown = false;
    for (let i = 0; i < ids.length && !hitKnown; i += 400) { // already-stored submissions mean we've caught up
      const chunk = ids.slice(i, i + 400);
      hitKnown = (await db.get(`SELECT COUNT(*) AS n FROM submissions WHERE id IN (${chunk.map(() => '?').join(',')})`, ...chunk)).n > 0;
    }
    const stmts = [];
    for (const s of subs) {
      const p = s.problem;
      if (!p) continue;
      const slug = `cf:${p.contestId ?? p.problemsetName}${p.index}`;
      stmts.push([`INSERT OR IGNORE INTO submissions (id, username, slug, title, status, lang, ts, platform) VALUES (?,?,?,?,?,?,?, 'codeforces')`,
        CF_ID_OFFSET + s.id, username, slug, p.name, s.verdict === 'OK' ? 'Accepted' : (s.verdict || 'Unknown'), s.programmingLanguage || null, s.creationTimeSeconds]);
      if (s.verdict === 'OK') {
        stmts.push(['INSERT OR REPLACE INTO questions (slug, frontend_id, title, difficulty, topics, rating) VALUES (?,?,?,?,?,?)',
          slug, `${p.contestId ?? ''}${p.index}`, p.name, cfDifficulty(p.rating), JSON.stringify((p.tags || []).map(mapTag)), p.rating ?? null]);
      }
    }
    await batchChunks(stmts);
    fetched += subs.length;
    report(`Codeforces: pulled ${fetched} submissions…`);
    if (subs.length < PAGE) { finished = true; break; }
    if (hitKnown && link.full_synced) { finished = true; break; }
    offset += PAGE;
  }

  await saveLink(username, 'codeforces', u.handle, {
    info: {
      handle: u.handle, name: [u.firstName, u.lastName].filter(Boolean).join(' '), city: u.city || null, rating: u.rating ?? null, maxRating: u.maxRating ?? null, rank: u.rank || null, maxRank: u.maxRank || null,
      // the API's userpic.codeforces.org host 503s for newer accounts; the CDN host serves every picture
      titlePhoto: u.titlePhoto ? u.titlePhoto.replace('userpic.codeforces.org', 'cdn-userpic.codeforces.com') : null, country: u.country || null, organization: u.organization || null,
      friendOfCount: u.friendOfCount ?? 0, registered: u.registrationTimeSeconds || null,
    },
    contests,
  }, { fullSynced: finished });
}

/* ---------- GitHub ---------- */
async function ghApi(path) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': UA };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res;
  try { res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(20000) }); }
  catch (e) { throw new Error(`Could not reach GitHub (${e.message})`); }
  if (res.status === 404) throw new Error('GitHub user not found');
  if (res.status === 403 || res.status === 429) throw new Error('GitHub rate limit reached — try again in a while');
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  return res.json();
}

export async function ghProfile(user) {
  const u = await ghApi(`/users/${encodeURIComponent(user)}`);
  return {
    login: u.login, name: u.name || '', avatar: u.avatar_url, bio: u.bio || '', publicRepos: u.public_repos, followers: u.followers,
    following: u.following, url: u.html_url, createdAt: u.created_at,
  };
}

// The public contribution calendar is only exposed as HTML, so parse the cells + tooltips.
async function ghContributions(user) {
  let html;
  try {
    const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`,
      { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    html = await res.text();
  } catch (e) { throw new Error(`Could not load GitHub contributions (${e.message})`); }

  const tips = new Map();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) tips.set(m[1], m[2].trim());
  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (!date) continue;
    const n = /^(\d[\d,]*)\s+contribution/.exec(tips.get(id) || '');
    days.push([date, n ? parseInt(n[1].replace(/,/g, ''), 10) : 0]);
  }
  if (days.length < 50) throw new Error('Could not read GitHub’s contribution calendar (page format may have changed)');
  return days;
}

const EVENT_LABEL = {
  PushEvent: (p) => `Pushed to ${String(p.ref || '').replace('refs/heads/', '') || 'a branch'}`,
  PullRequestEvent: (p) => `${p.action === 'closed' && p.pull_request?.merged ? 'Merged' : cap(p.action)} PR${p.pull_request?.title ? `: ${p.pull_request.title}` : ''}`,
  PullRequestReviewEvent: () => 'Reviewed a pull request',
  IssuesEvent: (p) => `${cap(p.action)} issue${p.issue?.title ? `: ${p.issue.title}` : ''}`,
  IssueCommentEvent: (p) => `Commented on #${p.issue?.number ?? ''}`,
  CreateEvent: (p) => `Created ${p.ref_type}${p.ref ? ` ${p.ref}` : ''}`,
  ForkEvent: () => 'Forked the repo',
  WatchEvent: () => 'Starred the repo',
  ReleaseEvent: (p) => `Released ${p.release?.tag_name || ''}`,
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export async function syncGithub(username, link, report) {
  report('GitHub: profile…');
  const profile = await ghProfile(link.handle);

  report('GitHub: contributions…');
  const days = await ghContributions(profile.login);
  await db.batch([
    ['DELETE FROM gh_days WHERE username = ?', username],
    ...days.filter(([, n]) => n > 0).map(([d, n]) => ['INSERT INTO gh_days (username, day, count) VALUES (?,?,?)', username, d, n]),
  ]);

  // Recent events (public, last ~90 days). Best effort — rate limits shouldn't wipe the calendar.
  let events = [], repos = [];
  try {
    const raw = [];
    for (let page = 1; page <= 3; page++) {
      const batch = await ghApi(`/users/${encodeURIComponent(profile.login)}/events/public?per_page=100&page=${page}`);
      raw.push(...batch);
      if (batch.length < 100) break;
    }
    const cutoff = now() - 30 * 86400, byRepo = new Map();
    for (const e of raw) {
      const ts = Math.floor(Date.parse(e.created_at) / 1000);
      if (ts >= cutoff) {
        const r = byRepo.get(e.repo.name) || { name: e.repo.name, events: 0, lastTs: 0 };
        r.events++; r.lastTs = Math.max(r.lastTs, ts); byRepo.set(e.repo.name, r);
      }
    }
    repos = [...byRepo.values()].sort((a, b) => b.events - a.events || b.lastTs - a.lastTs).slice(0, 6);
    events = raw.filter((e) => EVENT_LABEL[e.type]).slice(0, 25).map((e) => ({
      type: e.type, repo: e.repo.name, ts: Math.floor(Date.parse(e.created_at) / 1000), label: EVENT_LABEL[e.type](e.payload || {}).slice(0, 140),
    }));
  } catch (e) {
    const prev = await db.get("SELECT data_json FROM user_links WHERE username=? AND platform='github'", username);
    const old = prev?.data_json ? JSON.parse(prev.data_json) : {};
    events = old.events || []; repos = old.repos || [];
  }
  await saveLink(username, 'github', profile.login, { profile, events, repos, total: days.reduce((s, [, n]) => s + n, 0) });
}
