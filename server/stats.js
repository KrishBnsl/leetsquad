import { db } from './db.js';
import { cfDifficulty } from './platforms.js';

export const TZ = process.env.TZ_NAME || 'UTC';
// Profile picture shown everywhere: the user's own upload if any, otherwise their LeetCode one.
export const avatarUrl = (username, leetcodeUrl, customUpdatedAt) =>
  customUpdatedAt ? `/api/avatar/${encodeURIComponent(username)}?v=${customUpdatedAt}` : (leetcodeUrl || '');
export async function avatarFor(u) {
  const c = await db.get('SELECT updated_at FROM avatars WHERE username = ?', u.username);
  return { avatar: avatarUrl(u.username, u.avatar, c?.updated_at), customAvatar: !!c };
}
export const POINTS = { Easy: 1, Medium: 3, Hard: 6, Unknown: 1 };
// Points follow the problem rating when we know it (Codeforces always; LeetCode via clist.by),
// otherwise fall back to the Easy/Medium/Hard bucket. Rated and unrated land on the same 1/3/6 scale.
export const ratingPoints = (r) => (r <= 1200 ? 1 : r <= 1500 ? 2 : r <= 1800 ? 3 : r <= 2100 ? 4 : r <= 2400 ? 6 : r <= 2700 ? 8 : 10);
export const pointsFor = (p) => (p.rating ? ratingPoints(p.rating) : (POINTS[p.difficulty] ?? 1));

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayOf = (ts) => fmt.format(new Date(ts * 1000));
export const dayAdd = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const monthAdd = (month, n) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// One entry per (day, distinct problem) with an Accepted submission, across the given platforms.
export async function loadDays(username, platforms = ['leetcode']) {
  const rows = await db.all(`
    SELECT s.slug, s.ts, s.lang, s.title AS stitle, q.title, q.difficulty, q.topics, q.frontend_id AS fid,
           COALESCE(c.rating, q.rating) AS rating
    FROM submissions s LEFT JOIN questions q ON q.slug = s.slug LEFT JOIN clist_ratings c ON c.slug = s.slug
    WHERE s.username = ? AND s.status = 'Accepted' AND s.platform IN (${platforms.map(() => '?').join(',')}) ORDER BY s.ts`,
  username, ...platforms);
  const days = new Map();
  for (const r of rows) {
    const d = dayOf(r.ts);
    if (!days.has(d)) days.set(d, new Map());
    const prev = days.get(d).get(r.slug);
    days.get(d).set(r.slug, {
      firstTs: prev?.firstTs ?? r.ts,
      slug: r.slug, title: r.title || r.stitle, fid: r.fid, rating: r.rating,
      // Codeforces has no official difficulty label, so bucket by whichever rating we have; LeetCode keeps its own labels.
      difficulty: r.slug.startsWith('cf:') && r.rating ? cfDifficulty(r.rating) : (r.difficulty || 'Unknown'),
      topics: r.topics ? JSON.parse(r.topics) : [], ts: r.ts, lang: r.lang,
    });
  }
  return days;
}

function mergeDays(a, b) {
  const out = new Map();
  for (const m of [a, b]) for (const [d, probs] of m) {
    if (!out.has(d)) out.set(d, new Map());
    for (const [slug, p] of probs) out.get(d).set(slug, p);
  }
  return out;
}

const ghDayMap = async (username) => new Map((await db.all('SELECT day, count FROM gh_days WHERE username = ?', username)).map((r) => [r.day, r.count]));
const logDayMap = async (username) => new Map((await db.all('SELECT day, COUNT(*) AS n FROM activities WHERE username = ? GROUP BY day', username)).map((r) => [r.day, r.n]));

export async function linksOf(username) {
  const out = {};
  for (const l of await db.all('SELECT * FROM user_links WHERE username = ?', username)) {
    out[l.platform] = { handle: l.handle, data: l.data_json ? JSON.parse(l.data_json) : {}, lastSynced: l.last_synced, syncError: l.sync_error };
  }
  return out;
}
export function linkSummary(links) {
  const cfInfo = links.codeforces?.data?.info;
  return {
    codeforces: links.codeforces ? { handle: links.codeforces.handle, rating: cfInfo?.rating ?? null, rank: cfInfo?.rank ?? null, maxRating: cfInfo?.maxRating ?? null } : null,
    github: links.github ? { handle: links.github.handle } : null,
  };
}

