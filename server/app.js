// The HTTP API, shared by the local server (server/index.js) and the Vercel function (api/[...path].js).
import crypto from 'node:crypto';
import { db } from './db.js';
import { encrypt } from './crypto.js';
import * as lc from './leetcode.js';
import { queueSync, getSyncStatuses, RUN_WORKER } from './sync.js';
import { dispatchWorker } from './dispatch.js';
import { allUsers, leaderboardEntry, profile, feed, avatarFor, linksOf, linkSummary, TZ } from './stats.js';
import * as plat from './platforms.js';
import { HttpError } from './http-error.js';
import * as sq from './squads.js';
import * as act from './activities.js';
import * as forum from './forum.js';

const REFRESH_COOLDOWN_S = 120;
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'content-security-policy':
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
};
export { SECURITY_HEADERS };

class Raw { constructor(buf, type, headers = {}) { this.buf = buf; this.type = type; this.headers = headers; } }

const send = (res, status, body, headers = {}) => {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': isJson ? 'application/json; charset=utf-8' : 'text/plain',
    ...(isJson ? { 'cache-control': 'no-store' } : {}),
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
};

async function readJson(req, limit = 10_000) {
  if (process.env.VERCEL) { // Vercel's runtime parses the body for us
    const b = req.body;
    if (b === undefined || b === null || b === '') return {};
    const obj = typeof b === 'string' ? (() => { try { return JSON.parse(b); } catch { throw new HttpError(400, 'Invalid JSON'); } })() : b;
    if (JSON.stringify(obj).length > limit) throw new HttpError(413, 'Request too large');
    return obj;
  }
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'Request too large');
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw new HttpError(400, 'Invalid JSON'); }
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
// Behind a tunnel or Vercel every connection arrives from a proxy, so use the forwarded client address
// (trusted when the connection is local, on Vercel, or TRUST_PROXY is set).
function clientIp(req) {
  const fwd = req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'];
  const remote = req.socket?.remoteAddress || '?';
  return fwd && (LOOPBACK.has(remote) || process.env.TRUST_PROXY || process.env.VERCEL) ? String(fwd) : remote;
}
// Per-visitor limiter for endpoints that call LeetCode with user-provided credentials.
// Stored in the database so it holds across serverless instances.
const rateLimit = (req, max = 12, windowS = 3600) => rateLimitKey(clientIp(req), max, windowS);
async function rateLimitKey(key, max, windowS = 3600) {
  const t = Math.floor(Date.now() / 1000);
  const { n } = await db.get('SELECT COUNT(*) AS n FROM rate_hits WHERE key = ? AND ts > ?', key, t - windowS);
  if (n >= max) throw new HttpError(429, 'You’re doing that a lot — try again a bit later');
  await db.run('INSERT INTO rate_hits (key, ts) VALUES (?,?)', key, t);
  if (Math.random() < 0.03) db.run('DELETE FROM rate_hits WHERE ts < ?', t - 7200).catch(() => {});
}

