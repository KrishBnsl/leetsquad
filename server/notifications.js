// In-app notifications: replies, accepted answers, likes, group posts, challenge threads, new challenges.
import { db } from './db.js';
import { avatarUrl } from './stats.js';

const now = () => Math.floor(Date.now() / 1000);
// "Discussion" badges only count conversation activity; squad housekeeping (requests, joins, challenges) is separate.
const DISCUSSION = ['group_post', 'challenge_thread', 'reply', 'thread_reply', 'accepted', 'like'];
const ADMIN = ['join_request', 'member_joined', 'request_approved', 'request_declined'];
const inList = (arr) => arr.map((t) => `'${t}'`).join(',');
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// rows: [{ username, type, actor, postId, replyId, squadId, challengeId, title }]. Never notifies someone about their own action.
export async function notify(rows) {
  const t = now();
  const stmts = rows.filter((r) => r.username && !same(r.username, r.actor)).map((r) => [
    `INSERT INTO notifications (username, type, actor, post_id, reply_id, squad_id, challenge_id, title, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    r.username, r.type, r.actor ?? null, r.postId ?? null, r.replyId ?? null, r.squadId ?? null, r.challengeId ?? null,
    r.title ? String(r.title).slice(0, 120) : null, t,
  ]);
  for (let i = 0; i < stmts.length; i += 300) await db.batch(stmts.slice(i, i + 300));
  if (Math.random() < 0.02) db.run('DELETE FROM notifications WHERE created_at < ?', t - 60 * 86400).catch(() => {});
}

export const unreadCount = async (username) =>
  (await db.get('SELECT COUNT(*) AS n FROM notifications WHERE username = ? AND read_at IS NULL', username)).n;

export async function listFor(username, limit = 40) {
  const [rows, unread] = await Promise.all([
    db.all(`SELECT n.*, u.real_name, u.avatar, a.updated_at AS custom_at, sq.name AS squad_name, ch.title AS challenge_title
      FROM notifications n
      LEFT JOIN users u ON u.username = n.actor LEFT JOIN avatars a ON a.username = n.actor
      LEFT JOIN squads sq ON sq.id = n.squad_id LEFT JOIN challenges ch ON ch.id = n.challenge_id
      WHERE n.username = ? ORDER BY n.created_at DESC, n.id DESC LIMIT ?`, username, limit),
    unreadCount(username),
  ]);
  return {
    unread,
    items: rows.map((r) => ({
      id: r.id, type: r.type, actor: r.actor, name: r.real_name || '', avatar: r.actor ? avatarUrl(r.actor, r.avatar, r.custom_at) : '',
      postId: r.post_id, replyId: r.reply_id, squadId: r.squad_id, squadName: r.squad_name, challengeId: r.challenge_id,
      challengeTitle: r.challenge_title, title: r.title, createdAt: r.created_at, read: r.read_at != null,
    })),
  };
}

// One of: { all: true } | { ids: [..] } | { squadId } | { postId }
export async function markRead(username, { all, ids, squadId, postId, admin } = {}) {
  const t = now();
  if (all) return db.run('UPDATE notifications SET read_at = ? WHERE username = ? AND read_at IS NULL', t, username);
  if (Array.isArray(ids) && ids.length) {
    const clean = ids.map(Number).filter(Number.isInteger).slice(0, 100);
    if (clean.length) return db.run(`UPDATE notifications SET read_at = ? WHERE username = ? AND read_at IS NULL AND id IN (${clean.map(() => '?').join(',')})`, t, username, ...clean);
  }
  if (squadId != null) return db.run(`UPDATE notifications SET read_at = ? WHERE username = ? AND squad_id = ? AND read_at IS NULL AND type IN (${inList(admin ? ADMIN : DISCUSSION)})`, t, username, Number(squadId));
  if (postId != null) return db.run('UPDATE notifications SET read_at = ? WHERE username = ? AND post_id = ? AND read_at IS NULL', t, username, Number(postId));
}

export async function unreadBySquad(username) {
  const map = new Map();
  for (const r of await db.all(`SELECT squad_id, COUNT(*) AS n FROM notifications WHERE username = ? AND squad_id IS NOT NULL AND read_at IS NULL AND type IN (${inList(DISCUSSION)}) GROUP BY squad_id`, username)) map.set(r.squad_id, r.n);
  return map;
}