// Distinct problems solved with day in [from, to].
function windowStats(days, from, to) {
  const seen = new Map();
  for (const [d, probs] of days) {
    if (d < from || d > to) continue;
    for (const [slug, p] of probs) seen.set(slug, p);
  }
  const out = { count: seen.size, easy: 0, medium: 0, hard: 0, points: 0, topics: new Map() };
  for (const p of seen.values()) {
    if (p.difficulty === 'Easy') out.easy++;
    else if (p.difficulty === 'Medium') out.medium++;
    else if (p.difficulty === 'Hard') out.hard++;
    out.points += pointsFor(p);
    for (const t of p.topics) out.topics.set(t, (out.topics.get(t) || 0) + 1);
  }
  return out;
}

// Sum of a day->count map over [from, to] (GitHub contributions, log entries).
function windowSum(map, from, to) {
  let n = 0;
  for (const [d, c] of map) if (d >= from && d <= to) n += c;
  return n;
}

const topList = (map, n = 12) =>
  [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([name, count]) => ({ name, count }));

function streaks(days, today) {
  const active = new Set(days.keys());
  let current = 0;
  let d = active.has(today) ? today : dayAdd(today, -1);
  while (active.has(d)) { current++; d = dayAdd(d, -1); }
  let longest = 0, run = 0, prev = null;
  for (const day of [...active].sort()) {
    run = prev && dayAdd(prev, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  return { current, longest, activeToday: active.has(today) };
}

const pub = (w) => ({ count: w.count, easy: w.easy, medium: w.medium, hard: w.hard, points: w.points });

const userRow = (username) => db.get('SELECT * FROM users WHERE username = ?', username);

async function baseInfo(u) {
  const totals = u.totals_json ? JSON.parse(u.totals_json) : null;
  return {
    username: u.username, name: u.real_name || '', ...(await avatarFor(u)), ranking: u.ranking,
    totals, sessionOk: !!u.session_ok, lastSynced: u.last_synced, syncError: u.sync_error,
    addedAt: u.added_at,
  };
}

// Leaderboard numbers for one source (a set of problem days).
function modeStats(days, today) {
  const periods = {
    today: windowStats(days, today, today),
    week: windowStats(days, dayAdd(today, -6), today),
    month: windowStats(days, dayAdd(today, -29), today),
    all: windowStats(days, '0000-00-00', '9999-99-99'),
  };
  const spark = [];
  for (let i = 13; i >= 0; i--) spark.push(days.get(dayAdd(today, -i))?.size || 0);
  let lastActive = null;
  for (const probs of days.values()) for (const p of probs.values()) lastActive = Math.max(lastActive ?? 0, p.ts);
  const s = streaks(days, today);
  return {
    periods: Object.fromEntries(Object.entries(periods).map(([k, v]) => [k, pub(v)])),
    streak: s.current, activeToday: s.activeToday, spark, lastActive,
    hotTopic: topList(periods.month.topics, 1)[0]?.name || null,
  };
}

// GitHub has no "problems": a contribution is a point.
function ghModeStats(map, today) {
  const win = (from, to) => { const c = windowSum(map, from, to); return { count: c, easy: 0, medium: 0, hard: 0, points: c }; };
  const spark = [];
  for (let i = 13; i >= 0; i--) spark.push(map.get(dayAdd(today, -i)) || 0);
  const s = streaks(map, today);
  return {
    periods: { today: win(today, today), week: win(dayAdd(today, -6), today), month: win(dayAdd(today, -29), today), all: win('0000-00-00', '9999-99-99') },
    streak: s.current, activeToday: s.activeToday, spark, lastActive: null, hotTopic: null,
  };
}

export async function leaderboardEntry(u, daysFor = (p) => loadDays(u.username, p)) {
  const [links, lcDays, info] = await Promise.all([linksOf(u.username), daysFor(['leetcode']), baseInfo(u)]);
  const cfDays = links.codeforces ? await daysFor(['codeforces']) : new Map();
  const modes = { leetcode: modeStats(lcDays, dayOf(Date.now() / 1000)), overall: null };
  const today = dayOf(Date.now() / 1000);
  modes.overall = links.codeforces ? modeStats(mergeDays(lcDays, cfDays), today) : modes.leetcode;
  if (links.codeforces) modes.codeforces = modeStats(cfDays, today);
  if (links.github) modes.github = ghModeStats(await ghDayMap(u.username), today);

  const lc = modes.leetcode;
  return {
    ...info,
    totals: info.totals || { all: lc.periods.all.count, easy: lc.periods.all.easy, medium: lc.periods.all.medium, hard: lc.periods.all.hard },
    // LeetCode-only fields kept at the top level; every source is also under `modes`.
    periods: lc.periods, streak: lc.streak, activeToday: lc.activeToday, spark: lc.spark, lastActive: lc.lastActive, hotTopic: lc.hotTopic,
    modes, links: linkSummary(links),
  };
}

const monthAddKey = monthAdd;

// Everything the profile page shows for one problem-solving platform.
async function platformStats(username, days, today, platforms) {
  const thisMonth = today.slice(0, 7);
  const lastMonth = monthAdd(thisMonth, -1);
  const monthRange = (m) => windowStats(days, `${m}-01`, `${m}-31`);

  const w = {
    today: windowStats(days, today, today),
    week: windowStats(days, dayAdd(today, -6), today),
    month30: windowStats(days, dayAdd(today, -29), today),
    all: windowStats(days, '0000-00-00', '9999-99-99'),
  };
  const tm = monthRange(thisMonth), lm = monthRange(lastMonth);

  const heat = {};
  for (let i = 0; i < 371; i++) {
    const d = dayAdd(today, -i);
    if (days.has(d)) heat[d] = days.get(d).size;
  }
  const daily = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayAdd(today, -i);
    daily.push({ day: d, count: days.get(d)?.size || 0 });
  }
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const m = monthAddKey(thisMonth, -i);
    months.push({ month: m, count: monthRange(m).count });
  }

  let best = { day: null, count: 0 };
  for (const [d, p] of days) if (p.size > best.count) best = { day: d, count: p.size };

  const flat = [];
  for (const probs of days.values()) for (const p of probs.values()) flat.push(p);
  flat.sort((a, b) => b.ts - a.ts);
  const recent = [], seen = new Set();
  for (const p of flat) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    recent.push(p);
    if (recent.length >= 30) break;
  }

  const ph = platforms.map(() => '?').join(',');
  const [langs, sub] = await Promise.all([
    db.all(`SELECT lang, COUNT(DISTINCT slug) AS n FROM submissions
      WHERE username=? AND platform IN (${ph}) AND status='Accepted' AND lang IS NOT NULL GROUP BY lang ORDER BY n DESC LIMIT 12`, username, ...platforms),
    db.get(`SELECT COUNT(*) AS total, SUM(status='Accepted') AS ac FROM submissions WHERE username=? AND platform IN (${ph})`, username, ...platforms),
  ]);
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  for (const [d, probs] of days) weekdays[new Date(d + 'T00:00:00Z').getUTCDay()] += probs.size;

  return {
    derived: pub(w.all),
    periods: { today: pub(w.today), week: pub(w.week), month30: pub(w.month30) },
    thisMonth: { ...pub(tm), label: thisMonth, topics: topList(tm.topics, 8) },
    lastMonth: { ...pub(lm), label: lastMonth, topics: topList(lm.topics, 8) },
    streak: streaks(days, today),
    heat, daily, months, best, weekdays,
    topics: { recent: topList(w.month30.topics, 12), week: topList(w.week.topics, 12), all: topList(w.all.topics, 15) },
    recent, langs: langs.map((l) => ({ lang: l.lang, count: l.n })),
    submissions: { total: sub.total, accepted: sub.ac || 0 },
  };
}

