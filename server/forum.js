// Forum engine for three scopes: the public forum, a group's private discussion, and threads on a group's challenge.
// A post with squad_id = NULL is public; with squad_id it is visible to that group's members only.
import { db } from './db.js';
import { HttpError } from './http-error.js';
import { avatarUrl } from './stats.js';
import { notify } from './notifications.js';

export const CATEGORIES = ['Doubt', 'Progress', 'Feedback', 'Discussion'];
const PAGE_SIZE = 20;
const now = () => Math.floor(Date.now() / 1000);
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// Site admins (can delete in the PUBLIC forum) come from ADMIN_USERS="name1,name2".
export const isAdmin = (username) =>
  !!username && (process.env.ADMIN_USERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).includes(username.toLowerCase());

const bad = (m) => { throw new HttpError(400, m); };

function cleanLink(raw) {
  const link = String(raw || '').trim();
  if (!link) return null;
  if (link.length > 300) bad('That link is too long');
  let u;
  try { u = new URL(/^[a-z]+:\/\//i.test(link) ? link : `https://${link}`); } catch { bad('That link doesn’t look valid'); }
  if (!['http:', 'https:'].includes(u.protocol)) bad('Links must start with http(s)://');
  return u.href;
}

function parsePost(b) {
  const category = String(b.category || '');
  if (!CATEGORIES.includes(category)) bad('Pick a category');
  const title = String(b.title || '').trim();
  if (title.length < 3 || title.length > 120) bad('Give your post a title (3–120 characters)');
  const body = String(b.body || '').trim();
  if (!body) bad('Write something in the body');
  if (body.length > 5000) bad('Posts can be at most 5000 characters');
  const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map((t) => String(t).trim()).filter(Boolean))];
  if (tags.length > 5 || tags.some((t) => t.length > 30 || !/^[A-Za-z0-9 &'/().+#-]+$/.test(t))) bad('Up to 5 tags, simple names only');
  return { category, title, body, tags, link: cleanLink(b.link) };
}

function parseReply(b) {
  const body = String(b.body || '').trim();
  if (!body) bad('Write a reply first');
  if (body.length > 3000) bad('Replies can be at most 3000 characters');
  return body;
}

const person = (r) => ({ author: r.author, name: r.real_name || '', avatar: avatarUrl(r.author, r.avatar, r.custom_at) });

/* ---------- visibility & moderation ---------- */
const memberOf = async (squadId, username) =>
  !!username && !!(await db.get('SELECT 1 AS x FROM squad_members WHERE squad_id = ? AND username = ?', squadId, username));
const squadOwner = async (squadId) => (await db.get('SELECT owner FROM squads WHERE id = ?', squadId))?.owner;

// Group posts are invisible to non-members: they get the same 404 as a deleted post.
async function visiblePost(id, viewer) {
  const p = await db.get('SELECT * FROM forum_posts WHERE id = ?', Number(id));
  if (!p || (p.squad_id != null && !(await memberOf(p.squad_id, viewer)))) throw new HttpError(404, 'That post doesn’t exist (it may have been deleted)');
  return p;
}
// Moderators: site admins in the public forum; the owner in a group's discussion.
async function isModerator(post, username) {
  if (!username) return false;
  if (post.squad_id == null) return isAdmin(username);
  return same(await squadOwner(post.squad_id), username);
}

/* ---------- reading ---------- */
const POST_COLS = `p.id, p.author, p.category, p.title, p.tags, p.link, p.created_at, p.updated_at, p.last_activity,
  p.accepted_reply_id, p.reply_count, p.like_count, p.squad_id, p.challenge_id, ch.title AS challenge_title, sq.name AS squad_name,
  u.real_name, u.avatar, a.updated_at AS custom_at,
  EXISTS(SELECT 1 FROM forum_likes l WHERE l.target = 'post' AND l.target_id = p.id AND l.username = ?) AS liked`;
const POST_JOINS = `FROM forum_posts p JOIN users u ON u.username = p.author LEFT JOIN avatars a ON a.username = p.author
  LEFT JOIN challenges ch ON ch.id = p.challenge_id LEFT JOIN squads sq ON sq.id = p.squad_id`;

const postView = (r, extra = {}) => ({
  id: r.id, ...person(r), category: r.category, title: r.title, tags: JSON.parse(r.tags || '[]'), link: r.link,
  createdAt: r.created_at, updatedAt: r.updated_at, lastActivity: r.last_activity,
  replyCount: r.reply_count, likeCount: r.like_count, solved: r.accepted_reply_id != null, liked: !!r.liked,
  squadId: r.squad_id, squadName: r.squad_name, challengeId: r.challenge_id, challengeTitle: r.challenge_title, ...extra,
});

// squadId == null -> the public forum. Callers must already have checked the viewer belongs to squadId.
export async function listPosts({ category, sort, q, page, squadId = null, challengeId = null }, viewer) {
  const where = [squadId == null ? 'p.squad_id IS NULL' : 'p.squad_id = ?'], args = squadId == null ? [] : [Number(squadId)];
  if (challengeId != null) { where.push('p.challenge_id = ?'); args.push(Number(challengeId)); }
  if (CATEGORIES.includes(category)) { where.push('p.category = ?'); args.push(category); }
  const term = String(q || '').trim().slice(0, 60);
  if (term) {
    const like = `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where.push("(p.title LIKE ? ESCAPE '\\' OR p.body LIKE ? ESCAPE '\\')");
    args.push(like, like);
  }
  if (sort === 'unanswered') where.push('p.reply_count = 0');
  const order = sort === 'new' || sort === 'unanswered' ? 'p.created_at DESC' : sort === 'top' ? 'p.like_count DESC, p.last_activity DESC' : 'p.last_activity DESC';
  const pg = Math.max(1, Math.min(500, Number(page) || 1));
  const rows = await db.all(
    `SELECT ${POST_COLS}, substr(p.body, 1, 200) AS excerpt ${POST_JOINS} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`,
    viewer || '', ...args, PAGE_SIZE + 1, (pg - 1) * PAGE_SIZE);
  return { posts: rows.slice(0, PAGE_SIZE).map((r) => postView(r, { excerpt: r.excerpt })), hasMore: rows.length > PAGE_SIZE, page: pg };
}

export async function getPost(id, viewer) {
  const meta = await visiblePost(id, viewer);
  const row = await db.get(`SELECT ${POST_COLS}, p.body ${POST_JOINS} WHERE p.id = ?`, viewer || '', meta.id);
  const replies = await db.all(
    `SELECT r.id, r.author, r.body, r.created_at, r.updated_at, r.like_count, u.real_name, u.avatar, a.updated_at AS custom_at,
       EXISTS(SELECT 1 FROM forum_likes l WHERE l.target = 'reply' AND l.target_id = r.id AND l.username = ?) AS liked
     FROM forum_replies r JOIN users u ON u.username = r.author LEFT JOIN avatars a ON a.username = r.author
     WHERE r.post_id = ? ORDER BY (r.id = ?) DESC, r.created_at ASC, r.id ASC`, viewer || '', row.id, row.accepted_reply_id ?? -1);
  return {
    post: postView(row, { body: row.body }),
    moderator: await isModerator(meta, viewer),
    replies: replies.map((r) => ({
      id: r.id, ...person(r), body: r.body, createdAt: r.created_at, updatedAt: r.updated_at,
      likeCount: r.like_count, liked: !!r.liked, accepted: r.id === row.accepted_reply_id,
    })),
  };
}

/* ---------- writing ---------- */
export async function createPost(username, body, { squadId = null, challengeId = null } = {}) {
  const p = parsePost(body);
  if (squadId != null) {
    if (!(await memberOf(squadId, username))) throw new HttpError(404, 'Group not found');
  } else if (challengeId != null) bad('Challenge threads belong to a group');
  let challenge = null;
  if (challengeId != null) {
    challenge = await db.get('SELECT id, title FROM challenges WHERE id = ? AND squad_id = ?', Number(challengeId), Number(squadId));
    if (!challenge) throw new HttpError(404, 'Challenge not found');
  }
  const t = now();
  const r = await db.run(
    `INSERT INTO forum_posts (author, category, title, body, tags, link, created_at, updated_at, last_activity, squad_id, challenge_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    username, p.category, p.title, p.body, JSON.stringify(p.tags), p.link, t, t, t, squadId, challenge ? challenge.id : null);
  if (squadId != null) {
    const members = await db.all('SELECT username FROM squad_members WHERE squad_id = ?', Number(squadId));
    await notify(members.map((m) => ({
      username: m.username, type: challenge ? 'challenge_thread' : 'group_post', actor: username,
      postId: r.lastInsertRowid, squadId: Number(squadId), challengeId: challenge?.id ?? null, title: p.title,
    })));
  }
  return { id: r.lastInsertRowid };
}

export async function updatePost(username, id, body) {
  const post = await visiblePost(id, username);
  if (!same(post.author, username)) throw new HttpError(403, 'You can only edit your own posts');
  const p = parsePost(body);
  await db.run('UPDATE forum_posts SET category=?, title=?, body=?, tags=?, link=?, updated_at=? WHERE id=?',
    p.category, p.title, p.body, JSON.stringify(p.tags), p.link, now(), post.id);
  if (p.category !== 'Doubt' && post.accepted_reply_id != null) await db.run('UPDATE forum_posts SET accepted_reply_id = NULL WHERE id = ?', post.id);
}

export const dropPostStatements = (id) => [
  ["DELETE FROM forum_likes WHERE target='reply' AND target_id IN (SELECT id FROM forum_replies WHERE post_id = ?)", id],
  ["DELETE FROM forum_likes WHERE target='post' AND target_id = ?", id],
  ['DELETE FROM notifications WHERE post_id = ?', id],
  ['DELETE FROM forum_replies WHERE post_id = ?', id],
  ['DELETE FROM forum_posts WHERE id = ?', id],
];

export async function deletePost(username, id) {
  const post = await visiblePost(id, username);
  if (!same(post.author, username) && !(await isModerator(post, username))) throw new HttpError(403, 'You can only delete your own posts');
  await db.batch(dropPostStatements(post.id));
}

export async function addReply(username, postId, body) {
  const text = parseReply(body);
  const post = await visiblePost(postId, username);
  const t = now();
  const n = (await db.get('SELECT COUNT(*) AS n FROM forum_replies WHERE post_id = ?', post.id)).n;
  if (n >= 500) throw new HttpError(400, 'This thread is full');
  const [ins] = await db.batch([
    ['INSERT INTO forum_replies (post_id, author, body, created_at, updated_at) VALUES (?,?,?,?,?)', post.id, username, text, t, t],
    ['UPDATE forum_posts SET reply_count = reply_count + 1, last_activity = ? WHERE id = ?', t, post.id],
  ]);
  // The asker hears about every reply; anyone who already replied hears about follow-ups.
  const before = await db.all('SELECT DISTINCT author FROM forum_replies WHERE post_id = ? AND id <> ? LIMIT 40', post.id, ins.lastInsertRowid);
  const base = { actor: username, postId: post.id, replyId: ins.lastInsertRowid, squadId: post.squad_id, title: post.title };
  await notify([
    { ...base, username: post.author, type: 'reply' },
    ...before.filter((b) => !same(b.author, post.author)).map((b) => ({ ...base, username: b.author, type: 'thread_reply' })),
  ]);
  return { id: ins.lastInsertRowid };
}

async function visibleReply(id, viewer) {
  const r = await db.get('SELECT * FROM forum_replies WHERE id = ?', Number(id));
  if (!r) throw new HttpError(404, 'That reply doesn’t exist');
  const post = await visiblePost(r.post_id, viewer);
  return { r, post };
}

export async function updateReply(username, id, body) {
  const { r } = await visibleReply(id, username);
  if (!same(r.author, username)) throw new HttpError(403, 'You can only edit your own replies');
  await db.run('UPDATE forum_replies SET body = ?, updated_at = ? WHERE id = ?', parseReply(body), now(), r.id);
}

export async function deleteReply(username, id) {
  const { r, post } = await visibleReply(id, username);
  if (!same(r.author, username) && !(await isModerator(post, username))) throw new HttpError(403, 'You can only delete your own replies');
  await db.batch([
    ["DELETE FROM forum_likes WHERE target='reply' AND target_id = ?", r.id],
    ['DELETE FROM notifications WHERE reply_id = ?', r.id],
    ['DELETE FROM forum_replies WHERE id = ?', r.id],
    ['UPDATE forum_posts SET reply_count = MAX(0, reply_count - 1), accepted_reply_id = CASE WHEN accepted_reply_id = ? THEN NULL ELSE accepted_reply_id END WHERE id = ?', r.id, r.post_id],
  ]);
}

// Only the asker can accept, and only on Doubt posts. replyId = null clears it.
export async function acceptReply(username, postId, replyId) {
  const post = await visiblePost(postId, username);
  if (!same(post.author, username)) throw new HttpError(403, 'Only the person who asked can accept an answer');
  if (post.category !== 'Doubt') throw new HttpError(400, 'Only Doubt posts have accepted answers');
  if (replyId == null) { await db.run('UPDATE forum_posts SET accepted_reply_id = NULL WHERE id = ?', post.id); return; }
  const r = await db.get('SELECT author FROM forum_replies WHERE id = ? AND post_id = ?', Number(replyId), post.id);
  if (!r) throw new HttpError(404, 'That reply isn’t on this post');
  await db.run('UPDATE forum_posts SET accepted_reply_id = ? WHERE id = ?', Number(replyId), post.id);
  await notify([{ username: r.author, type: 'accepted', actor: username, postId: post.id, replyId: Number(replyId), squadId: post.squad_id, title: post.title }]);
}

export async function toggleLike(username, target, id) {
  if (!['post', 'reply'].includes(target)) throw new HttpError(400, 'Nothing to like');
  let row, post;
  if (target === 'post') { post = await visiblePost(id, username); row = post; }
  else { const v = await visibleReply(id, username); row = v.r; post = v.post; }
  const table = target === 'post' ? 'forum_posts' : 'forum_replies';
  if (same(row.author, username)) throw new HttpError(400, 'You can’t like your own post');
  const had = await db.get('SELECT 1 AS x FROM forum_likes WHERE target = ? AND target_id = ? AND username = ?', target, Number(id), username);
  await db.batch(had
    ? [['DELETE FROM forum_likes WHERE target = ? AND target_id = ? AND username = ?', target, Number(id), username],
       [`UPDATE ${table} SET like_count = MAX(0, like_count - 1) WHERE id = ?`, Number(id)]]
    : [['INSERT OR IGNORE INTO forum_likes (target, target_id, username, created_at) VALUES (?,?,?,?)', target, Number(id), username, now()],
       [`UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`, Number(id)]]);
  if (!had) { // one unread "liked" notification per target is enough
    const replyId = target === 'reply' ? Number(id) : null;
    const dup = await db.get(`SELECT 1 AS x FROM notifications WHERE username = ? AND type = 'like' AND post_id = ? AND COALESCE(reply_id, 0) = ? AND read_at IS NULL`,
      row.author, post.id, replyId ?? 0);
    if (!dup) await notify([{ username: row.author, type: 'like', actor: username, postId: post.id, replyId, squadId: post.squad_id, title: post.title }]);
  }
  return { liked: !had, count: (await db.get(`SELECT like_count FROM ${table} WHERE id = ?`, Number(id))).like_count };
}

// Statements that remove everything a user wrote (used when they delete their account).
export const purgeUserStatements = (username) => [
  ["DELETE FROM forum_likes WHERE target='reply' AND target_id IN (SELECT id FROM forum_replies WHERE post_id IN (SELECT id FROM forum_posts WHERE author = ?))", username],
  ["DELETE FROM forum_likes WHERE target='post' AND target_id IN (SELECT id FROM forum_posts WHERE author = ?)", username],
  ['DELETE FROM notifications WHERE post_id IN (SELECT id FROM forum_posts WHERE author = ?)', username],
  ['DELETE FROM forum_replies WHERE post_id IN (SELECT id FROM forum_posts WHERE author = ?)', username],
  ['DELETE FROM forum_posts WHERE author = ?', username],
  ['DELETE FROM forum_likes WHERE username = ?', username],
  ['DELETE FROM forum_replies WHERE author = ?', username],
  ['DELETE FROM notifications WHERE username = ? OR actor = ?', username, username],
  ['UPDATE forum_posts SET reply_count = (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = forum_posts.id), accepted_reply_id = CASE WHEN accepted_reply_id IN (SELECT id FROM forum_replies) THEN accepted_reply_id ELSE NULL END'],
];
