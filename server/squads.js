import crypto from 'node:crypto';
import { db } from './db.js';
import { HttpError } from './http-error.js';
import { dayOf, dayAdd, loadDays, leaderboardEntry, avatarFor } from './stats.js';
import { notify, unreadBySquad } from './notifications.js';

const SESSION_TTL_S = 90 * 86400;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const now = () => Math.floor(Date.now() / 1000);

/* ---------- sign-in sessions ---------- */
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

export async function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.batch([
    ['INSERT INTO sessions (token_hash, username, created_at) VALUES (?,?,?)', hash(token), username, now()],
    ['DELETE FROM sessions WHERE created_at < ?', now() - SESSION_TTL_S],
  ]);
  return token;
}

export async function userFromToken(token) {
  const row = await db.get(`SELECT u.username FROM sessions s JOIN users u ON u.username = s.username
    WHERE s.token_hash = ? AND s.created_at > ?`, hash(token), now() - SESSION_TTL_S);
  return row?.username || null;
}

export const destroySession = (token) => db.run('DELETE FROM sessions WHERE token_hash = ?', hash(token));

/* ---------- squads ---------- */
const newCode = async () => {
  for (;;) {
    const code = Array.from({ length: 8 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
    if (!(await db.get('SELECT 1 AS x FROM squads WHERE code = ?', code))) return code;
  }
};
export const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isMember = async (squadId, username) =>
  !!(await db.get('SELECT 1 AS x FROM squad_members WHERE squad_id = ? AND username = ?', squadId, username));

export async function requireSquad(id, username) {
  const squad = await db.get('SELECT * FROM squads WHERE id = ?', Number(id));
  if (!squad || !(await isMember(squad.id, username))) throw new HttpError(404, 'Squad not found');
  return squad;
}

const squadView = (s, username, extra = {}) => ({
  id: s.id, name: s.name, code: s.code, owner: s.owner, createdAt: s.created_at,
  isOwner: s.owner.toLowerCase() === username.toLowerCase(), ...extra,
});

export async function createSquad(name, owner) {
  name = String(name || '').trim();
  if (!name || name.length > 40) throw new HttpError(400, 'Give your squad a name (max 40 characters)');
  const mine = (await db.get('SELECT COUNT(*) AS n FROM squad_members WHERE username = ?', owner)).n;
  if (mine >= 20) throw new HttpError(400, 'You’re in the maximum number of squads (20)');
  const code = await newCode();
  // One atomic batch: the squad and its first member (the owner).
  await db.batch([
    ['INSERT INTO squads (name, code, owner, created_at) VALUES (?,?,?,?)', name, code, owner, now()],
    ['INSERT INTO squad_members (squad_id, username, joined_at) VALUES (last_insert_rowid(), ?, ?)', owner, now()],
  ]);
  return squadView(await db.get('SELECT * FROM squads WHERE code = ?', code), owner);
}

export async function previewByCode(code) {
  const s = await db.get(`SELECT s.name, s.owner, (SELECT COUNT(*) FROM squad_members m WHERE m.squad_id = s.id) AS members
    FROM squads s WHERE s.code = ?`, normalizeCode(code));
  if (!s) throw new HttpError(404, 'That invite code doesn’t match any squad');
  return { name: s.name, owner: s.owner, members: s.members };
}

export async function joinByCode(code, username) {
  const s = await db.get('SELECT * FROM squads WHERE code = ?', normalizeCode(code));
  if (!s) throw new HttpError(404, 'That invite code doesn’t match any squad');
  if (!(await isMember(s.id, username))) {
    const [count, mine] = await Promise.all([
      db.get('SELECT COUNT(*) AS n FROM squad_members WHERE squad_id = ?', s.id),
      db.get('SELECT COUNT(*) AS n FROM squad_members WHERE username = ?', username),
    ]);
    if (count.n >= 100) throw new HttpError(400, 'This squad is full');
    if (mine.n >= 20) throw new HttpError(400, 'You’re in the maximum number of squads (20)');
    await db.run('INSERT INTO squad_members (squad_id, username, joined_at) VALUES (?,?,?)', s.id, username, now());
  }
  return squadView(s, username);
}

export async function listSquads(username) {
  const today = dayOf(now());
  const rows = await db.all(`SELECT s.*,
      (SELECT COUNT(*) FROM squad_members m WHERE m.squad_id = s.id) AS members,
      (SELECT COUNT(*) FROM challenges c WHERE c.squad_id = s.id AND c.start_day <= ? AND c.end_day >= ?) AS active
    FROM squads s JOIN squad_members me ON me.squad_id = s.id WHERE me.username = ? ORDER BY s.created_at DESC`, today, today, username);
  const unread = await unreadBySquad(username);
  return rows.map((s) => squadView(s, username, { members: s.members, activeChallenges: s.active, unread: unread.get(s.id) || 0 }));
}

export const squadMembers = (squadId) =>
  db.all(`SELECT u.* FROM users u JOIN squad_members m ON m.username = u.username
    WHERE m.squad_id = ? ORDER BY m.joined_at`, squadId);

export function assertOwner(squad, username) {
  if (squad.owner.toLowerCase() !== username.toLowerCase()) throw new HttpError(403, 'Only the squad owner can do that');
}

export async function regenerateCode(squad, username) {
  assertOwner(squad, username);
  const code = await newCode();
  await db.run('UPDATE squads SET code = ? WHERE id = ?', code, squad.id);
  return code;
}

export async function leaveSquad(squad, username) {
  if (squad.owner.toLowerCase() === username.toLowerCase())
    throw new HttpError(400, 'You own this squad — delete it or remove everyone else first');
  await db.batch([
    ['DELETE FROM squad_members WHERE squad_id = ? AND username = ?', squad.id, username],
    ['DELETE FROM notifications WHERE squad_id = ? AND username = ?', squad.id, username],
  ]);
}

export async function removeMember(squad, owner, target) {
  assertOwner(squad, owner);
  if (target.toLowerCase() === owner.toLowerCase()) throw new HttpError(400, 'You can’t remove yourself — delete the squad instead');
  await db.batch([
    ['DELETE FROM squad_members WHERE squad_id = ? AND username = ?', squad.id, target],
    ['DELETE FROM notifications WHERE squad_id = ? AND username = ?', squad.id, target],
  ]);
}

const dropSquadStatements = (id) => [
  ["DELETE FROM forum_likes WHERE target='reply' AND target_id IN (SELECT id FROM forum_replies WHERE post_id IN (SELECT id FROM forum_posts WHERE squad_id = ?))", id],
  ["DELETE FROM forum_likes WHERE target='post' AND target_id IN (SELECT id FROM forum_posts WHERE squad_id = ?)", id],
  ['DELETE FROM forum_replies WHERE post_id IN (SELECT id FROM forum_posts WHERE squad_id = ?)', id],
  ['DELETE FROM forum_posts WHERE squad_id = ?', id],
  ['DELETE FROM notifications WHERE squad_id = ?', id],
  ['DELETE FROM challenges WHERE squad_id = ?', id],
  ['DELETE FROM squad_members WHERE squad_id = ?', id],
  ['DELETE FROM squads WHERE id = ?', id],
];

export async function deleteSquad(squad, username) {
  assertOwner(squad, username);
  await db.batch(dropSquadStatements(squad.id));
}

// Called before a user is deleted: hand their groups to the longest-standing member, or drop empty ones.
export async function releaseOwnership(username) {
  for (const s of await db.all('SELECT * FROM squads WHERE owner = ?', username)) {
    const next = await db.get('SELECT username FROM squad_members WHERE squad_id = ? AND username != ? ORDER BY joined_at LIMIT 1', s.id, username);
    if (next) await db.run('UPDATE squads SET owner = ? WHERE id = ?', next.username, s.id);
    else await db.batch(dropSquadStatements(s.id));
  }
}

export async function squadBoard(squad) {
  const members = await squadMembers(squad.id);
  const memo = new Map(); // load each (member, platforms) once per request
  const daysFor = (username, platforms) => {
    const k = `${username.toLowerCase()}|${platforms.join(',')}`;
    if (!memo.has(k)) memo.set(k, loadDays(username, platforms));
    return memo.get(k);
  };
  const users = await Promise.all(members.map((u) => leaderboardEntry(u, (p) => daysFor(u.username, p))));
  return { members, daysFor, users };
}

/* ---------- challenges ---------- */
export function parseChallenge(b) {
  const bad = (m) => { throw new HttpError(400, m); };
  const today = dayOf(now());
  const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

  const title = String(b.title || '').trim();
  if (!title || title.length > 60) bad('Give the challenge a name (max 60 characters)');
  const description = String(b.description || '').trim().slice(0, 300);

  const startDay = String(b.startDay || today), endDay = String(b.endDay || '');
  if (!isDay(startDay) || !isDay(endDay)) bad('Pick a valid start and end date');
  if (endDay < startDay) bad('The end date must be on or after the start date');
  if ((Date.parse(endDay) - Date.parse(startDay)) / 864e5 + 1 > 366) bad('Challenges can last at most a year');
  if (endDay < today) bad('That challenge would already be over');

  const int = (v, max, label) => {
    const n = Number(v ?? 0);
    if (!Number.isInteger(n) || n < 0 || n > max) bad(`${label} must be a whole number from 0 to ${max}`);
    return n;
  };
  const total = int(b.total, 1000, 'Total problems');
  if (total < 1) bad('Total problems must be at least 1');
  const minEasy = int(b.minEasy, 1000, 'Minimum Easy'), minMedium = int(b.minMedium, 1000, 'Minimum Medium'), minHard = int(b.minHard, 1000, 'Minimum Hard');
  if (minEasy + minMedium + minHard > total) bad('The Easy + Medium + Hard minimums add up to more than the total');

  const topics = [...new Set((Array.isArray(b.topics) ? b.topics : []).map((t) => String(t).trim()).filter(Boolean))];
  if (topics.length > 12 || topics.some((t) => t.length > 40 || !/^[A-Za-z0-9 &'/()-]+$/.test(t))) bad('Invalid topic selection');

  const platforms = [...new Set(Array.isArray(b.platforms) && b.platforms.length ? b.platforms : ['leetcode'])];
  if (platforms.some((p) => !['leetcode', 'codeforces'].includes(p))) bad('Unknown platform');

  return { title, description, startDay, endDay, config: { total, minEasy, minMedium, minHard, topics, platforms } };
}

export async function createChallenge(squad, creator, body) {
  const c = parseChallenge(body);
  const n = (await db.get('SELECT COUNT(*) AS n FROM challenges WHERE squad_id = ?', squad.id)).n;
  if (n >= 100) throw new HttpError(400, 'This squad has too many challenges — delete an old one first');
  const r = await db.run(`INSERT INTO challenges (squad_id, title, description, creator, start_day, end_day, config_json, created_at)
    VALUES (?,?,?,?,?,?,?,?)`, squad.id, c.title, c.description, creator, c.startDay, c.endDay, JSON.stringify(c.config), now());
  const members = await db.all('SELECT username FROM squad_members WHERE squad_id = ?', squad.id);
  await notify(members.map((m) => ({ username: m.username, type: 'challenge_new', actor: creator, squadId: squad.id, challengeId: Number(r.lastInsertRowid), title: c.title })));
  return { id: Number(r.lastInsertRowid) };
}

export async function requireChallenge(squad, id) {
  const ch = await db.get('SELECT * FROM challenges WHERE id = ? AND squad_id = ?', Number(id), squad.id);
  if (!ch) throw new HttpError(404, 'Challenge not found');
  return ch;
}

export async function deleteChallenge(squad, ch, username) {
  if (ch.creator.toLowerCase() !== username.toLowerCase() && squad.owner.toLowerCase() !== username.toLowerCase())
    throw new HttpError(403, 'Only the challenge creator or squad owner can delete it');
  await db.batch([
    ['UPDATE forum_posts SET challenge_id = NULL WHERE challenge_id = ?', ch.id], // threads stay, as plain group posts
    ["DELETE FROM notifications WHERE challenge_id = ? AND type = 'challenge_new'", ch.id],
    ['DELETE FROM challenges WHERE id = ?', ch.id],
  ]);
}

// How close a participant is: mandatory per-difficulty minimums first, then any problems fill the rest of the total.
function effective(c, cfg) {
  const forced = Math.min(c.easy, cfg.minEasy) + Math.min(c.medium, cfg.minMedium) + Math.min(c.hard, cfg.minHard);
  const pool = Math.max(0, c.easy - cfg.minEasy) + Math.max(0, c.medium - cfg.minMedium) + Math.max(0, c.hard - cfg.minHard) + c.other;
  const mins = cfg.minEasy + cfg.minMedium + cfg.minHard;
  return forced + Math.min(pool, Math.max(0, cfg.total - mins));
}

function progressFor(days, ch, cfg) {
  const topicSet = new Set(cfg.topics);
  const seen = new Map();
  for (const [d, probs] of days) {
    if (d < ch.start_day || d > ch.end_day) continue;
    for (const [slug, p] of probs) {
      if (topicSet.size && !p.topics.some((t) => topicSet.has(t))) continue;
      const prev = seen.get(slug);
      if (!prev || p.firstTs < prev.ts) seen.set(slug, { slug, title: p.title, difficulty: p.difficulty, ts: p.firstTs });
    }
  }
  const solved = [...seen.values()].sort((a, b) => a.ts - b.ts);
  const c = { easy: 0, medium: 0, hard: 0, other: 0 };
  let completedAt = null;
  for (const p of solved) {
    c[p.difficulty === 'Easy' ? 'easy' : p.difficulty === 'Medium' ? 'medium' : p.difficulty === 'Hard' ? 'hard' : 'other']++;
    if (completedAt === null && effective(c, cfg) >= cfg.total) completedAt = p.ts;
  }
  const eff = effective(c, cfg);
  return {
    counts: { easy: c.easy, medium: c.medium, hard: c.hard, other: c.other }, counted: solved.length,
    effective: eff, pct: Math.min(1, eff / cfg.total), completed: eff >= cfg.total, completedAt,
    recent: solved.slice(-5).reverse(),
  };
}

export function challengeStatus(ch) {
  const today = dayOf(now());
  const status = today < ch.start_day ? 'upcoming' : today > ch.end_day ? 'ended' : 'active';
  const daysLeft = status === 'ended' ? 0 : (Date.parse(ch.end_day) - Date.parse(today > ch.start_day ? today : ch.start_day)) / 864e5 + 1;
  return { status, daysLeft: status === 'upcoming' ? null : daysLeft, startsInDays: status === 'upcoming' ? (Date.parse(ch.start_day) - Date.parse(today)) / 864e5 : null };
}

export async function standings(ch, board) {
  const cfg = JSON.parse(ch.config_json);
  const rows = await Promise.all(board.members.map(async (u) => ({
    username: u.username, name: u.real_name || '', avatar: (await avatarFor(u)).avatar,
    ...progressFor(await board.daysFor(u.username, cfg.platforms || ['leetcode']), ch, cfg),
  })));
  rows.sort((a, b) =>
    (b.completed - a.completed) || (a.completedAt ?? Infinity) - (b.completedAt ?? Infinity) ||
    b.effective - a.effective || b.counted - a.counted || a.username.localeCompare(b.username));
  return {
    id: ch.id, title: ch.title, description: ch.description, creator: ch.creator,
    startDay: ch.start_day, endDay: ch.end_day, config: cfg, ...challengeStatus(ch), standings: rows,
  };
}

const ORDER = { active: 0, upcoming: 1, ended: 2 };
export async function challengeSummaries(squad, board, viewer) {
  const list = await db.all('SELECT * FROM challenges WHERE squad_id = ? ORDER BY end_day DESC, id DESC', squad.id);
  const out = await Promise.all(list.map(async (ch) => {
    const full = await standings(ch, board);
    const me = full.standings.find((r) => r.username.toLowerCase() === viewer.toLowerCase());
    const { standings: rows, ...rest } = full;
    return {
      ...rest, participants: rows.length, completedCount: rows.filter((r) => r.completed).length,
      leader: rows[0] ? { username: rows[0].username, effective: rows[0].effective, completed: rows[0].completed } : null,
      me: me ? { effective: me.effective, pct: me.pct, completed: me.completed } : null,
    };
  }));
  return out.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}