// Solved-problem histogram by Codeforces problem rating (800, 900, ...).
function ratingHistogram(days) {
  const seen = new Map();
  for (const probs of days.values()) for (const [slug, p] of probs) if (p.rating) seen.set(slug, p.rating);
  const buckets = new Map();
  for (const r of seen.values()) { const b = Math.floor(r / 100) * 100; buckets.set(b, (buckets.get(b) || 0) + 1); }
  return [...buckets].sort((a, b) => a[0] - b[0]).map(([rating, count]) => ({ rating, count }));
}

function githubStats(username, link, today, map) {
  const sum = (from, to) => windowSum(map, from, to);
  const d365 = dayAdd(today, -364);
  const daily = [];
  for (let i = 29; i >= 0; i--) { const d = dayAdd(today, -i); daily.push({ day: d, count: map.get(d) || 0 }); }
  const thisMonth = today.slice(0, 7);
  const months = [];
  for (let i = 5; i >= 0; i--) { const m = monthAdd(thisMonth, -i); months.push({ month: m, count: sum(`${m}-01`, `${m}-31`) }); }
  let best = { day: null, count: 0 };
  for (const [d, c] of map) if (c > best.count) best = { day: d, count: c };
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  for (const [d, c] of map) weekdays[new Date(d + 'T00:00:00Z').getUTCDay()] += c;
  return {
    handle: link.handle, ...link.data, lastSynced: link.lastSynced, syncError: link.syncError,
    periods: { today: sum(today, today), week: sum(dayAdd(today, -6), today), month30: sum(dayAdd(today, -29), today) },
    total365: sum(d365, today), activeDays365: [...map].filter(([d, c]) => d >= d365 && c > 0).length,
    thisMonth: sum(`${thisMonth}-01`, `${thisMonth}-31`), lastMonth: sum(`${monthAdd(thisMonth, -1)}-01`, `${monthAdd(thisMonth, -1)}-31`),
    streak: streaks(map, today), daily, months, best, weekdays,
  };
}