// Identify an image by its magic bytes (never trust the declared type).
function sniffImage(b) {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

const USERNAME_RE = /^[A-Za-z0-9_-]{1,40}$/;
const SESSION_RE = /^[A-Za-z0-9._\-%+/=]{20,4096}$/;
const CSRF_RE = /^[A-Za-z0-9]{16,128}$/;

function parseCreds(body) {
  const username = String(body.username || '').trim();
  const session = String(body.session || '').trim().replace(/^LEETCODE_SESSION=/, '').replace(/;$/, '');
  let csrf = String(body.csrf || '').trim().replace(/^csrftoken=/, '').replace(/;$/, '');
  if (!USERNAME_RE.test(username)) throw new HttpError(400, 'That doesn’t look like a LeetCode username');
  if (!SESSION_RE.test(session)) throw new HttpError(400, 'That LEETCODE_SESSION value looks malformed — copy the whole thing');
  if (!csrf) csrf = crypto.randomBytes(32).toString('hex').slice(0, 64);
  else if (!CSRF_RE.test(csrf)) throw new HttpError(400, 'That csrftoken value looks malformed');
  return { username, session, csrf };
}

// Proves the caller owns the LeetCode account (so nobody can add/remove someone else).
async function verifyOwnership({ username, session, csrf }) {
  let actual;
  try { actual = await lc.whoAmI({ session, csrf }); } catch (e) {
    if (e.code === 'AUTH') throw new HttpError(401, 'LeetCode rejected that session. It may be expired, or the csrftoken is missing — grab both fresh from your browser.');
    throw new HttpError(502, e.message);
  }
  if (actual.toLowerCase() !== username.toLowerCase())
    throw new HttpError(403, `That session belongs to "${actual}", not "${username}".`);
  return actual;
}

function bearer(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  return m ? m[1] : null;
}
// Signed-in username, or null (never throws) — for endpoints anyone can read.
async function optionalAuth(req) {
  const token = bearer(req);
  return (token && await sq.userFromToken(token)) || null;
}
async function requireAuth(req) {
  const token = bearer(req);
  const username = token && await sq.userFromToken(token);
  if (!username) throw new HttpError(401, 'Please sign in first');
  return username;
}

const IDLE = { state: 'idle', message: '' };

// Hosted mode only: if someone is looking at data that has gone stale (or a sign-up is waiting in the queue),
// wake the sync worker now instead of waiting for GitHub's unreliable schedule. No-op without GH_DISPATCH_TOKEN.
const STALE_AFTER_S = 15 * 60;
async function wakeWorkerIfNeeded(entries) {
  if (RUN_WORKER) return;
  const now = Math.floor(Date.now() / 1000);
  const queued = entries.some((e) => e.sync.state === 'queued');
  const stale = entries.some((e) => e.sync.state === 'idle' && now - (e.lastSynced || 0) > STALE_AFTER_S);
  if (queued || stale) await dispatchWorker({ minGap: queued ? 45 : 300 }).catch(() => {});
}
const withSync = (entry, statuses) => ({ ...entry, sync: statuses.get(entry.username.toLowerCase()) || IDLE });

const routes = [
  ['GET', /^\/api\/healthz$/, async () => ({ ok: true, users: (await db.get('SELECT COUNT(*) AS n FROM users')).n })],

  ['GET', /^\/api\/leaderboard$/, async () => {
    const [users, statuses, recent] = await Promise.all([allUsers(), getSyncStatuses(), feed()]);
    const entries = await Promise.all(users.map((u) => leaderboardEntry(u)));
    const withStatus = entries.map((e) => withSync(e, statuses));
    await wakeWorkerIfNeeded(withStatus);
    return { tz: TZ, generatedAt: Math.floor(Date.now() / 1000), users: withStatus, feed: recent };
  }],

  ['GET', /^\/api\/users\/([^/]+)$/, async (req, m) => {
    const p = await profile(decodeURIComponent(m[1]));
    if (!p) throw new HttpError(404, 'No such user on the squad');
    const [statuses, log] = await Promise.all([getSyncStatuses(), act.logSummary(p.username, p.today)]);
    const entry = withSync(p, statuses);
    await wakeWorkerIfNeeded([entry]);
    return { ...entry, log, categories: act.CATEGORIES };
  }],

  ['POST', /^\/api\/users$/, async (req) => {
    await rateLimit(req);
    const creds = parseCreds(await readJson(req));
    const username = await verifyOwnership(creds);
    const exists = await db.get('SELECT 1 AS x FROM users WHERE username = ?', username);
    await db.run(`INSERT INTO users (username, session_enc, csrf_enc, session_ok, added_at)
      VALUES (?,?,?,1,?) ON CONFLICT(username) DO UPDATE SET session_enc=excluded.session_enc,
      csrf_enc=excluded.csrf_enc, session_ok=1`,
    username, encrypt(creds.session), encrypt(creds.csrf), Math.floor(Date.now() / 1000));
    await queueSync(username);
    return { username, updated: !!exists, token: await sq.createSession(username) };
  }],

  ['DELETE', /^\/api\/users\/([^/]+)$/, async (req, m) => {
    await rateLimit(req);
    const creds = parseCreds({ ...(await readJson(req)), username: decodeURIComponent(m[1]) });
    const username = await verifyOwnership(creds);
    await sq.releaseOwnership(username);
    // Explicit deletes (no reliance on ON DELETE CASCADE), all in one atomic batch.
    await db.batch([
      ...forum.purgeUserStatements(username),
      ...['sessions', 'squad_members', 'user_links', 'gh_days', 'activities', 'avatars', 'submissions', 'sync_state']
        .map((t) => [`DELETE FROM ${t} WHERE username = ?`, username]),
      ['DELETE FROM users WHERE username = ?', username],
    ]);
    return { removed: username };
  }],

  ['POST', /^\/api\/users\/([^/]+)\/refresh$/, async (req, m) => {
    const u = await db.get('SELECT * FROM users WHERE username = ?', decodeURIComponent(m[1]));
    if (!u) throw new HttpError(404, 'No such user');
    const wait = (u.last_synced || 0) + REFRESH_COOLDOWN_S - Math.floor(Date.now() / 1000);
    if (wait > 0) throw new HttpError(429, `Fresh enough! Try again in ${wait}s`);
    await queueSync(u.username, true);
    return { queued: true };
  }],

  /* ----- auth ----- */
  ['GET', /^\/api\/me$/, async (req) => {
    const u = await db.get('SELECT * FROM users WHERE username = ?', await requireAuth(req));
    const [av, links] = await Promise.all([avatarFor(u), linksOf(u.username)]);
    return { username: u.username, name: u.real_name || '', ...av, links: linkSummary(links) };
  }],

  /* ----- linked accounts (Codeforces / GitHub) ----- */
  ['PUT', /^\/api\/me\/links$/, async (req) => {
    const me = await requireAuth(req);
    await rateLimit(req, 30);
    const body = await readJson(req);
    const plan = {}; // platform -> canonical handle | null (unlink); resolved up front so nothing is half-applied

    if ('codeforces' in body) {
      const h = String(body.codeforces || '').trim();
      if (!h) plan.codeforces = null;
      else {
        if (!plat.CF_RE.test(h)) throw new HttpError(400, 'That doesn’t look like a Codeforces handle');
        try { plan.codeforces = (await plat.cfInfo(h)).handle; }
        catch (e) { throw new HttpError(400, /not found/i.test(e.message) ? `Codeforces user “${h}” not found` : e.message); }
      }
    }
    if ('github' in body) {
      const h = String(body.github || '').trim().replace(/^@/, '');
      if (!h) plan.github = null;
      else {
        if (!plat.GH_RE.test(h)) throw new HttpError(400, 'That doesn’t look like a GitHub username');
        try { plan.github = (await plat.ghProfile(h)).login; }
        catch (e) { throw new HttpError(400, /not found/i.test(e.message) ? `GitHub user “${h}” not found` : e.message); }
      }
    }
    for (const [platform, handle] of Object.entries(plan)) {
      if (handle) await plat.addLink(me, platform, handle); else await plat.unlink(me, platform);
    }
    await queueSync(me, true);
    return { links: linkSummary(await linksOf(me)) };
  }],

  /* ----- profile picture ----- */
  ['PUT', /^\/api\/me\/avatar$/, async (req) => {
    const username = await requireAuth(req);
    const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String((await readJson(req, 160_000)).image || ''));
    if (!m) throw new HttpError(400, 'Please upload a JPEG, PNG or WebP image');
    const data = Buffer.from(m[1], 'base64');
    const mime = sniffImage(data);
    if (!mime) throw new HttpError(400, 'That doesn’t look like a valid image');
    if (data.length > 120_000) throw new HttpError(413, 'Image is too large');
    await db.run(`INSERT INTO avatars (username, mime, data, updated_at) VALUES (?,?,?,?)
      ON CONFLICT(username) DO UPDATE SET mime=excluded.mime, data=excluded.data, updated_at=excluded.updated_at`,
    username, mime, data, Math.floor(Date.now() / 1000));
    return { ok: true };
  }],
  ['DELETE', /^\/api\/me\/avatar$/, async (req) => {
    await db.run('DELETE FROM avatars WHERE username = ?', await requireAuth(req));
    return { ok: true };
  }],
  ['GET', /^\/api\/avatar\/([^/]+)$/, async (req, m) => {
    const a = await db.get('SELECT mime, data FROM avatars WHERE username = ?', decodeURIComponent(m[1]));
    if (!a) throw new HttpError(404, 'No custom avatar');
    return new Raw(Buffer.from(a.data), a.mime, { 'cache-control': 'public, max-age=86400, s-maxage=86400', 'content-security-policy': "default-src 'none'" });
  }],
  ['POST', /^\/api\/logout$/, async (req) => { const t = bearer(req); if (t) await sq.destroySession(t); return { ok: true }; }],

  /* ----- groups ----- */
  ['GET', /^\/api\/groups$/, async (req) => ({ groups: await sq.listSquads(await requireAuth(req)) })],

  ['POST', /^\/api\/groups$/, async (req) => {
    const me = await requireAuth(req);
    return { group: await sq.createSquad((await readJson(req)).name, me) };
  }],

  ['GET', /^\/api\/groups\/preview\/([^/]+)$/, async (req, m) => {
    await rateLimit(req, 60);
    return sq.previewByCode(decodeURIComponent(m[1]));
  }],

  ['POST', /^\/api\/groups\/join$/, async (req) => {
    const me = await requireAuth(req);
    await rateLimit(req, 60);
    return { group: await sq.joinByCode((await readJson(req)).code, me) };
  }],

  ['GET', /^\/api\/groups\/(\d+)$/, async (req, m) => {
    const me = await requireAuth(req);
    const squad = await sq.requireSquad(m[1], me);
    const board = await sq.squadBoard(squad);
    const [statuses, recent, challenges] = await Promise.all([
      getSyncStatuses(), feed(25, board.members.map((u) => u.username)), sq.challengeSummaries(squad, board, me),
    ]);
    return {
      group: { id: squad.id, name: squad.name, code: squad.code, owner: squad.owner, isOwner: squad.owner.toLowerCase() === me.toLowerCase() },
      me, tz: TZ, users: board.users.map((e) => withSync(e, statuses)), feed: recent, challenges,
    };
  }],

  ['DELETE', /^\/api\/groups\/(\d+)$/, async (req, m) => {
    const me = await requireAuth(req);
    await sq.deleteSquad(await sq.requireSquad(m[1], me), me);
    return { deleted: true };
  }],

  ['POST', /^\/api\/groups\/(\d+)\/leave$/, async (req, m) => {
    const me = await requireAuth(req);
    await sq.leaveSquad(await sq.requireSquad(m[1], me), me);
    return { left: true };
  }],

  ['POST', /^\/api\/groups\/(\d+)\/code$/, async (req, m) => {
    const me = await requireAuth(req);
    return { code: await sq.regenerateCode(await sq.requireSquad(m[1], me), me) };
  }],

  ['DELETE', /^\/api\/groups\/(\d+)\/members\/([^/]+)$/, async (req, m) => {
    const me = await requireAuth(req);
    await sq.removeMember(await sq.requireSquad(m[1], me), me, decodeURIComponent(m[2]));
    return { removed: true };
  }],

  /* ----- challenges ----- */
  ['POST', /^\/api\/groups\/(\d+)\/challenges$/, async (req, m) => {
    const me = await requireAuth(req);
    return sq.createChallenge(await sq.requireSquad(m[1], me), me, await readJson(req));
  }],

  ['GET', /^\/api\/groups\/(\d+)\/challenges\/(\d+)$/, async (req, m) => {
    const me = await requireAuth(req);
    const squad = await sq.requireSquad(m[1], me);
    const result = await sq.standings(await sq.requireChallenge(squad, m[2]), await sq.squadBoard(squad));
    return { ...result, me, group: { id: squad.id, name: squad.name }, canDelete:
      [result.creator, squad.owner].some((n) => n.toLowerCase() === me.toLowerCase()) };
  }],

  ['DELETE', /^\/api\/groups\/(\d+)\/challenges\/(\d+)$/, async (req, m) => {
    const me = await requireAuth(req);
    const squad = await sq.requireSquad(m[1], me);
    await sq.deleteChallenge(squad, await sq.requireChallenge(squad, m[2]), me);
    return { deleted: true };
  }],

  /* ----- activity log ----- */
  ['POST', /^\/api\/activities$/, async (req) => ({ entry: await act.create(await requireAuth(req), await readJson(req)) })],
  ['PUT', /^\/api\/activities\/(\d+)$/, async (req, m) => ({ entry: await act.update(await requireAuth(req), m[1], await readJson(req)) })],
  ['DELETE', /^\/api\/activities\/(\d+)$/, async (req, m) => { await act.remove(await requireAuth(req), m[1]); return { deleted: true }; }],

  /* ----- forum ----- */
  ['GET', /^\/api\/forum\/posts$/, async (req) => {
    const q = new URL(req.url, 'http://x').searchParams;
    return forum.listPosts({ category: q.get('category'), sort: q.get('sort'), q: q.get('q'), page: q.get('page') }, await optionalAuth(req));
  }],
  ['POST', /^\/api\/forum\/posts$/, async (req) => {
    const me = await requireAuth(req);
    await rateLimitKey(`post:${me}`, 10);
    return forum.createPost(me, await readJson(req, 20_000));
  }],
  ['GET', /^\/api\/forum\/posts\/(\d+)$/, async (req, m) => {
    const viewer = await optionalAuth(req);
    return { ...(await forum.getPost(m[1], viewer)), viewer: viewer ? { username: viewer, isAdmin: forum.isAdmin(viewer) } : null };
  }],
  ['PUT', /^\/api\/forum\/posts\/(\d+)$/, async (req, m) => {
    await forum.updatePost(await requireAuth(req), m[1], await readJson(req, 20_000));
    return { ok: true };
  }],
  ['DELETE', /^\/api\/forum\/posts\/(\d+)$/, async (req, m) => { await forum.deletePost(await requireAuth(req), m[1]); return { deleted: true }; }],
  ['POST', /^\/api\/forum\/posts\/(\d+)\/replies$/, async (req, m) => {
    const me = await requireAuth(req);
    await rateLimitKey(`reply:${me}`, 40);
    return forum.addReply(me, m[1], await readJson(req, 12_000));
  }],
  ['POST', /^\/api\/forum\/posts\/(\d+)\/accept$/, async (req, m) => {
    await forum.acceptReply(await requireAuth(req), m[1], (await readJson(req)).replyId ?? null);
    return { ok: true };
  }],
  ['PUT', /^\/api\/forum\/replies\/(\d+)$/, async (req, m) => {
    await forum.updateReply(await requireAuth(req), m[1], await readJson(req, 12_000));
    return { ok: true };
  }],
  ['DELETE', /^\/api\/forum\/replies\/(\d+)$/, async (req, m) => { await forum.deleteReply(await requireAuth(req), m[1]); return { deleted: true }; }],
  ['POST', /^\/api\/forum\/like$/, async (req) => {
    const me = await requireAuth(req);
    await rateLimitKey(`like:${me}`, 150);
    const b = await readJson(req);
    return forum.toggleLike(me, b.target, b.id);
  }],
];

// Handles /api/* (and /healthz). Returns false for anything else so the caller can serve static files.
export async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  const isHealth = pathname === '/healthz';
  if (!pathname.startsWith('/api/') && !isHealth) return false;
  if (req.method !== 'GET') res.on?.('finish', () => console.log(`[api] ${req.method} ${pathname} -> ${res.statusCode}`));
  try {
    const target = isHealth ? '/api/healthz' : pathname;
    for (const [method, re, handler] of routes) {
      const m = re.exec(target);
      if (!m || req.method !== method) continue;
      const out = await handler(req, m);
      send(res, 200, ...(out instanceof Raw ? [out.buf, { 'content-type': out.type, ...out.headers }] : [out]));
      return true;
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Something went wrong' });
  }
  return true;
}
