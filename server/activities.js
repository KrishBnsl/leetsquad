import { db } from './db.js';
import { HttpError } from './http-error.js';
import { dayOf, dayAdd } from './stats.js';

export const CATEGORIES = ['Project', 'System Design', 'Learning', 'Reading', 'Interview Prep', 'Open Source', 'Other'];
const now = () => Math.floor(Date.now() / 1000);

function parse(b) {
  const bad = (m) => { throw new HttpError(400, m); };
  const today = dayOf(now());
  const category = String(b.category || '');
  if (!CATEGORIES.includes(category)) bad('Pick a category');
  const title = String(b.title || '').trim();
  if (!title || title.length > 120) bad('Say what you did (max 120 characters)');
  const notes = String(b.notes || '').trim().slice(0, 600) || null;

  const day = String(b.day || today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day + 'T00:00:00Z'))) bad('Invalid date');
  if (day > today) bad('You can’t log activity for a future date');
  if (day < dayAdd(today, -365)) bad('That date is too far back');

  let minutes = null;
  if (b.minutes !== undefined && b.minutes !== null && String(b.minutes).trim() !== '') {
    minutes = Number(b.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) bad('Time spent must be 1–1440 minutes');
  }

  let link = String(b.link || '').trim() || null;
  if (link) {
    if (link.length > 300) bad('That link is too long');
    let u;
    try { u = new URL(/^[a-z]+:\/\//i.test(link) ? link : `https://${link}`); } catch { bad('That link doesn’t look valid'); }
    if (!['http:', 'https:'].includes(u.protocol)) bad('Links must start with http(s)://');
    link = u.href;
  }
  return { day, category, title, notes, minutes, link };
}

const view = (r) => ({ id: r.id, day: r.day, category: r.category, title: r.title, notes: r.notes, minutes: r.minutes, link: r.link });
const mine = async (username, id) => {
  const r = await db.get('SELECT * FROM activities WHERE id = ? AND username = ?', Number(id), username);
  if (!r) throw new HttpError(404, 'Entry not found');
  return r;
};

export async function create(username, body) {
  const a = parse(body);
  const [total, today] = await Promise.all([
    db.get('SELECT COUNT(*) AS n FROM activities WHERE username = ?', username),
    db.get('SELECT COUNT(*) AS n FROM activities WHERE username = ? AND day = ?', username, a.day),
  ]);
  if (total.n >= 3000 || today.n >= 30) throw new HttpError(400, 'That’s a lot of entries for one day — try merging a few');
  const r = await db.run('INSERT INTO activities (username, day, category, title, notes, minutes, link, created_at) VALUES (?,?,?,?,?,?,?,?)',
    username, a.day, a.category, a.title, a.notes, a.minutes, a.link, now());
  return view(await db.get('SELECT * FROM activities WHERE id = ?', r.lastInsertRowid));
}

export async function update(username, id, body) {
  await mine(username, id);
  const a = parse(body);
  await db.run('UPDATE activities SET day=?, category=?, title=?, notes=?, minutes=?, link=? WHERE id=?',
    a.day, a.category, a.title, a.notes, a.minutes, a.link, Number(id));
  return view(await db.get('SELECT * FROM activities WHERE id = ?', Number(id)));
}

export async function remove(username, id) {
  await mine(username, id);
  await db.run('DELETE FROM activities WHERE id = ?', Number(id));
}

// Latest entries plus a 30-day roll-up for the profile page.
export async function logSummary(username, today) {
  const from = dayAdd(today, -29);
  const [entries, byCategory, t] = await Promise.all([
    db.all('SELECT * FROM activities WHERE username = ? ORDER BY day DESC, id DESC LIMIT 150', username),
    db.all(`SELECT category, COUNT(*) AS entries, COALESCE(SUM(minutes), 0) AS minutes
      FROM activities WHERE username = ? AND day >= ? GROUP BY category ORDER BY minutes DESC, entries DESC`, username, from),
    db.get(`SELECT COUNT(DISTINCT day) AS days, COUNT(*) AS entries, COALESCE(SUM(minutes), 0) AS minutes
      FROM activities WHERE username = ? AND day >= ?`, username, from),
  ]);
  return { entries: entries.map(view), byCategory, days30: t.days, entries30: t.entries, minutes30: t.minutes };
}