const lastDays = (days, today, size = (v) => v.size ?? v) => {
  const out = {};
  for (let i = 0; i < 371; i++) {
    const d = dayAdd(today, -i);
    if (days.has(d)) out[d] = size(days.get(d));
  }
  return out;
};

export async function profile(username) {
  const u = await userRow(username);
  if (!u) return null;
  const today = dayOf(Date.now() / 1000);
  const [links, lcDays, info, logMap] = await Promise.all([linksOf(u.username), loadDays(u.username, ['leetcode']), baseInfo(u), logDayMap(u.username)]);
  const lc = await platformStats(u.username, lcDays, today, ['leetcode']);

  const out = {
    ...info, today,
    totals: info.totals || { all: lc.derived.count, easy: lc.derived.easy, medium: lc.derived.medium, hard: lc.derived.hard },
    ...lc, ratingHist: ratingHistogram(lcDays),
    links: linkSummary(links),
    leetcodeContest: links.leetcode?.data?.contest || null,
    leetcodeAbout: links.leetcode?.data?.about || '',
    lcAvatar: u.avatar || '',
  };

  const activity = { leetcode: lastDays(lcDays, today), log: lastDays(logMap, today, (v) => v) };
  const [cfDays, ghMap] = await Promise.all([
    links.codeforces ? loadDays(u.username, ['codeforces']) : null,
    links.github ? ghDayMap(u.username) : null,
  ]);
  if (cfDays) {
    out.codeforces = {
      handle: links.codeforces.handle, ...links.codeforces.data,
      lastSynced: links.codeforces.lastSynced, syncError: links.codeforces.syncError,
      ...(await platformStats(u.username, cfDays, today, ['codeforces'])), ratingHist: ratingHistogram(cfDays),
    };
    activity.codeforces = lastDays(cfDays, today);
  }
  if (ghMap) {
    out.github = githubStats(u.username, links.github, today, ghMap);
    activity.github = lastDays(ghMap, today, (v) => v);
  }
  out.activity = activity;
  return out;
}

export async function feed(limit = 25, usernames = null) {
  if (usernames && !usernames.length) return [];
  const filter = usernames ? `AND s.username IN (${usernames.map(() => '?').join(',')})` : '';
  const rows = await db.all(`
    SELECT s.username, s.slug, s.ts, s.platform, s.title AS stitle, q.title, q.difficulty, u.avatar, a.updated_at AS custom_at
    FROM submissions s JOIN users u ON u.username = s.username
    LEFT JOIN avatars a ON a.username = s.username
    LEFT JOIN questions q ON q.slug = s.slug
    WHERE s.status = 'Accepted' ${filter} ORDER BY s.ts DESC LIMIT 200`, ...(usernames || []));
  const seen = new Set(), out = [];
  for (const r of rows) {
    const k = `${r.username}|${r.slug}|${dayOf(r.ts)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      username: r.username, avatar: avatarUrl(r.username, r.avatar, r.custom_at), slug: r.slug, platform: r.platform,
      title: r.title || r.stitle, difficulty: r.difficulty || 'Unknown', ts: r.ts,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function allUsers() {
  return db.all('SELECT * FROM users ORDER BY added_at');
}
