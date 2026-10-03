// Forum: posts (doubts / progress / feedback / discussion), replies, likes, accepted answers.
import { db } from './db.js';
import { HttpError } from './http-error.js';
import { avatarUrl } from './stats.js';

export const CATEGORIES = ['Doubt', 'Progress', 'Feedback', 'Discussion'];
const PAGE_SIZE = 20;
const now = () => Math.floor(Date.now() / 1000);

// Site admins (can delete any post/reply) come from ADMIN_USERS="name1,name2".
export const isAdmin = (username) =>
  !!username && (process.env.ADMIN_USERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).includes(username.toLowerCase());

const bad = (m) => { throw new HttpError(400, m); };

function cleanLink(raw) {
  let link = String(raw || '').trim();
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

const person = (r) => ({
  author: r.author, name: r.real_name || '', avatar: avatarUrl(r.author, r.avatar, r.custom_at),
});

const POST_COLS = `p.id, p.author, p.category, p.title, p.tags, p.link, p.created_at, p.updated_at, p.last_activity,
  p.accepted_reply_id, p.reply_count, p.like_count, u.real_name, u.avatar, a.updated_at AS custom_at,
  EXISTS(SELECT 1 FROM forum_likes l WHERE l.target = 'post' AND l.target_id = p.id AND l.username = ?) AS liked`;
const POST_JOINS = 'FROM forum_posts p JOIN users u ON u.username = p.author LEFT JOIN avatars a ON a.username = p.author';

const postView = (r, extra = {}) => ({
  id: r.id, ...person(r), category: r.category, title: r.title, tags: JSON.parse(r.tags || '[]'), link: r.link,
  createdAt: r.created_at, updatedAt: r.updated_at, lastActivity: r.last_activity,
  replyCount: r.reply_count, likeCount: r.like_count, solved: r.accepted_reply_id != null, liked: !!r.liked, ...extra,
});

export async function listPosts({ category, sort, q, page }, viewer) {
  const where = [], args = [];
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
    `SELECT ${POST_COLS}, substr(p.body, 1, 200) AS excerpt ${POST_JOINS}
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ? OFFSET ?`,
    viewer || '', ...args, PAGE_SIZE + 1, (pg - 1) * PAGE_SIZE);
  return { posts: rows.slice(0, PAGE_SIZE).map((r) => postView(r, { excerpt: r.excerpt })), hasMore: rows.length > PAGE_SIZE, page: pg };
}

export async function getPost(id, viewer) {
  const row = await db.get(`SELECT ${POST_COLS}, p.body ${POST_JOINS} WHERE p.id = ?`, viewer || '', Number(id));
  if (!row) throw new HttpError(404, 'That post doesn’t exist (it may have been deleted)');
  const replies = await db.all(
    `SELECT r.id, r.author, r.body, r.created_at, r.updated_at, r.like_count, u.real_name, u.avatar, a.updated_at AS custom_at,
       EXISTS(SELECT 1 FROM forum_likes l WHERE l.target = 'reply' AND l.target_id = r.id AND l.username = ?) AS liked
     FROM forum_replies r JOIN users u ON u.username = r.author LEFT JOIN avatars a ON a.username = r.author
     WHERE r.post_id = ? ORDER BY (r.id = ?) DESC, r.created_at ASC, r.id ASC`, viewer || '', row.id, row.accepted_reply_id ?? -1);
  return {
    post: postView(row, { body: row.body }),
    replies: replies.map((r) => ({
      id: r.id, ...person(r), body: r.body, createdAt: r.created_at, updatedAt: r.updated_at,
      likeCount: r.like_count, liked: !!r.liked, accepted: r.id === row.accepted_reply_id,
    })),
  };
}

export async function createPost(username, body) {
  const p = parsePost(body);
  const t = now();
  const r = await db.run(
    'INSERT INTO forum_posts (author, category, title, body, tags, link, created_at, updated_at, last_activity) VALUES (?,?,?,?,?,?,?,?,?)',
    username, p.category, p.title, p.body, JSON.stringify(p.tags), p.link, t, t, t);
  return { id: r.lastInsertRowid };
}

const ownPost = async (id) => {
  const p = await db.get('SELECT * FROM forum_posts WHERE id = ?', Number(id));
  if (!p) throw new HttpError(404, 'That post doesn’t exist');
  return p;
};
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export async function updatePost(username, id, body) {
  const post = await ownPost(id);
  if (!same(post.author, username)) throw new HttpError(403, 'You can only edit your own posts');
  const p = parsePost(body);
  await db.run('UPDATE forum_posts SET category=?, title=?, body=?, tags=?, link=?, updated_at=? WHERE id=?',
    p.category, p.title, p.body, JSON.stringify(p.tags), p.link, now(), post.id);
  if (p.category !== 'Doubt' && post.accepted_reply_id != null) await db.run('UPDATE forum_posts SET accepted_reply_id = NULL WHERE id = ?', post.id);
}

const dropPostStatements = (id) => [
  ["DELETE FROM forum_likes WHERE target='reply' AND target_id IN (SELECT id FROM forum_replies WHERE post_id = ?)", id],
  ["DELETE FROM forum_likes WHERE target='post' AND target_id = ?", id],
  ['DELETE FROM forum_replies WHERE post_id = ?', id],
  ['DELETE FROM forum_posts WHERE id = ?', id],
];

export async function deletePost(username, id) {
  const post = await ownPost(id);
  if (!same(post.author, username) && !isAdmin(username)) throw new HttpError(403, 'You can only delete your own posts');
  await db.batch(dropPostStatements(post.id));
}

export async function addReply(username, postId, body) {
  const text = parseReply(body);
  const post = await ownPost(postId);
  const t = now();
  const n = (await db.get('SELECT COUNT(*) AS n FROM forum_replies WHERE post_id = ?', post.id)).n;
  if (n >= 500) throw new HttpError(400, 'This thread is full');
  const [ins] = await db.batch([
    ['INSERT INTO forum_replies (post_id, author, body, created_at, updated_at) VALUES (?,?,?,?,?)', post.id, username, text, t, t],
    ['UPDATE forum_posts SET reply_count = reply_count + 1, last_activity = ? WHERE id = ?', t, post.id],
  ]);
  return { id: ins.lastInsertRowid };
}

const ownReply = async (id) => {
  const r = await db.get('SELECT * FROM forum_replies WHERE id = ?', Number(id));
  if (!r) throw new HttpError(404, 'That reply doesn’t exist');
  return r;
};

export async function updateReply(username, id, body) {
  const r = await ownReply(id);
  if (!same(r.author, username)) throw new HttpError(403, 'You can only edit your own replies');
  await db.run('UPDATE forum_replies SET body = ?, updated_at = ? WHERE id = ?', parseReply(body), now(), r.id);
}

export async function deleteReply(username, id) {
  const r = await ownReply(id);
  if (!same(r.author, username) && !isAdmin(username)) throw new HttpError(403, 'You can only delete your own replies');
  await db.batch([
    ["DELETE FROM forum_likes WHERE target='reply' AND target_id = ?", r.id],
    ['DELETE FROM forum_replies WHERE id = ?', r.id],
    ['UPDATE forum_posts SET reply_count = MAX(0, reply_count - 1), accepted_reply_id = CASE WHEN accepted_reply_id = ? THEN NULL ELSE accepted_reply_id END WHERE id = ?', r.id, r.post_id],
  ]);
}

// Only the asker can accept, and only on Doubt posts. replyId = null clears it.
export async function acceptReply(username, postId, replyId) {
  const post = await ownPost(postId);
  if (!same(post.author, username)) throw new HttpError(403, 'Only the person who asked can accept an answer');
  if (post.category !== 'Doubt') throw new HttpError(400, 'Only Doubt posts have accepted answers');
  if (replyId == null) { await db.run('UPDATE forum_posts SET accepted_reply_id = NULL WHERE id = ?', post.id); return; }
  const r = await db.get('SELECT 1 AS x FROM forum_replies WHERE id = ? AND post_id = ?', Number(replyId), post.id);
  if (!r) throw new HttpError(404, 'That reply isn’t on this post');
  await db.run('UPDATE forum_posts SET accepted_reply_id = ? WHERE id = ?', Number(replyId), post.id);
}

export async function toggleLike(username, target, id) {
  if (!['post', 'reply'].includes(target)) throw new HttpError(400, 'Nothing to like');
  const table = target === 'post' ? 'forum_posts' : 'forum_replies';
  const row = await db.get(`SELECT author FROM ${table} WHERE id = ?`, Number(id));
  if (!row) throw new HttpError(404, 'That no longer exists');
  if (same(row.author, username)) throw new HttpError(400, 'You can’t like your own post');
  const had = await db.get('SELECT 1 AS x FROM forum_likes WHERE target = ? AND target_id = ? AND username = ?', target, Number(id), username);
  await db.batch(had
    ? [['DELETE FROM forum_likes WHERE target = ? AND target_id = ? AND username = ?', target, Number(id), username],
       [`UPDATE ${table} SET like_count = MAX(0, like_count - 1) WHERE id = ?`, Number(id)]]
    : [['INSERT OR IGNORE INTO forum_likes (target, target_id, username, created_at) VALUES (?,?,?,?)', target, Number(id), username, now()],
       [`UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`, Number(id)]]);
  return { liked: !had, count: (await db.get(`SELECT like_count FROM ${table} WHERE id = ?`, Number(id))).like_count };
}

// Statements that remove everything a user wrote (used when they delete their account).
export const purgeUserStatements = (username) => [
  ["DELETE FROM forum_likes WHERE target='reply' AND target_id IN (SELECT id FROM forum_replies WHERE post_id IN (SELECT id FROM forum_posts WHERE author = ?))", username],
  ["DELETE FROM forum_likes WHERE target='post' AND target_id IN (SELECT id FROM forum_posts WHERE author = ?)", username],
  ['DELETE FROM forum_replies WHERE post_id IN (SELECT id FROM forum_posts WHERE author = ?)', username],
  ['DELETE FROM forum_posts WHERE author = ?', username],
  ['DELETE FROM forum_likes WHERE username = ?', username],
  ['DELETE FROM forum_replies WHERE author = ?', username],
  ['UPDATE forum_posts SET reply_count = (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = forum_posts.id), accepted_reply_id = CASE WHEN accepted_reply_id IN (SELECT id FROM forum_replies) THEN accepted_reply_id ELSE NULL END'],
];
