const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const PALETTE = ['#ff6b9d', '#4d96ff', '#3ddc97', '#ffc93c', '#9b5de5', '#ff9f45', '#26c6da', '#ff5d73'];
const PERIODS = [['today', 'Today'], ['week', '7 days'], ['month', '30 days'], ['all', 'All time']];
const I = {
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  trendUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  trendDown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  bars: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  equal: '<path d="M5 9h14M5 15h14"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  thumb: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const hi = (n, bg) => `<span class="hico" style="background:${bg}">${icon(n)}</span>`;
const MEDALS = [1, 2, 3].map((n) => icon('award', `medal-ic m${n}`));

let period = 'week';
let timer = null;

/* ---------- helpers ---------- */
const auth = { token: null, username: null, avatar: '', unread: 0 };
try { auth.token = localStorage.getItem('ls_token'); auth.username = localStorage.getItem('ls_user'); } catch {}
function setAuth(token, username) {
  auth.token = token; auth.username = username; auth.avatar = ''; auth.unread = 0;
  try {
    if (token) { localStorage.setItem('ls_token', token); localStorage.setItem('ls_user', username); }
    else { localStorage.removeItem('ls_token'); localStorage.removeItem('ls_user'); }
  } catch {}
}
async function refreshMe() {
  try { const me = await api('/api/me'); auth.avatar = me.avatar || ''; } catch { /* signed out */ }
  renderNav();
  refreshUnread();
}
async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth.token) headers.authorization = `Bearer ${auth.token}`;
  const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth.token && (path.startsWith('/api/groups') || path === '/api/me')) { setAuth(null, null); renderNav(); }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
function ago(ts) {
  if (!ts) return 'never';
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 86400 / 30)}mo ago`;
}
const diffClass = (d) => (d || 'unknown').toLowerCase();
const diffChip = (d) => `<span class="chip ${diffClass(d)}">${esc(d === 'Unknown' ? '?' : d)}</span>`;
const initial = (u) => esc((u || '?')[0].toUpperCase());
const avatar = (u, size = false) => {
  const cls = `avatar${size === 'mini' ? ' mini' : size ? ' lg' : ''}`;
  const color = PALETTE[[...u.username].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  const src = u.avatar || '';
  if ((/^https:\/\//.test(src) || src.startsWith('/api/avatar/')) && !src.includes('default_avatar'))
    return `<img class="${cls}" src="${esc(src)}" alt="" data-fallback="${initial(u.username)}" data-color="${color}" loading="lazy">`;
  return `<span class="${cls}" style="background:${color}">${initial(u.username)}</span>`;
};
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t.tagName === 'IMG' && t.dataset.fallback) {
    const span = document.createElement('span');
    span.className = t.className; span.style.background = t.dataset.color; span.textContent = t.dataset.fallback;
    t.replaceWith(span);
  }
}, true);
const dayLabel = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthLabel = (m, long = true) => new Date(m + '-01T00:00:00Z').toLocaleDateString(undefined, { month: long ? 'long' : 'short', timeZone: 'UTC' });
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const lcLink = (slug) => `https://leetcode.com/problems/${encodeURIComponent(slug)}/`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200);
}
function confetti() {
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.cssText = `left:${Math.random() * 100}vw;background:${PALETTE[i % PALETTE.length]};animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * .4}s;border-radius:${Math.random() > .5 ? '50%' : '2px'};transform:rotate(${Math.random() * 360}deg)`;
    document.body.append(c);
    setTimeout(() => c.remove(), 4000);
  }
}

/* ---------- charts (inline SVG) ---------- */
function sparkline(vals) {
  const max = Math.max(1, ...vals), w = 7, gap = 3, h = 30;
  return `<svg class="spark" width="${vals.length * (w + gap)}" height="${h}" role="img" aria-label="Last 14 days activity">${vals.map((v, i) => {
    const bh = v ? Math.max(5, (v / max) * h) : 3;
    return `<rect class="${v ? '' : 'z'}" x="${i * (w + gap)}" y="${h - bh}" width="${w}" height="${bh}" rx="2"><title>${v} solved</title></rect>`;
  }).join('')}</svg>`;
}

function donut(t) {
  const parts = [['Easy', t.easy, 'var(--easy)'], ['Medium', t.medium, 'var(--medium)'], ['Hard', t.hard, 'var(--hard)']];
  const total = Math.max(1, t.easy + t.medium + t.hard), R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map(([n, v, col]) => {
    const len = (v / total) * C;
    const el = v ? `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${col}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${n}: ${v}</title></circle>` : '';
    off += len; return el;
  }).join('');
  return `<div class="donut-wrap"><svg width="170" height="170" viewBox="0 0 140 140" role="img" aria-label="Solved by difficulty">
    <circle r="${R}" cx="70" cy="70" fill="none" stroke="#f1edf9" stroke-width="22"/>${arcs}
    <circle r="${R + 11}" cx="70" cy="70" fill="none" stroke="#1d1b3a" stroke-width="2.5"/><circle r="${R - 11}" cx="70" cy="70" fill="none" stroke="#1d1b3a" stroke-width="2.5"/>
    <text x="70" y="72" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="#1d1b3a">${t.all ?? total}</text>
    <text x="70" y="88" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="10" fill="#6b6889">SOLVED</text></svg>
    <div class="legend">${parts.map(([n, v, col]) => `<div><i style="background:${col}"></i>${n}<span>${v}</span></div>`).join('')}</div></div>`;
}

function heatmap(days, today, { unit = 'problem', theme = 'leetcode', detail = null } = {}) {
  const vals = Object.values(days).filter((n) => n > 0).sort((x, y) => x - y);
  const q = (p) => (vals.length ? vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] : 1);
  const q1 = q(0.25), q2 = q(0.5), q3 = q(0.75);
  const level = (n) => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
  const cell = 14, gap = 3, start = new Date(today + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 364);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // back to Sunday
  const todayD = new Date(today + 'T00:00:00Z');
  let x = 0, rects = '', months = '', lastMonth = -1, col = 0;
  for (let d = new Date(start); d <= todayD; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0 && d > start) col++;
    const key = d.toISOString().slice(0, 10), n = days[key] || 0;
    x = col * (cell + gap);
    if (dow === 0 && d.getUTCMonth() !== lastMonth && d.getUTCDate() <= 7) {
      months += `<text x="${x}" y="10">${monthLabel(key.slice(0, 7), false)}</text>`;
      lastMonth = d.getUTCMonth();
    }
    rects += `<rect class="l${level(n)}" x="${x}" y="${18 + dow * (cell + gap)}" width="${cell}" height="${cell}" rx="4"><title>${dayLabel(key)}: ${detail ? detail(key) : plural(n, unit)}</title></rect>`;
  }
  const w = (col + 1) * (cell + gap);
  return `<div class="hm-${theme}"><div class="heat-scroll"><svg class="heat" width="${w}" height="${18 + 7 * (cell + gap)}" role="img" aria-label="Activity over the past year">${months}${rects}</svg></div>
    <div class="heat-legend">Less ${[0, 1, 2, 3, 4].map((l) => `<i class="heat"><svg width="13" height="13" style="display:block;margin:-1px"><rect class="l${l}" width="13" height="13"/></svg></i>`).join('')} More</div></div>`;
}

function bars30(daily, today, unit = 'problem') {
  const W = 640, H = 170, pad = 22, max = Math.max(3, ...daily.map((d) => d.count));
  const bw = (W - 10) / daily.length;
  const bars = daily.map((d, i) => {
    const bh = d.count ? (d.count / max) * (H - pad - 14) : 4;
    const cls = d.count ? (d.day === today ? 'b today' : 'b') : 'b z';
    const label = d.count ? `<text x="${i * bw + bw / 2 + 2}" y="${H - pad - bh - 4}" text-anchor="middle">${d.count}</text>` : '';
    return `<rect class="${cls}" x="${i * bw + 4}" y="${H - pad - bh}" width="${bw - 4}" height="${bh}" rx="5"><title>${dayLabel(d.day)}: ${plural(d.count, unit)}</title></rect>${label}`;
  }).join('');
  const ticks = [0, 7, 14, 21, 29].map((i) => `<text x="${i * bw + bw / 2 + 2}" y="${H - 5}" text-anchor="middle">${dayLabel(daily[i].day)}</text>`).join('');
  return `<svg class="bars-30 axis" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Problems solved per day, last 30 days">${bars}${ticks}</svg>`;
}

function hbars(list, empty = 'Nothing here yet — go solve something!') {
  if (!list.length) return `<p class="muted">${empty}</p>`;
  const max = list[0].count;
  return list.map((t, i) => `<div class="hbar"><span class="nm" title="${esc(t.name)}">${esc(t.name)}</span>
    <div class="track"><div class="fill" style="width:${(t.count / max) * 100}%;background:${PALETTE[i % PALETTE.length]};animation-delay:${i * 40}ms"></div></div><span class="n">${t.count}</span></div>`).join('');
}

/* ---------- home ---------- */
let source = 'overall'; // which platform(s) the leaderboard ranks
const SOURCES = [['overall', 'Overall'], ['leetcode', 'LeetCode'], ['codeforces', 'Codeforces'], ['github', 'GitHub']];
const modeOf = (u) => u.modes[source];
const ptsLabel = (e) => modeOf(e).periods[period].points;
const isSyncing = (users) => users.some((u) => u.sync.state === 'syncing' || u.sync.state === 'queued');

let rerender = null; // re-renders the current leaderboard view (used by the period tabs)

// Tabs + podium + ranked rows + live feed. Shared by the global board and squad boards.
function boardHtml(allUsers, feedList, { syncing = false, below = '' } = {}) {
  const ranked = allUsers.filter((u) => u.modes[source]);
  const hidden = allUsers.length - ranked.length;
  const users = [...ranked].sort((a, b) =>
    ptsLabel(b) - ptsLabel(a) || modeOf(b).periods[period].count - modeOf(a).periods[period].count || b.totals.all - a.totals.all);
  const gh = source === 'github';

  const tabs = `<div class="tabrow"><div class="tabs" role="tablist">${PERIODS.map(([k, l]) => `<button class="tab" role="tab" data-period="${k}" aria-selected="${k === period}">${l}</button>`).join('')}</div>
    <div class="tabs srctabs" role="tablist" aria-label="Platform">${SOURCES.map(([k, l]) => `<button class="tab" role="tab" data-source="${k}" aria-selected="${k === source}">${l}</button>`).join('')}</div></div>`;
  const podUsers = users.slice(0, 3).filter((u) => ptsLabel(u) > 0 || users.length <= 3);
  const podium = podUsers.length ? `<div class="podium">${podUsers.map((u, i) => `
    <a class="pod p${i + 1}" href="/u/${encodeURIComponent(u.username)}" data-link>
      <span class="medal">${MEDALS[i]}</span>${avatar(u)}<div class="nm">${esc(u.name || u.username)}</div>
      <div class="pts">${ptsLabel(u)}<small>${gh ? 'contribs' : 'pts'}</small></div>
      <div class="sub">${gh ? 'past ' + (period === 'all' ? 'year' : PERIODS.find((x) => x[0] === period)[1]) : plural(modeOf(u).periods[period].count, 'problem')}</div></a>`).join('')}</div>` : '';

  const rows = users.map((u, i) => {
    const m = modeOf(u), p = m.periods[period];
    const cfi = u.links?.codeforces;
    const chips = gh ? `<span class="chip gh">${plural(p.count, 'contribution')}</span>`
      : `<span class="chip easy">${p.easy}E</span><span class="chip medium">${p.medium}M</span><span class="chip hard">${p.hard}H</span>`;
    const cfChip = cfi?.rating && (source === 'overall' || source === 'codeforces')
      ? `<span class="chip" style="border-color:${cfColor(cfi.rank)};color:${cfColor(cfi.rank)}" title="Codeforces rating">CF ${cfi.rating}</span>` : '';
    const totalLabel = gh ? `${m.periods.all.count.toLocaleString()} / yr` : source === 'leetcode' ? `${u.totals.all} total` : `${m.periods.all.count} total`;
    return `<a class="row" href="/u/${encodeURIComponent(u.username)}" data-link style="animation-delay:${i * 50}ms">
      <div class="rank">${i < 3 && ptsLabel(u) > 0 ? MEDALS[i] : i + 1}</div>${avatar(u)}
      <div class="who"><div class="nm">${esc(u.name || u.username)}${m.activeToday ? '<span class="dot" title="Active today"></span>' : ''}
        <span class="handle">@${esc(u.username)}</span></div>
        <div class="chips">${chips}${cfChip}
        ${m.hotTopic ? `<span class="chip topic">${icon('target')} ${esc(m.hotTopic)}</span>` : ''}</div></div>
      <div class="right">${sparkline(m.spark)}
        <span class="flame ${m.streak ? '' : 'cold'}" title="Current streak">${icon('flame')} ${m.streak}</span>
        <div class="score"><b>${p.points}</b><small>${totalLabel}</small></div></div></a>`;
  }).join('');

  const feed = feedList.length ? feedList.map((f) => `<a href="/u/${encodeURIComponent(f.username)}" data-link>${avatar(f)}
    <div><div class="t"><b>${esc(f.username)}</b> solved <b>${esc(f.title)}</b> ${diffChip(f.difficulty)}${f.platform === 'codeforces' ? '<span class="chip cfc">CF</span>' : ''}</div><div class="ago">${ago(f.ts)}</div></div></a>`).join('')
    : '<p class="muted">No activity yet.</p>';

  const note = source === 'overall' ? 'Overall = LeetCode + Codeforces problem points (GitHub has its own tab).'
    : source === 'github' ? 'Ranked by GitHub contributions.' : '';
  return `<div class="layout"><section>${tabs}
    ${note || hidden ? `<p class="muted fine" style="margin:-6px 0 14px">${note}${hidden ? ` ${plural(hidden, 'friend')} ${hidden === 1 ? 'hasn’t' : 'haven’t'} linked ${SRC_LABEL[source]} yet.` : ''}</p>` : ''}
    ${ranked.length ? podium + `<div class="rows">${rows}</div>` : `<div class="card empty"><span class="big">${icon('users')}</span><h3>Nobody has linked ${SRC_LABEL[source]} yet</h3><p class="muted">Link it from your profile to appear here.</p></div>`}
    ${syncing ? `<p class="muted" style="text-align:center">${icon('hourglass')} Fetching fresh data for some friends…</p>` : ''}${below}</section>
    <aside class="sticky"><div class="card"><h2>${hi('zap', '#fff3b0')} Live feed</h2><div class="feed">${feed}</div></div></aside></div>`;
}

// Combined daily activity for the last 14 days (today highlighted).
function pulseChart(vals) {
  const W = 320, H = 96, max = Math.max(3, ...vals), bw = W / vals.length;
  const bars = vals.map((v, i) => {
    const h = v ? Math.max(6, (v / max) * (H - 26)) : 4;
    return `<rect class="${i === vals.length - 1 ? 'today' : v ? 'b' : 'z'}" x="${i * bw + 3}" y="${H - 14 - h}" width="${bw - 6}" height="${h}" rx="4"><title>${i === vals.length - 1 ? 'Today' : `${vals.length - 1 - i}d ago`}: ${plural(v, 'problem')}</title></rect>`;
  }).join('');
  return `<svg class="pchart axis" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Problems solved per day, last 14 days">${bars}
    <text x="3" y="${H - 2}">14 days ago</text><text x="${W - 3}" y="${H - 2}" text-anchor="end">today</text></svg>`;
}

function renderHome(data) {
  rerender = () => renderHome(data);
  const todayCount = data.users.reduce((s, u) => s + u.modes.overall.periods.today.count, 0);
  const weekCount = data.users.reduce((s, u) => s + u.modes.overall.periods.week.count, 0);
  const bestStreak = Math.max(0, ...data.users.map((u) => u.modes.overall.streak));

  const spark = Array(14).fill(0);
  data.users.forEach((u) => u.modes.overall.spark.forEach((v, i) => { spark[i] += v; }));
  const leader = [...data.users].sort((x, y) => y.modes.overall.periods.week.points - x.modes.overall.periods.week.points)[0];
  const lp = leader?.modes.overall.periods.week.points || 0;
  const ctas = auth.username
    ? `<a class="btn btn-pink" href="/squads/mine" data-link>${icon('users')} Your squads</a><a class="btn btn-yellow" href="/forum" data-link>${icon('message')} Forum</a>`
    : `<button class="btn btn-pink" data-join data-mode="signup">${icon('plus')} Join the leaderboard</button><a class="btn btn-yellow" href="/forum" data-link>${icon('message')} Browse the forum</a>`;

  const hero = `<section class="hero herogrid">
    <div class="heroL"><h1>Who’s grinding <span class="hl">today</span>? <span class="wave">${icon('hand')}</span></h1>
      <p>Points scale with difficulty — about 1 for Easy up to 6 for Hard, more for rated monsters — on LeetCode and Codeforces. Solve more, climb higher, flex responsibly.</p>
      <div class="stats-strip">${ctas}</div></div>
    <aside class="card pulse" aria-label="Squad pulse"><h2>${hi('zap', '#fff3b0')} Squad pulse <small>everyone combined</small></h2>
      <div class="pnums"><div><b>${todayCount}</b><span>solved today</span></div><div><b>${weekCount}</b><span>this week</span></div><div><b>${bestStreak}</b><span>day best streak</span></div></div>
      ${pulseChart(spark)}
      ${lp > 0 ? `<a class="pleader" href="/u/${encodeURIComponent(leader.username)}" data-link>${icon('trophy')} ${avatar(leader, 'mini')}<span><b>${esc(leader.name || leader.username)}</b> leads this week · <b>${lp}</b> pts</span></a>`
        : '<p class="muted pleader">Nobody has points yet this week — be the first on the board.</p>'}</aside></section>`;

  if (!data.users.length) {
    app.innerHTML = hero + `<div class="card empty" style="margin-top:24px"><span class="big">${icon('users')}</span><h3>The leaderboard is empty!</h3>
      <p class="muted">Be the first to hop on the leaderboard.</p><button class="btn btn-pink" data-join data-mode="signup">${icon('plus')} Join LeetSquad</button></div>`;
    return;
  }
  app.innerHTML = hero + boardHtml(data.users, data.feed, { syncing: isSyncing(data.users) });
}

async function home() {
  app.innerHTML = '<div class="hero"><h1>Loading the leaderboard…</h1></div>' + '<div class="skeleton"></div>'.repeat(3);
  const load = async () => {
    const data = await api('/api/leaderboard');
    if (location.pathname === '/') renderHome(data);
    return data;
  };
  try {
    let data = await load();
    const poll = async () => {
      if (location.pathname !== '/') return;
      if (isSyncing(data.users)) { try { data = await load(); } catch {} }
      timer = setTimeout(poll, 4000);
    };
    timer = setTimeout(poll, 4000);
  } catch (e) { app.innerHTML = `<div class="card empty"><span class="big">${icon('alert')}</span><h3>Couldn’t load</h3><p class="muted">${esc(e.message)}</p></div>`; }
}

/* ---------- profile ---------- */
/* ---------- multi-platform helpers ---------- */
const SRC_LABEL = { all: 'All', leetcode: 'LeetCode', codeforces: 'Codeforces', github: 'GitHub' };
const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
const CF_COLOR = { newbie: '#808080', pupil: '#2a8f2a', specialist: '#03a89e', expert: '#2b4bff', 'candidate master': '#aa00aa', master: '#ff8c00', 'international master': '#ff8c00', grandmaster: '#e02020', 'international grandmaster': '#e02020', 'legendary grandmaster': '#e02020' };
const cfColor = (rank) => CF_COLOR[rank] || '#6b6889';
const cfLink = (slug) => {
  const m = /^cf:(\d+)([A-Za-z0-9]+)$/.exec(slug);
  return m ? `https://codeforces.com/${Number(m[1]) >= 100000 ? 'gym' : 'contest'}/${m[1]}/problem/${m[2]}` : 'https://codeforces.com/';
};
const problemLink = (slug) => (slug.startsWith('cf:') ? cfLink(slug) : lcLink(slug));
const monthYear = (ts) => new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
const signed = (n) => `${n > 0 ? '+' : ''}${n}`;

let profTab = 'leetcode';
let actSrc = 'all';

// Line chart of contest ratings (Codeforces draws its rank colour bands behind the line).
function ratingChart(points, { bands = false } = {}) {
  if (!points.length) return '<p class="muted">No rated contests yet.</p>';
  const W = 640, H = 300, L = 42, R = 14, T = 14, B = 26;
  const minX = Math.min(...points.map((p) => p.ts)), maxX = Math.max(...points.map((p) => p.ts)), spanX = Math.max(1, maxX - minX);
  const rs = points.map((p) => p.rating);
  const pad = Math.max(60, (Math.max(...rs) - Math.min(...rs)) * 0.1);
  const minR = Math.floor((Math.min(...rs) - pad) / 100) * 100, maxR = Math.ceil((Math.max(...rs) + pad) / 100) * 100;
  const x = (t) => (points.length === 1 ? (L + W - R) / 2 : L + ((t - minX) / spanX) * (W - L - R));
  const y = (r) => T + (1 - (r - minR) / (maxR - minR)) * (H - T - B);

  let bg = '';
  if (bands) {
    for (const [lo, hi, col] of [[0, 1200, '#d9d9d9'], [1200, 1400, '#c3ecc3'], [1400, 1600, '#bdf0ea'], [1600, 1900, '#c4ceff'], [1900, 2100, '#ebc6f3'], [2100, 2400, '#ffdfae'], [2400, 5000, '#ffbcbc']]) {
      const a = Math.max(lo, minR), b = Math.min(hi, maxR);
      if (b > a) bg += `<rect x="${L}" y="${y(b)}" width="${W - L - R}" height="${y(a) - y(b)}" fill="${col}" opacity=".75"/>`;
    }
  }
  const step = (maxR - minR) > 800 ? 200 : 100;
  let grid = '';
  for (let r = Math.ceil(minR / step) * step; r <= maxR; r += step)
    grid += `<line x1="${L}" x2="${W - R}" y1="${y(r)}" y2="${y(r)}" stroke="#1d1b3a" stroke-opacity=".12"/><text x="${L - 6}" y="${y(r) + 3}" text-anchor="end">${r}</text>`;
  const line = points.map((p) => `${x(p.ts).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const peak = points.reduce((a, b) => (b.rating > a.rating ? b : a));
  const dots = points.map((p) => `<circle cx="${x(p.ts).toFixed(1)}" cy="${y(p.rating).toFixed(1)}" r="${p === peak ? 5 : 3}" fill="${p === peak ? '#ffd23f' : '#fff'}" stroke="#1d1b3a" stroke-width="1.6"><title>${esc(p.label)} — ${p.rating}${p.sub ? ` (${esc(p.sub)})` : ''}</title></circle>`).join('');
  return `<svg class="axis" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Contest rating over time">${bg}${grid}
    <polyline points="${line}" fill="none" stroke="#1d1b3a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>${dots}
    <text x="${L}" y="${H - 6}">${monthYear(minX)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${monthYear(maxX)}</text></svg>`;
}

// Contest rating + recent contests. Works for Codeforces and LeetCode data.
function contestCards(kind, d) {
  let points, rows, head;
  if (kind === 'cf') {
    points = d.contests.map((c) => ({ ts: c.ts, rating: c.newRating, label: c.name, sub: `Rank ${c.rank} · ${signed(c.newRating - c.oldRating)}` }));
    rows = [...d.contests].reverse().slice(0, 8).map((c) => ({ name: c.name, rank: c.rank, delta: c.newRating - c.oldRating, rating: c.newRating, ts: c.ts }));
    head = '';
  } else {
    points = d.history.map((h) => ({ ts: h.ts, rating: h.rating, label: h.title, sub: `Rank ${h.rank}` }));
    rows = d.history.map((h, i) => ({ name: h.title, rank: h.rank, delta: i ? h.rating - d.history[i - 1].rating : null, rating: h.rating, ts: h.ts, solved: `${h.solved}/${h.total}` })).reverse().slice(0, 8);
    head = `<div class="minitiles lcc"><div><b>${d.rating}</b><span>rating</span></div><div><b>${d.attended}</b><span>contests</span></div>
      <div><b>${d.topPercentage != null ? `${d.topPercentage}%` : '—'}</b><span>top</span></div></div>
      ${d.badge ? `<p class="muted" style="margin:8px 0 0"><span class="chip">${icon('award')} ${esc(d.badge)}</span> Global rank #${(d.globalRanking || 0).toLocaleString()} of ${(d.totalParticipants || 0).toLocaleString()}</p>` : ''}`;
  }
  return `<div class="grid2">
    <section class="card"><h2>${hi('trendUp', '#d3f8e6')} ${kind === 'cf' ? 'Rating history' : 'Contest rating'}</h2>${head}${ratingChart(points, { bands: kind === 'cf' })}</section>
    <section class="card"><h2>${hi('trophy', '#fff3b0')} Recent contests</h2><div class="contests">${rows.length ? rows.map((r) => `
      <div class="crow"><div class="cn"><b>${esc(r.name)}</b><span class="muted">${monthYear(r.ts)} · rank ${r.rank.toLocaleString()}${r.solved ? ` · ${r.solved} solved` : ''}</span></div>
        <div class="cr">${r.delta != null ? `<span class="delta-${r.delta >= 0 ? 'up' : 'down'}">${signed(r.delta)}</span>` : ''}<b>${r.rating}</b></div></div>`).join('') : '<p class="muted">No contests yet.</p>'}</div></section></div>`;
}

// The solver stats cards shared by LeetCode and Codeforces.
function solverCards(s, { scope, donutTotals, today, note = '', side = '' }) {
  const diff = s.thisMonth.count - s.lastMonth.count;
  const maxWd = Math.max(1, ...s.weekdays);
  const wdNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `
  <div class="grid2">
    <section class="card"><h2>${hi('pie', '#ffd0e1')} By difficulty</h2>${donut(donutTotals)}${note ? `<p class="muted fine">${note}</p>` : ''}</section>
    <section class="card"><h2>${hi('bars', '#cfe0ff')} Last 30 days</h2>${bars30(s.daily, today)}</section>
  </div>
  <div class="grid2">
    <section class="card"><h2>${hi('target', '#e1d2ff')} Practicing lately
      <span class="seg" role="group" aria-label="Window"><button data-topics="week" data-scope="${scope}" aria-pressed="false">7d</button><button data-topics="recent" data-scope="${scope}" aria-pressed="true">30d</button><button data-topics="all" data-scope="${scope}" aria-pressed="false">All</button></span></h2>
      <div id="topics-${scope}">${hbars(s.topics.recent, 'No topic data for this window yet.')}</div></section>
    <section class="card"><h2>${hi('calendar', '#ffdcb8')} Month vs month</h2>
      <div class="vs"><div><div class="l">${monthLabel(s.lastMonth.label)}</div><div class="v">${s.lastMonth.count}</div>
        <div class="chips"><span class="chip easy">${s.lastMonth.easy}E</span><span class="chip medium">${s.lastMonth.medium}M</span><span class="chip hard">${s.lastMonth.hard}H</span></div></div>
        <div><div class="l">${monthLabel(s.thisMonth.label)} (so far)</div><div class="v">${s.thisMonth.count}</div>
        <div class="chips"><span class="chip easy">${s.thisMonth.easy}E</span><span class="chip medium">${s.thisMonth.medium}M</span><span class="chip hard">${s.thisMonth.hard}H</span></div></div></div>
      <p class="delta">${diff > 0 ? `${icon('rocket')} ${diff} more than last month — beast mode!` : diff === 0 ? `${icon('equal')} Level with last month.` : `${icon('trendDown')} ${-diff} behind last month’s total — still time to catch up!`}</p>
      <div style="margin-top:12px"><div class="muted" style="font-size:13px;margin-bottom:4px">Last 6 months</div>${monthsBars(s.months)}</div></section>
  </div>
  <div class="grid2">
    <section class="card"><h2>${hi('list', '#d3f8e6')} Recently solved</h2><div class="recent">${s.recent.length ? s.recent.map((r) => `
      <a href="${problemLink(r.slug)}" target="_blank" rel="noopener"><div><div class="tt">${r.fid ? esc(r.fid) + '. ' : ''}${esc(r.title)}</div>
        <div class="tp">${r.topics.slice(0, 3).map((t) => `<span class="chip topic">${esc(t)}</span>`).join('')}</div></div>
        <div class="when"><span class="chips">${diffChip(r.difficulty)}${r.rating ? `<span class="chip">${r.rating}</span>` : ''}</span><span>${ago(r.ts)}</span></div></a>`).join('') : '<p class="muted">Nothing yet.</p>'}</div></section>
    <div style="display:grid;gap:22px;align-content:start">
      ${side}
      <section class="card"><h2>${hi('trophy', '#fff3b0')} Overall topics</h2>${hbars(s.topics.all.slice(0, 8), 'No data yet.')}</section>
      <section class="card"><h2>${hi('clock', '#cfe0ff')} Favourite weekdays</h2><div class="wd">${s.weekdays.map((n, i) => `<div title="${n} solves"><span style="height:${(n / maxWd) * 100 - 20}%"></span>${wdNames[i]}</div>`).join('')}</div></section>
      ${s.langs.length ? `<section class="card"><h2>${hi('code', '#ffd0e1')} Languages</h2><div class="langs">${s.langs.map((l) => `<span class="chip">${esc(l.lang)} <b>${l.count}</b></span>`).join('')}</div></section>` : ''}
    </div>
  </div>`;
}

const tile = (k, v, s = '') => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;

const ratingColor = (r) => cfColor(r < 1200 ? 'newbie' : r < 1400 ? 'pupil' : r < 1600 ? 'specialist' : r < 1900 ? 'expert' : r < 2100 ? 'candidate master' : r < 2400 ? 'master' : 'grandmaster');
function ratingHistCard(hist, note = '') {
  if (!hist?.length) return '';
  const max = Math.max(1, ...hist.map((h) => h.count));
  return `<section class="card"><h2>${hi('bars', '#cfe0ff')} Solved by problem rating</h2>
    <div class="rhist">${hist.map((h) => `<div title="${h.count} solved at ${h.rating}–${h.rating + 99}"><span style="height:${(h.count / max) * 100}%;background:${ratingColor(h.rating)}"></span><em>${h.rating % 200 === 0 ? h.rating : ''}</em></div>`).join('')}</div>
    ${note ? `<p class="muted fine">${note}</p>` : ''}</section>`;
}

// Same header for every platform tab: that platform's own picture, name, bio line, chips, and an optional rating block.
function platHead({ cls, av, title, url, color, sub = '', bio = '', chips = '', right = '', notice = '' }) {
  return `<section class="card cfhead ${cls}"><div class="ghav">${av}</div>
    <div class="cfmeta"><div class="cfname"><a href="${esc(url)}" target="_blank" rel="noopener"${color ? ` style="color:${color}"` : ''}>${esc(title)}</a>${sub ? ` <span class="muted" style="font-size:15px">${esc(sub)}</span>` : ''}</div>
      ${bio ? `<p class="muted bio">${esc(bio)}</p>` : ''}<div class="chips">${chips}</div>${notice}</div>${right}</section>`;
}
// Platform pictures can 404/503 (Codeforces' image CDN does at times), so fall back to an initial like every other avatar.
const imgAvatar = (src, fallback) => (src
  ? `<img class="avatar lg" src="${esc(src)}" alt="" loading="lazy" data-fallback="${initial(fallback)}" data-color="${PALETTE[[...fallback].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]}">`
  : avatar({ username: fallback, avatar: '' }, true));

function lcSection(p) {
  const acc = p.submissions.total ? Math.round((p.submissions.accepted / p.submissions.total) * 100) : null;
  const c = p.leetcodeContest;
  const head = platHead({
    cls: 'lchead', av: avatar({ username: p.username, avatar: p.lcAvatar }, true), title: p.name || p.username,
    url: `https://leetcode.com/u/${encodeURIComponent(p.username)}/`, sub: `@${p.username}`, bio: p.leetcodeAbout,
    chips: `${p.ranking ? `<span class="chip">${icon('globe')} Global rank #${p.ranking.toLocaleString()}</span>` : ''}
      <span class="chip easy">${p.totals.easy} Easy</span><span class="chip medium">${p.totals.medium} Medium</span><span class="chip hard">${p.totals.hard} Hard</span>
      ${c ? `<span class="chip">${plural(c.attended, 'contest')}</span>${c.topPercentage != null ? `<span class="chip">Top ${c.topPercentage}%</span>` : ''}` : ''}`,
    right: c ? `<div class="cfrating lcrating"><div class="big">${c.rating}</div><div class="rk">${esc(c.badge || 'Contest rating')}</div></div>` : '',
  });
  return `${head}<section class="tiles">
    ${tile('Total solved', p.totals.all, `${p.totals.easy}E · ${p.totals.medium}M · ${p.totals.hard}H`)}
    ${tile('Today', p.periods.today.count, `${p.periods.today.points} pts`)}
    ${tile('Last 7 days', p.periods.week.count, `${p.periods.week.points} pts`)}
    ${tile('Last 30 days', p.periods.month30.count, `${p.periods.month30.points} pts`)}
    ${tile('Best day', p.best.count, p.best.day ? dayLabel(p.best.day) : '—')}
    ${tile('Acceptance', acc === null ? '—' : acc + '%', `${p.submissions.total} submissions`)}
  </section>
  ${p.leetcodeContest ? contestCards('lc', p.leetcodeContest) : ''}
  ${solverCards(p, { scope: 'lc', donutTotals: p.totals, today: p.today, side: ratingHistCard(p.ratingHist, 'Ratings come from clist.by and exist for contest-era problems only.') })}`;
}

function cfSection(p) {
  const cf = p.codeforces, i = cf.info || {};
  const acc = cf.submissions.total ? Math.round((cf.submissions.accepted / cf.submissions.total) * 100) : null;
  const last = cf.contests[cf.contests.length - 1];
  const bestRank = cf.contests.length ? Math.min(...cf.contests.map((c) => c.rank)) : null;
  const hist = ratingHistCard(cf.ratingHist);
  const where = [i.city, i.country].filter(Boolean).join(', ');
  const head = platHead({
    cls: 'cfh', av: imgAvatar((i.titlePhoto || '').replace('userpic.codeforces.org', 'cdn-userpic.codeforces.com'), cf.handle), title: cf.handle, url: `https://codeforces.com/profile/${encodeURIComponent(cf.handle)}`, color: cfColor(i.rank),
    bio: [i.name, where, i.organization].filter(Boolean).join(' · '),
    chips: `${i.maxRating ? `<span class="chip">Max <b style="color:${cfColor(i.maxRank)}">${i.maxRating}</b> · ${esc(titleCase(i.maxRank))}</span>` : ''}
      ${i.friendOfCount ? `<span class="chip">${i.friendOfCount.toLocaleString()} friends</span>` : ''}${i.registered ? `<span class="chip">Joined ${new Date(i.registered * 1000).getFullYear()}</span>` : ''}`,
    right: `<div class="cfrating" style="color:${cfColor(i.rank)}"><div class="big">${i.rating ?? '—'}</div><div class="rk">${i.rank ? titleCase(i.rank) : 'Unrated'}</div></div>`,
    notice: cf.syncError ? `<div class="notice warn" style="margin-top:10px">${icon('alert')} Last Codeforces sync failed: ${esc(cf.syncError)}</div>` : '',
  });
  return `
  ${head}
  <section class="tiles">
    ${tile('Problems solved', cf.derived.count, `${cf.derived.easy}E · ${cf.derived.medium}M · ${cf.derived.hard}H`)}
    ${tile('Today', cf.periods.today.count, `${cf.periods.today.points} pts`)}
    ${tile('Last 7 days', cf.periods.week.count, `${cf.periods.week.points} pts`)}
    ${tile('Last 30 days', cf.periods.month30.count, `${cf.periods.month30.points} pts`)}
    ${tile('Contests', cf.contests.length, bestRank ? `best rank #${bestRank.toLocaleString()}` : 'none yet')}
    ${tile('Last contest', last ? signed(last.newRating - last.oldRating) : '—', last ? `now ${last.newRating}` : '')}
    ${tile('Acceptance', acc === null ? '—' : acc + '%', `${cf.submissions.total} submissions`)}
  </section>
  ${contestCards('cf', cf)}
  ${solverCards(cf, { scope: 'cf', donutTotals: { ...cf.derived, all: cf.derived.count }, today: p.today, note: 'Buckets use problem rating: Easy ≤ 1300, Medium ≤ 1900, Hard above. Points follow the rating itself; unrated or gym problems count as 1 point.', side: hist })}`;
}

function ghSection(p) {
  const g = p.github, pr = g.profile || {};
  const diff = g.thisMonth - g.lastMonth;
  const head = platHead({
    cls: 'ghhead', av: imgAvatar(pr.avatar, g.handle), title: pr.name || g.handle, url: `https://github.com/${encodeURIComponent(g.handle)}`, sub: `@${g.handle}`, bio: pr.bio,
    chips: `<span class="chip">${(pr.publicRepos ?? 0).toLocaleString()} repos</span><span class="chip">${(pr.followers ?? 0).toLocaleString()} followers</span>${pr.createdAt ? `<span class="chip">Joined ${new Date(pr.createdAt).getFullYear()}</span>` : ''}`,
    notice: g.syncError ? `<div class="notice warn" style="margin-top:10px">${icon('alert')} Last GitHub sync failed: ${esc(g.syncError)}</div>` : '',
  });
  const maxWd = Math.max(1, ...g.weekdays);
  const wdNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `
  ${head}
  <section class="tiles">
    ${tile('Past year', g.total365.toLocaleString(), 'contributions')}
    ${tile('Active days', g.activeDays365, 'out of 365')}
    ${tile('Current streak', g.streak.current, 'days')}
    ${tile('Longest streak', g.streak.longest, 'days (past year)')}
    ${tile('Last 30 days', g.periods.month30, `${g.periods.week} this week`)}
    ${tile('Best day', g.best.count, g.best.day ? dayLabel(g.best.day) : '—')}
  </section>
  <div class="grid2">
    <section class="card"><h2>${hi('bars', '#cfe0ff')} Last 30 days</h2>${bars30(g.daily, p.today, 'contribution')}</section>
    <section class="card"><h2>${hi('calendar', '#ffdcb8')} Month vs month</h2>
      <div class="vs"><div><div class="l">Last month</div><div class="v">${g.lastMonth}</div></div><div><div class="l">This month (so far)</div><div class="v">${g.thisMonth}</div></div></div>
      <p class="delta">${diff > 0 ? `${icon('rocket')} ${diff} more than last month` : diff === 0 ? `${icon('equal')} Level with last month.` : `${icon('trendDown')} ${-diff} behind last month’s total.`}</p>
      <div style="margin-top:12px"><div class="muted" style="font-size:13px;margin-bottom:4px">Last 6 months</div>${monthsBars(g.months)}</div></section>
  </div>
  <div class="grid2">
    <section class="card"><h2>${hi('code', '#e1d2ff')} Recently active repos <small>30 days</small></h2>${g.repos?.length ? `<div class="contests">${g.repos.map((r) => `
      <a class="crow" href="https://github.com/${esc(r.name)}" target="_blank" rel="noopener"><div class="cn"><b>${esc(r.name)}</b><span class="muted">last active ${ago(r.lastTs)}</span></div><div class="cr"><b>${r.events}</b><span class="muted">events</span></div></a>`).join('')}</div>`
      : '<p class="muted">No public repo activity in the last 30 days.</p>'}</section>
    <section class="card"><h2>${hi('list', '#d3f8e6')} Recent activity</h2>${g.events?.length ? `<div class="contests">${g.events.slice(0, 10).map((e) => `
      <a class="crow" href="https://github.com/${esc(e.repo)}" target="_blank" rel="noopener"><div class="cn"><b>${esc(e.label)}</b><span class="muted">${esc(e.repo)}</span></div><div class="cr"><span class="muted">${ago(e.ts)}</span></div></a>`).join('')}</div>`
      : '<p class="muted">No recent public events.</p>'}</section>
  </div>
  <section class="card" style="margin-bottom:22px"><h2>${hi('clock', '#cfe0ff')} Favourite weekdays</h2><div class="wd">${g.weekdays.map((n, i) => `<div title="${n} contributions"><span style="height:${(n / maxWd) * 100 - 20}%"></span>${wdNames[i]}</div>`).join('')}</div></section>`;
}

// Year heatmap with a source selector (All = LeetCode + Codeforces + GitHub + your logged activity).
function activityCard(p) {
  const A = p.activity;
  const avail = ['all', 'leetcode', ...(A.codeforces ? ['codeforces'] : []), ...(A.github ? ['github'] : [])];
  if (!avail.includes(actSrc)) actSrc = 'all';
  const names = { leetcode: 'LeetCode', codeforces: 'Codeforces', github: 'GitHub', log: 'Logged' };
  const units = { leetcode: 'problem', codeforces: 'problem', github: 'contribution', log: 'entry' };
  const used = actSrc === 'all' ? ['leetcode', 'codeforces', 'github', 'log'].filter((k) => A[k]) : [actSrc];
  const merged = {};
  for (const k of used) for (const [d, n] of Object.entries(A[k])) merged[d] = (merged[d] || 0) + n;

  const total = Object.values(merged).reduce((a, b) => a + b, 0);
  const days = Object.keys(merged).sort();
  let current = 0, d = merged[p.today] ? p.today : addDays(p.today, -1);
  while (merged[d]) { current++; d = addDays(d, -1); }
  let longest = 0, run = 0, prev = null;
  for (const day of days) { run = prev && addDays(prev, 1) === day ? run + 1 : 1; longest = Math.max(longest, run); prev = day; }

  const detail = actSrc === 'all' ? (day) => used.filter((k) => A[k][day]).map((k) => `${names[k]} ${A[k][day]}`).join(' · ') || 'No activity' : null;
  const unit = actSrc === 'all' ? 'activity' : units[actSrc];
  return `<section class="card wide"><h2>${hi('calendar', '#bff2da')} Activity
      <span class="seg" role="group" aria-label="Activity source">${avail.map((k) => `<button data-actsrc="${k}" aria-pressed="${k === actSrc}">${SRC_LABEL[k]}</button>`).join('')}</span></h2>
    <div class="actstats"><span><b>${total.toLocaleString()}</b> ${total === 1 ? (unit === 'activity' ? 'activity' : unit) : (unit === 'activity' ? 'activities' : unit + 's')} in the past year</span>
      <span><b>${days.length}</b> active days</span><span><b>${current}</b>-day current streak</span><span><b>${longest}</b>-day longest</span></div>
    ${heatmap(merged, p.today, { unit, theme: actSrc, detail })}
    ${actSrc === 'all' ? `<p class="muted fine" style="margin:8px 0 0">Combines ${used.map((k) => names[k]).join(', ')}.</p>` : ''}</section>`;
}

function openLinksModal(p) {
  const { close, el } = showModal(`<h2>Link your accounts</h2>
    <p class="muted" style="margin:0">Add Codeforces and GitHub to see ratings, contests and commit activity on your profile. We only read public data. Leave a field empty (and save) to unlink it.</p>
    <form autocomplete="off" id="links-form">
      <div class="field"><label for="k-cf">Codeforces handle</label><input id="k-cf" name="codeforces" maxlength="24" placeholder="e.g. tourist" value="${esc(p.links?.codeforces?.handle || '')}"></div>
      <div class="field"><label for="k-gh">GitHub username</label><input id="k-gh" name="github" maxlength="39" placeholder="e.g. torvalds" value="${esc(p.links?.github?.handle || '')}"></div>
      <div class="privacy">${icon('lock')} Handles aren’t verified as yours, so be honest — everyone in your squads sees them. Data refreshes automatically (GitHub about hourly).</div>
      <div class="err" hidden></div>
      <div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="k-go">Save</button></div></form>`);
  el.querySelector('#k-cf').focus();
  el.querySelector('#links-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('#k-go'), err = el.querySelector('.err'), f = e.target;
    btn.disabled = true; btn.textContent = 'Checking…'; err.hidden = true;
    try {
      await api('/api/me/links', { method: 'PUT', body: { codeforces: f.elements.codeforces.value, github: f.elements.github.value } });
      close(); toast('Saved — pulling your data…'); profilePage(p.username);
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Save'; }
  });
}

let currentProfile = null;
function renderProfile(p) {
  currentProfile = p;
  const s = p.sync, syncing = s.state === 'syncing' || s.state === 'queued';
  const own = ownsProfile(p);
  const partial = !p.sessionOk
    ? `<div class="notice warn">${icon('alert')} This session cookie has expired, so only the 20 most recent LeetCode solves are visible. <a href="#" data-join data-mode="signup">Re-add yourself</a> with a fresh cookie to restore full history.</div>` : '';
  const err = p.syncError && !syncing ? `<div class="notice warn">Last sync hiccup: ${esc(p.syncError)}</div>` : '';
  const syncMsg = syncing ? `<div class="notice">${icon('hourglass')} ${esc(s.message || 'Syncing…')}</div>` : '';
  const cta = own && !p.codeforces && !p.github ? `<div class="notice">${icon('plus')} Add your <b>Codeforces</b> and <b>GitHub</b> to see ratings, contests and commits here too. <a href="#" data-act="links">Link accounts</a></div>` : '';

  const avail = ['leetcode', ...(p.codeforces ? ['codeforces'] : []), ...(p.github ? ['github'] : [])];
  if (!avail.includes(profTab)) profTab = 'leetcode';
  const tabs = avail.length > 1 ? `<div class="tabs maintabs" role="tablist" style="margin-top:6px">${avail.map((k) => `<button class="tab" role="tab" data-ptab="${k}" aria-selected="${k === profTab}">${SRC_LABEL[k]}</button>`).join('')}</div>` : '';
  const body = profTab === 'codeforces' ? cfSection(p) : profTab === 'github' ? ghSection(p) : lcSection(p);
  const cfi = p.codeforces?.info;

  app.innerHTML = `
  <a class="back" href="/" data-link>← Back to leaderboard</a>
  <section class="card banner">${avatar(p, true)}
    <div><h1>${esc(p.name || p.username)}</h1><div class="muted">@${esc(p.username)}</div>
      <div class="meta"><span class="flame ${p.streak.current ? '' : 'cold'}">${icon('flame')} ${plural(p.streak.current, 'day')} streak</span>
        ${p.ranking ? `<span class="chip">${icon('globe')} Rank #${p.ranking.toLocaleString()}</span>` : ''}
        <span class="chip">${icon('award')} Longest streak ${p.streak.longest}d</span>
        ${cfi?.rating ? `<span class="chip" style="border-color:${cfColor(cfi.rank)};color:${cfColor(cfi.rank)}">CF ${cfi.rating}</span>` : ''}
        ${p.github ? `<span class="chip">${p.github.total365.toLocaleString()} GitHub contributions</span>` : ''}</div></div>
    <div class="actions"><div class="extlinks">
        <a class="btn btn-yellow btn-small" href="https://leetcode.com/u/${encodeURIComponent(p.username)}/" target="_blank" rel="noopener">LeetCode ↗</a>
        ${p.links?.codeforces ? `<a class="btn btn-blue btn-small" href="https://codeforces.com/profile/${encodeURIComponent(p.links.codeforces.handle)}" target="_blank" rel="noopener">Codeforces ↗</a>` : ''}
        ${p.links?.github ? `<a class="btn btn-purple btn-small" href="https://github.com/${encodeURIComponent(p.links.github.handle)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}</div>
      ${own ? `<button class="btn btn-small" data-act="f-share">${icon('message')} Share progress</button><button class="btn btn-small" data-act="photo">${icon('camera')} Change photo</button><button class="btn btn-small" data-act="links">${icon('plus')} ${p.codeforces || p.github ? 'Edit' : 'Link'} accounts</button>` : ''}
      <button class="btn btn-small" id="refresh" ${syncing ? 'disabled' : ''}>${icon('refresh')} Refresh</button>
      <span class="muted" style="font-size:12px">synced ${ago(p.lastSynced)}</span></div>
  </section>${syncMsg}${partial}${err}${cta}

  ${activityCard(p)}
  ${logCard(p)}
  ${tabs}
  ${body}

  <div class="danger"><button class="btn btn-ghost btn-small" data-remove>Remove me from LeetSquad</button></div>`;

  $('#refresh')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { await api(`/api/users/${encodeURIComponent(p.username)}/refresh`, { method: 'POST' }); toast('Refreshing…'); pollProfile(p.username); }
    catch (er) { toast(er.message); e.target.disabled = false; }
  });
  document.querySelectorAll('[data-topics]').forEach((b) => b.addEventListener('click', () => {
    const sc = b.dataset.scope, st = sc === 'cf' ? p.codeforces : p;
    document.querySelectorAll(`[data-topics][data-scope="${sc}"]`).forEach((x) => x.setAttribute('aria-pressed', x === b));
    $(`#topics-${sc}`).innerHTML = hbars(st.topics[b.dataset.topics], 'No topic data for this window yet.');
  }));
  $('[data-remove]')?.addEventListener('click', () => openModal('remove', p.username));
}

function monthsBars(months) {
  const max = Math.max(1, ...months.map((m) => m.count)), W = 300, H = 90, bw = W / months.length;
  return `<svg class="axis" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Problems per month">${months.map((m, i) => {
    const bh = m.count ? Math.max(4, (m.count / max) * (H - 36)) : 4;
    return `<rect x="${i * bw + 8}" y="${H - 16 - bh}" width="${bw - 16}" height="${bh}" rx="6" fill="${i === months.length - 1 ? '#ffd23f' : '#b79cf0'}" stroke="#1d1b3a" stroke-width="1.5"><title>${monthLabel(m.month)}: ${m.count}</title></rect>
      <text x="${i * bw + bw / 2}" y="${H - 3}" text-anchor="middle">${monthLabel(m.month, false)}</text>
      ${m.count ? `<text x="${i * bw + bw / 2}" y="${H - 20 - bh}" text-anchor="middle" style="font-size:11px;fill:#1d1b3a">${m.count}</text>` : ''}`;
  }).join('')}</svg>`;
}

async function profilePage(username) {
  app.innerHTML = '<div class="skeleton"></div>'.repeat(4);
  try {
    const p = await api(`/api/users/${encodeURIComponent(username)}`);
    renderProfile(p);
    if (p.sync.state === 'syncing' || p.sync.state === 'queued') pollProfile(username);
  } catch (e) {
    app.innerHTML = `<div class="card empty" style="margin-top:24px"><span class="big">${icon('search')}</span><h3>${esc(e.message)}</h3><a class="btn btn-yellow" href="/" data-link>Back home</a></div>`;
  }
}
function pollProfile(username) {
  clearTimeout(timer);
  const tick = async () => {
    if (location.pathname !== `/u/${encodeURIComponent(username)}`) return;
    try {
      const p = await api(`/api/users/${encodeURIComponent(username)}`);
      renderProfile(p);
      if (p.sync.state === 'syncing' || p.sync.state === 'queued') timer = setTimeout(tick, 2500);
    } catch { timer = setTimeout(tick, 5000); }
  };
  timer = setTimeout(tick, 1500);
}

/* ---------- modal ---------- */
function openModal(mode = 'join', username = '', onDone = null, ctx = {}) {
  const remove = mode === 'remove';
  let tab = mode === 'signup' ? 'signup' : 'signin';
  const root = $('#modal-root');
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();

  const render = () => {
    const signin = !remove && tab === 'signin';
    const label = remove ? 'Remove me' : signin ? 'Sign in' : 'Create account';
    const heading = remove ? 'Leave LeetSquad' : signin ? ctx.title || 'Sign in' : 'Create your account';
    const blurb = remove ? 'Prove it’s you with your session cookie and we’ll delete your data and stored cookie.'
      : signin ? ctx.text || 'Welcome back! Sign in with your username and password. If you were here before passwords existed, your password is your username.'
        : 'Enter your LeetCode username and cookies once to prove it’s you, then pick a password. After that you only need your username and password on any device. Already on the leaderboard but forgot your password? Do the same here to reset it.';
    const user = $('#f-user')?.value ?? username;
    root.innerHTML = `<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
    ${remove ? '' : `<div class="seg" style="margin:0 0 12px" role="tablist"><button type="button" role="tab" data-tab="signin" aria-pressed="${signin}">Sign in</button><button type="button" role="tab" data-tab="signup" aria-pressed="${!signin}">Create account</button></div>`}
    <h2 id="mt">${esc(heading)}</h2>
    <p class="muted" style="margin:0">${esc(blurb)}</p>
    <form id="join-form" autocomplete="off">
      <div class="field"><label for="f-user">${signin ? 'Username' : 'LeetCode username'}</label><input id="f-user" name="username" required maxlength="40" placeholder="e.g. neetcode" value="${esc(user)}" ${remove ? 'readonly' : ''} autocomplete="username"></div>
      ${signin ? `<div class="field"><label for="f-pass">Password</label><input id="f-pass" name="password" required type="password" maxlength="200" autocomplete="current-password"></div>` : `
      ${remove ? '' : `<div class="field"><label for="f-pass">Password</label><input id="f-pass" name="password" required type="password" minlength="8" maxlength="200" autocomplete="new-password"><small>At least 8 characters.</small></div>`}
      <div class="field"><label for="f-sess">LEETCODE_SESSION cookie</label><input id="f-sess" name="session" required type="password" placeholder="eyJ0eXAiOiJKV1Qi…" spellcheck="false"></div>
      <div class="field"><label for="f-csrf">csrftoken cookie <em>(recommended)</em></label><input id="f-csrf" name="csrf" type="password" placeholder="abc123…" spellcheck="false"></div>
      <details><summary>How do I find my cookies?</summary><ol>
        <li>Log in at <b>leetcode.com</b> in your browser.</li>
        <li>Open DevTools (<code>F12</code> or <code>⌥⌘I</code>) → <b>Application</b> tab (Chrome/Edge) or <b>Storage</b> (Firefox/Safari).</li>
        <li>Cookies → <code>https://leetcode.com</code>.</li>
        <li>Copy the <b>Value</b> of <code>LEETCODE_SESSION</code> and <code>csrftoken</code>.</li></ol></details>
      <div class="privacy">${icon('lock')} Cookies are used only to read your submission history, verified to match your username, and stored encrypted. Signing out of LeetCode (or changing password) invalidates them.</div>`}
      <div class="err" id="f-err" hidden></div>
      <div class="btns"><button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn ${remove ? '' : 'btn-pink'}" id="f-submit">${label}</button></div>
    </form></div></div>`;
    root.querySelector('.overlay').addEventListener('mousedown', (e) => { if (e.target.closest('.modal') === null) close(); });
    root.querySelector('button[data-close]').addEventListener('click', close);
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    (remove ? $('#f-sess') : $(user ? '#f-pass' : '#f-user')).focus();

    $('#join-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const btn = $('#f-submit'), err = $('#f-err');
      btn.disabled = true; btn.textContent = signin ? 'Signing in…' : 'Checking with LeetCode…'; err.hidden = true;
      try {
        if (remove) {
          await api(`/api/users/${encodeURIComponent(f.username)}`, { method: 'DELETE', body: f });
          close(); if (auth.username && auth.username.toLowerCase() === f.username.toLowerCase()) { setAuth(null, null); renderNav(); }
          toast('You’re off LeetSquad. Come back soon!'); navigate('/');
        } else {
          const r = await api(signin ? '/api/login' : '/api/users', { method: 'POST', body: f });
          setAuth(r.token, r.username); close(); await refreshMe();
          if (!signin && !r.updated) confetti();
          toast(signin || r.updated ? `Signed in as ${r.username}` : `Welcome to LeetSquad, ${r.username}!`);
          if (onDone) onDone();
          else if (signin || r.updated) route();
          else navigate(`/u/${encodeURIComponent(r.username)}`);
        }
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        btn.disabled = false; btn.textContent = label;
      }
    });
  };
  document.addEventListener('keydown', onKey);
  render();
}

/* ---------- groups & challenges ---------- */
const TOPICS = ['Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math', 'Sorting', 'Greedy', 'Depth-First Search', 'Binary Search',
  'Tree', 'Breadth-First Search', 'Matrix', 'Two Pointers', 'Binary Tree', 'Bit Manipulation', 'Heap (Priority Queue)', 'Stack', 'Graph',
  'Backtracking', 'Linked List', 'Sliding Window', 'Union Find', 'Trie', 'Recursion', 'Binary Search Tree', 'Monotonic Stack',
  'Divide and Conquer', 'Prefix Sum', 'Segment Tree', 'Topological Sort', 'Queue', 'Design', 'Simulation', 'Counting', 'Memoization', 'Number Theory'];

let groupTab = 'board';
let current = null; // { group, ... } for whichever group page is open

const fmtCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
const bar = (pct, done) => `<div class="pbar${done ? ' done' : ''}"><i style="width:${Math.round(pct * 100)}%"></i></div>`;
const todayIn = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC' }).format(new Date());
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const longDay = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function reqChips(c) {
  const out = [`<span class="chip">${icon('target')} ${plural(c.total, 'problem')}</span>`];
  if ((c.platforms || ['leetcode']).includes('codeforces')) out.push(`<span class="chip">${(c.platforms || []).map((x) => SRC_LABEL[x]).join(' + ')}</span>`);
  if (c.minEasy) out.push(`<span class="chip easy">≥ ${c.minEasy} Easy</span>`);
  if (c.minMedium) out.push(`<span class="chip medium">≥ ${c.minMedium} Medium</span>`);
  if (c.minHard) out.push(`<span class="chip hard">≥ ${c.minHard} Hard</span>`);
  for (const t of c.topics) out.push(`<span class="chip topic">${esc(t)}</span>`);
  return out.join('');
}
const statusChip = (c) => c.status === 'active' ? `<span class="chip st-active">Active · ${plural(c.daysLeft, 'day')} left</span>`
  : c.status === 'upcoming' ? `<span class="chip st-up">Starts in ${plural(c.startsInDays, 'day')}</span>` : '<span class="chip st-end">Ended</span>';

function needSignIn(after, why = 'continue') {
  if (auth.username) return after();
  openModal('join', '', () => { route(); after(); }, {
    title: `Sign in to ${why}`,
    text: 'Squads are tied to your account, so we need to know it’s you. Sign in, or create an account if you’re new.',
  });
}

function showModal(html, cls = '') {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  root.querySelector('.overlay').addEventListener('mousedown', (e) => { if (e.target.classList.contains('overlay')) close(); });
  root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', close));
  return { close, el: root.querySelector('.modal') };
}

function confirmBox(title, text, okLabel = 'Yes, do it') {
  return new Promise((resolve) => {
    const { close, el } = showModal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="btns" style="margin-top:18px"><button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="ok">${esc(okLabel)}</button></div>`);
    el.querySelector('#ok').addEventListener('click', () => { close(); resolve(true); });
    el.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => resolve(false)));
    el.closest('.overlay').addEventListener('mousedown', (e) => { if (e.target.classList.contains('overlay')) resolve(false); });
  });
}

// A small single-field modal (create group / join with code).
function promptModal({ title, text, label, placeholder, button, maxlength = 40, onSubmit }) {
  const { close, el } = showModal(`<h2>${esc(title)}</h2><p class="muted" style="margin:0">${esc(text)}</p>
    <form autocomplete="off"><div class="field"><label for="pm">${esc(label)}</label><input id="pm" name="v" required maxlength="${maxlength}" placeholder="${esc(placeholder)}"></div>
    <div class="err" hidden></div><div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink">${esc(button)}</button></div></form>`);
  el.querySelector('input').focus();
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('.btn-pink'), err = el.querySelector('.err');
    btn.disabled = true; err.hidden = true;
    try { await onSubmit(el.querySelector('input').value.trim()); close(); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}

const openCreateGroup = () => needSignIn(() => {
  const { close, el } = showModal(`<h2>Create a squad</h2><p class="muted" style="margin:0">A leaderboard, challenges and discussion for you and your friends.</p>
    <form id="cs-form" autocomplete="off"><div class="field"><label for="cs-name">Squad name</label><input id="cs-name" name="name" required maxlength="40" placeholder="e.g. Hostel 4 Grinders"></div>
      <div class="field"><label class="chk"><input type="checkbox" name="listed"> List in the squad directory</label>
        <small>Let people discover it. Leave this off to keep it private — anyone with your invite code can still join.</small></div>
      <div class="field" id="cs-mode" hidden><label for="cs-join">Who can join?</label><select id="cs-join" name="joinMode">
        ${Object.entries(MODE_LABEL).map(([k, l]) => `<option value="${k}"${k === 'request' ? ' selected' : ''}>${l} — ${MODE_HELP[k]}</option>`).join('')}</select></div>
      <p class="muted fine" style="margin:0">You can write the full squad card (about, rules, topics) in Settings after creating it.</p>
      <div class="err" hidden></div><div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="cs-go">Create squad</button></div></form>`);
  const f = el.querySelector('#cs-form');
  f.elements.listed.addEventListener('change', () => { el.querySelector('#cs-mode').hidden = !f.elements.listed.checked; });
  el.querySelector('#cs-name').focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('#cs-go'), err = el.querySelector('.err');
    btn.disabled = true; err.hidden = true;
    try {
      const listed = f.elements.listed.checked;
      const r = await api('/api/groups', { method: 'POST', body: { name: f.elements.name.value, listed, joinMode: listed ? f.elements.joinMode.value : 'invite' } });
      close(); confetti(); toast('Squad created!');
      navigate(listed ? `/s/${r.group.id}/settings` : `/s/${r.group.id}`);
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}, 'create a squad');
const openJoinCode = (prefill = '') => needSignIn(() => promptModal({
  title: 'Join with an invite code', text: 'Ask a friend for their squad’s 8-character code.',
  label: 'Invite code', placeholder: 'ABCD-EFGH', button: 'Join squad', maxlength: 12,
  onSubmit: async (code) => { const r = await api('/api/groups/join', { method: 'POST', body: { code } }); toast(`You’re in ${r.group.name}!`); navigate(`/s/${r.group.id}`); },
}), 'join a squad');

/* ----- squad directory, cards & join policies ----- */
const SQUAD_TAGS = ['Beginner friendly', 'Intermediate', 'Advanced', 'Interview prep', 'Competitive programming', 'Weekly challenges',
  'Casual', 'Hardcore', 'Students', 'Working professionals', 'Study group', 'LeetCode', 'Codeforces', 'DSA', 'System design'];
const SQ_COLORS = { pink: '#ff6b9d', yellow: '#ffd23f', mint: '#3ddc97', blue: '#4d96ff', purple: '#9b5de5', orange: '#ff9f45' };
const MODE_LABEL = { open: 'Open', request: 'By request', invite: 'Invite only' };
const MODE_HELP = { open: 'Anyone signed in can join instantly.', request: 'People send a request and you approve or decline it.', invite: 'Joining needs an invite code from a member.' };
const MODE_ICON = { open: 'check', request: 'hourglass', invite: 'lock' };
const sqIco = (c, cls = '') => `<div class="gico ${cls}${c.icon ? ' has-img' : ''}">${c.icon ? `<img src="${esc(c.icon)}" alt="" loading="lazy">` : icon('users')}</div>`;
const modeChip = (m) => `<span class="chip mode-${m}">${icon(MODE_ICON[m] || 'lock')} ${MODE_LABEL[m] || m}</span>`;
const avStack = (list = []) => `<span class="avs">${list.map((p) => avatar({ username: p.username, avatar: p.avatar }, 'mini')).join('')}</span>`;
const dirState = { q: '', mode: '', tag: '', sort: 'members', squads: [], page: 1, hasMore: false };

function squadCardHtml(c, { preview = false } = {}) {
  const tag = preview ? 'div' : 'a';
  return `<${tag} class="card sqcard sq-${esc(c.color)}"${preview ? '' : ` href="/s/${c.id}" data-link`}>
    <div class="sqtop">${sqIco(c, 'sm')}<div class="sqname">${esc(c.name || 'Your squad name')}</div>${modeChip(c.joinMode)}</div>
    ${c.tagline ? `<div class="sqtagline">${esc(c.tagline)}</div>` : ''}
    ${c.tags?.length ? `<div class="chips">${c.tags.slice(0, 4).map((t) => `<span class="chip topic">${esc(t)}</span>`).join('')}${c.tags.length > 4 ? `<span class="chip">+${c.tags.length - 4}</span>` : ''}</div>` : ''}
    <div class="sqfoot">${avStack(c.preview)}<span class="muted">${plural(c.members ?? 1, 'member')}${c.activeChallenges ? ` · ${plural(c.activeChallenges, 'live challenge')}` : ''}</span>
      ${c.viewer?.member ? `<span class="chip st-done">${icon('check')} Joined</span>` : c.viewer?.request === 'pending' ? '<span class="chip st-up">Request sent</span>' : ''}</div></${tag}>`;
}

function renderDirectory() {
  const grid = $('#sqgrid');
  if (!grid) return;
  grid.innerHTML = dirState.squads.length ? dirState.squads.map((c) => squadCardHtml(c)).join('')
    : `<div class="card empty" style="grid-column:1/-1"><span class="big">${icon('search')}</span><h3>${dirState.q || dirState.mode || dirState.tag ? 'No squads match that' : 'No squads are listed yet'}</h3>
        <p class="muted">${dirState.q || dirState.mode || dirState.tag ? 'Try different words or clear a filter.' : 'Create one and list it so others can find it.'}</p></div>`;
  $('#sqmore').innerHTML = dirState.hasMore ? '<button class="btn btn-yellow" data-act="sq-more">Load more</button>' : '';
}

async function loadDirectory(append = false) {
  const q = new URLSearchParams({ q: dirState.q, mode: dirState.mode, tag: dirState.tag, sort: dirState.sort, page: append ? dirState.page + 1 : 1 });
  const seq = (dirState.seq = (dirState.seq || 0) + 1); // only the newest request may update the list
  try {
    const d = await api(`/api/squads/directory?${q}`);
    if (seq !== dirState.seq) return;
    dirState.squads = append ? dirState.squads.concat(d.squads) : d.squads;
    dirState.page = d.page; dirState.hasMore = d.hasMore;
    renderDirectory();
  } catch (e) { const g = $('#sqgrid'); if (g) g.innerHTML = `<div class="card empty" style="grid-column:1/-1"><span class="big">${icon('alert')}</span><h3>${esc(e.message)}</h3></div>`; }
}

function discoverView() {
  const modes = [['', 'All'], ['open', 'Open'], ['request', 'By request'], ['invite', 'Invite only']];
  $('#sqbody').innerHTML = `<div class="tabrow"><div class="tabs" role="tablist" aria-label="Join policy">${modes.map(([k, l]) => `<button class="tab" role="tab" data-sqmode="${k}" aria-selected="${k === dirState.mode}">${l}</button>`).join('')}</div>
      <div class="forumtools"><input type="search" id="sqq" placeholder="Search squads by name, topic…" value="${esc(dirState.q)}" aria-label="Search squads" maxlength="60">
        <select id="sqtag" aria-label="Topic"><option value="">All topics</option>${SQUAD_TAGS.map((t) => `<option${t === dirState.tag ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <select id="sqsort" aria-label="Sort">${[['members', 'Most members'], ['active', 'Most active'], ['new', 'Newest'], ['name', 'A–Z']].map(([k, l]) => `<option value="${k}"${k === dirState.sort ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div id="sqgrid" class="gridc"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div><div id="sqmore" style="text-align:center;margin-top:16px"></div>
    <p class="muted fine" style="text-align:center;margin-top:18px">Can’t find your squad? It may be private — ask a member for the invite code, then <a href="#" data-act="join-code" style="text-decoration:underline">enter it here</a>.</p>`;
  let t;
  $('#sqq').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { dirState.q = e.target.value.trim(); loadDirectory(); }, 350); });
  $('#sqtag').addEventListener('change', (e) => { dirState.tag = e.target.value; loadDirectory(); });
  $('#sqsort').addEventListener('change', (e) => { dirState.sort = e.target.value; loadDirectory(); });
  loadDirectory();
}

async function mineView() {
  const body = $('#sqbody');
  if (!auth.username) {
    body.innerHTML = `<div class="card empty"><span class="big">${icon('users')}</span><h3>Sign in to see your squads</h3><button class="btn btn-pink" data-join data-title="Sign in">Sign in</button></div>`;
    return;
  }
  body.innerHTML = '<div class="skeleton"></div>'.repeat(2);
  try {
    const { groups } = await api('/api/groups');
    body.innerHTML = groups.length ? `<div class="gridc">${groups.map((g) => `<a class="card gcard" href="/s/${g.id}" data-link>
        ${sqIco(g)}<div class="gname">${esc(g.name)}</div>
        ${g.tagline ? `<div class="muted">${esc(g.tagline)}</div>` : ''}
        <div class="chips"><span class="chip">${plural(g.members, 'member')}</span>${modeChip(g.joinMode)}
          ${g.pendingRequests ? `<span class="chip st-up">${icon('bell')} ${plural(g.pendingRequests, 'request')}</span>` : ''}
          ${g.unread ? `<span class="chip st-up">${icon('bell')} ${g.unread} new</span>` : ''}
          ${g.activeChallenges ? `<span class="chip st-active">${plural(g.activeChallenges, 'live challenge')}</span>` : ''}
          ${g.isOwner ? `<span class="chip">${icon('award')} Owner</span>` : ''}</div></a>`).join('')}</div>`
      : `<div class="card empty"><span class="big">${icon('users')}</span><h3>You’re not in a squad yet</h3><p class="muted">Browse the directory, join with a code, or start your own.</p><a class="btn btn-yellow" href="/squads" data-link>Browse squads</a></div>`;
  } catch (e) { body.innerHTML = `<div class="card empty"><span class="big">${icon('alert')}</span><h3>${esc(e.message)}</h3></div>`; }
}

// /squads (directory) and /squads/mine
function groupsPage() {
  const tab = /^\/squads\/mine/.test(location.pathname) ? 'mine' : 'discover';
  app.innerHTML = `<section class="hero"><h1>Find your <span class="hl">squad</span></h1>
    <p>Browse squads, send a request or join with an invite code — or start your own with its own leaderboard, challenges and discussion.</p>
    <div class="stats-strip"><button class="btn btn-pink" data-act="create-group">${icon('plus')} Create a squad</button>
      <button class="btn btn-yellow" data-act="join-code">${icon('users')} Join with code</button></div></section>
    <div class="tabs maintabs" role="tablist" style="margin-top:20px"><a class="tab" role="tab" href="/squads" data-link aria-selected="${tab === 'discover'}">Discover</a>
      <a class="tab" role="tab" href="/squads/mine" data-link aria-selected="${tab === 'mine'}">My squads</a></div>
    <div id="sqbody" style="margin-top:18px"></div>`;
  if (tab === 'mine') mineView(); else discoverView();
}

/* ----- the card a non-member sees ----- */
function squadCardPage(c) {
  const v = c.viewer || {};
  const declinedRecently = v.request === 'declined' && v.requestAt && Date.now() / 1000 - v.requestAt < 3 * 86400;
  let cta;
  if (v.member) cta = `<a class="btn btn-mint" href="/s/${c.id}" data-link>${icon('check')} Open squad</a>`;
  else if (c.joinMode === 'open') cta = `<button class="btn btn-pink" data-act="sq-join" data-id="${c.id}">${icon('plus')} Join squad</button><small class="muted">Instant — no approval needed.</small>`;
  else if (c.joinMode === 'request') {
    cta = v.request === 'pending'
      ? `<span class="chip st-up">${icon('hourglass')} Request sent — waiting for @${esc(c.owner)}</span><button class="btn btn-ghost btn-small" data-act="sq-cancel" data-id="${c.id}">Cancel request</button>`
      : declinedRecently ? '<p class="muted" style="margin:0">The owner declined your last request. You can ask again in a few days.</p>'
      : `<textarea id="sq-msg" rows="3" maxlength="200" placeholder="Say hi and why you’d like to join (optional)"></textarea><button class="btn btn-pink" data-act="sq-request" data-id="${c.id}">${icon('hourglass')} Request to join</button>`;
  } else cta = `<p class="muted" style="margin:0">${icon('lock')} Invite only — ask a member for the code.</p><button class="btn btn-yellow" data-act="join-code">I have a code</button>`;

  const section = (title, ic, text) => text ? `<section class="card"><h2>${hi(ic, '#e1d2ff')} ${title}</h2><p class="sqtext">${esc(text)}</p></section>` : '';
  app.innerHTML = `<a class="back" href="/squads" data-link>← All squads</a>
    <section class="card sqhero sq-${esc(c.color)}"><div class="sqhead"><div class="sqtitle">${sqIco(c, 'big')}<h1>${esc(c.name)}</h1></div>${c.tagline ? `<div class="sqtagline">${esc(c.tagline)}</div>` : ''}
        <div class="chips">${modeChip(c.joinMode)}${c.tags.map((t) => `<span class="chip topic">${esc(t)}</span>`).join('')}</div>
        <div class="sqfacts"><span class="muted">${avStack(c.preview)} ${plural(c.members, 'member')}</span>
          ${c.activeChallenges ? `<span class="chip st-active">${plural(c.activeChallenges, 'live challenge')}</span>` : ''}
          <span class="muted">Run by <a href="/u/${encodeURIComponent(c.owner)}" data-link style="text-decoration:underline">@${esc(c.owner)}</a></span></div></div>
      <div class="sqcta">${cta}</div></section>
    <div class="grid2" style="margin-top:22px">${section('About', 'list', c.about) || ''}${section('Who it’s for', 'users', c.audience) || ''}</div>
    ${section('Rules & requirements', 'alert', c.rules)}
    ${!c.about && !c.audience && !c.rules ? '<div class="card"><p class="muted" style="margin:0">The owner hasn’t written the details for this squad yet.</p></div>' : ''}
    <section class="card" style="margin-top:22px"><h2>${hi('lock', '#fff3b0')} How joining works</h2><p class="sqtext">${esc(MODE_HELP[c.joinMode])}</p></section>`;
}

/* ----- invite link landing: shows the card too ----- */
async function joinPage(code) {
  app.innerHTML = '<div class="skeleton"></div>';
  try {
    const g = await api(`/api/groups/preview/${encodeURIComponent(code)}`);
    const doJoin = async () => {
      try { const r = await api('/api/groups/join', { method: 'POST', body: { code } }); confetti(); toast(`You’re in ${r.group.name}!`); navigate(`/s/${r.group.id}`); }
      catch (e) { toast(e.message); }
    };
    const block = (t, x) => x ? `<div class="invblock"><b>${t}</b><p>${esc(x)}</p></div>` : '';
    app.innerHTML = `<div class="card sqhero sq-${esc(g.color || 'pink')}" style="margin:30px auto;max-width:640px;display:block;text-align:left">
      <p class="muted" style="margin:0">You’re invited to join</p><h1 style="margin:2px 0 6px">${esc(g.name)}</h1>
      ${g.tagline ? `<div class="sqtagline">${esc(g.tagline)}</div>` : ''}
      <div class="chips" style="margin:8px 0">${(g.tags || []).map((t) => `<span class="chip topic">${esc(t)}</span>`).join('')}</div>
      <p class="muted">${plural(g.members, 'member')} · run by @${esc(g.owner)}</p>
      ${block('About', g.about)}${block('Who it’s for', g.audience)}${block('Rules', g.rules)}
      <button class="btn btn-pink" id="accept" style="margin-top:14px">Join squad</button></div>`;
    $('#accept').addEventListener('click', () => needSignIn(doJoin, `join ${g.name}`));
  } catch (e) {
    app.innerHTML = `<div class="card empty" style="margin-top:28px"><span class="big">${icon('search')}</span><h3>${esc(e.message)}</h3>
      <a class="btn btn-yellow" href="/squads" data-link>Browse squads</a></div>`;
  }
}

/* ----- owner: settings + join requests ----- */
const optionsHtml = (arr, cur) => arr.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('');

function settingsView(d) {
  const g = d.group;
  return `<div id="sqreq"></div>
  <div class="settings-grid"><section class="card"><h2>${hi('pencil', '#ffdcb8')} Squad card</h2>
    <p class="muted" style="margin:0 0 12px">This is what people see in the directory and before they join.</p>
    <form id="sq-form" autocomplete="off">
      <div class="field"><label>Squad picture</label><div class="photo-edit"><div id="st-icon">${sqIco(g, 'big')}</div>
        <div><label class="btn btn-yellow btn-small" for="st-iconfile">${icon('camera')} Choose picture</label><input id="st-iconfile" type="file" accept="image/*" hidden>
          <button type="button" class="btn btn-ghost btn-small" id="st-iconreset"${g.icon ? '' : ' hidden'}>Remove</button>
          <small>Square pictures look best. Without one, squads show the default icon. Saved right away.</small></div></div></div>
      <div class="field"><label for="st-name">Name</label><input id="st-name" name="name" required maxlength="40" value="${esc(g.name)}"></div>
      <div class="field"><label for="st-tag">Tagline <em>(one line)</em></label><input id="st-tag" name="tagline" maxlength="80" placeholder="e.g. One DP problem a day, together" value="${esc(g.tagline)}"></div>
      <div class="field"><label for="st-about">What’s this squad about?</label><textarea id="st-about" name="about" rows="3" maxlength="600" placeholder="Your goals, how you practise, what a week looks like…">${esc(g.about)}</textarea></div>
      <div class="field"><label for="st-aud">Who is it for?</label><textarea id="st-aud" name="audience" rows="2" maxlength="300" placeholder="e.g. Beginners aiming for their first internship">${esc(g.audience)}</textarea></div>
      <div class="field"><label for="st-rules">Rules & requirements <em>(optional)</em></label><textarea id="st-rules" name="rules" rows="2" maxlength="400" placeholder="e.g. Solve at least 3 problems a week. Be kind.">${esc(g.rules)}</textarea></div>
      <div class="field"><label>Topics <em>(up to 5)</em></label><div class="topic-pick">${(d.options?.tags || SQUAD_TAGS).map((t) => `<button type="button" class="chip tp" data-sqtag="${esc(t)}" aria-pressed="${g.tags.includes(t)}">${esc(t)}</button>`).join('')}</div></div>
      <div class="field"><label>Card colour</label><div class="swatches">${Object.entries(SQ_COLORS).map(([k, hex]) => `<button type="button" class="swatch" data-sqcolor="${k}" style="background:${hex}" aria-label="${k}" aria-pressed="${k === g.color}"></button>`).join('')}</div></div>
      <div class="field"><label class="chk"><input type="checkbox" name="listed"${g.listed ? ' checked' : ''}> List this squad in the directory</label>
        <small>Anyone can find it and read the card. Unlisted squads are only reachable with your invite code.</small></div>
      <div class="field" id="st-modes"><label>Who can join?</label><div class="modepick">${Object.keys(MODE_LABEL).map((m) => `<label class="modeopt"><input type="radio" name="joinMode" value="${m}"${m === g.joinMode ? ' checked' : ''}><span>${modeChip(m)}<small>${MODE_HELP[m]}</small></span></label>`).join('')}</div>
        <small class="muted" id="st-modehint"></small></div>
      <div class="err" hidden></div><div class="btns"><button class="btn btn-pink" id="st-save">Save changes</button></div>
    </form></section>
    <aside class="settings-preview"><h3 class="muted" style="font:700 14px var(--display);margin:0 0 8px;text-transform:uppercase;letter-spacing:.06em">Preview</h3><div id="sq-preview"></div>
      <p class="muted fine">Invite code: <b>${fmtCode(g.code)}</b> — always works, whatever the policy.</p></aside></div>`;
}

function bindSettings(d) {
  const f = $('#sq-form');
  if (!f) return;
  const picked = new Set(d.group.tags);
  let color = d.group.color, iconUrl = d.group.icon;
  const read = () => ({
    name: f.elements.name.value.trim(), tagline: f.elements.tagline.value.trim(), about: f.elements.about.value.trim(), audience: f.elements.audience.value.trim(),
    rules: f.elements.rules.value.trim(), tags: [...picked], color, icon: iconUrl, listed: f.elements.listed.checked,
    joinMode: f.elements.listed.checked ? (f.elements.joinMode.value || 'invite') : 'invite',
  });
  const refresh = () => {
    const v = read();
    f.querySelectorAll('input[name="joinMode"]').forEach((r) => { r.disabled = !v.listed; if (!v.listed) r.checked = r.value === 'invite'; });
    $('#st-modes').classList.toggle('dim', !v.listed);
    $('#st-modehint').textContent = v.listed ? '' : 'Unlisted squads are invite-only. List the squad to allow open or request-based joining.';
    $('#sq-preview').innerHTML = squadCardHtml({ ...v, members: d.users.length, preview: d.users.slice(0, 4).map((u) => ({ username: u.username, avatar: u.avatar })), activeChallenges: d.challenges.filter((c) => c.status === 'active').length }, { preview: true });
  };
  f.querySelectorAll('[data-sqtag]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.sqtag;
    if (picked.has(t)) picked.delete(t); else if (picked.size < 5) picked.add(t); else return toast('Up to 5 topics');
    b.setAttribute('aria-pressed', picked.has(t)); refresh();
  }));
  f.querySelectorAll('[data-sqcolor]').forEach((b) => b.addEventListener('click', () => {
    color = b.dataset.sqcolor; f.querySelectorAll('[data-sqcolor]').forEach((x) => x.setAttribute('aria-pressed', x === b)); refresh();
  }));
  const setIcon = (url) => {
    iconUrl = url; d.group.icon = url;
    $('#st-icon').innerHTML = sqIco({ icon: url }, 'big'); $('#st-iconreset').hidden = !url; refresh();
  };
  $('#st-iconfile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try {
      const r = await api(`/api/squads/${d.group.id}/icon`, { method: 'PUT', body: { image: await fileToSquareJpeg(file) } });
      setIcon(r.icon); toast('Squad picture updated');
    } catch (ex) { toast(ex.message); }
  });
  $('#st-iconreset').addEventListener('click', async () => {
    try { await api(`/api/squads/${d.group.id}/icon`, { method: 'DELETE' }); setIcon(null); toast('Back to the default icon'); } catch (ex) { toast(ex.message); }
  });
  f.addEventListener('input', refresh);
  refresh();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#st-save'), err = f.querySelector('.err');
    btn.disabled = true; err.hidden = true;
    try { await api(`/api/squads/${d.group.id}/settings`, { method: 'PUT', body: read() }); toast('Squad card saved'); groupPage(d.group.id); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
  loadRequests(d.group);
}

async function loadRequests(g) {
  const box = $('#sqreq');
  if (!box) return;
  try {
    const { requests } = await api(`/api/squads/${g.id}/requests`);
    if (!requests.length && g.joinMode !== 'request') { box.innerHTML = ''; return; }
    box.innerHTML = `<section class="card" style="margin-bottom:22px"><h2>${hi('bell', '#fff3b0')} Join requests <small>${requests.length ? `${requests.length} waiting` : 'none right now'}</small></h2>
      ${requests.length ? `<div class="reqs">${requests.map((r) => `<div class="req"><a href="/u/${encodeURIComponent(r.username)}" data-link>${avatar(r, 'mini')}</a>
        <div class="reqmain"><div><a href="/u/${encodeURIComponent(r.username)}" data-link><b>${esc(r.name || r.username)}</b></a> <span class="muted">@${esc(r.username)}${r.totalSolved != null ? ` · ${r.totalSolved} solved` : ''} · ${ago(r.createdAt)}</span></div>
          ${r.message ? `<div class="reqmsg">“${esc(r.message)}”</div>` : ''}</div>
        <div class="reqbtns"><button class="btn btn-small btn-mint" data-act="sq-decide" data-squad="${g.id}" data-id="${r.id}" data-action="approve">${icon('check')} Approve</button>
          <button class="btn btn-small btn-ghost" data-act="sq-decide" data-squad="${g.id}" data-id="${r.id}" data-action="decline">Decline</button></div></div>`).join('')}</div>`
        : '<p class="muted" style="margin:0">When someone asks to join, they’ll show up here.</p>'}</section>`;
  } catch { box.innerHTML = ''; }
}

async function squadAction(name, el) {
  const id = el.dataset.id;
  const run = async (fn, msg) => { try { await fn(); if (msg) toast(msg); } catch (e) { toast(e.message); } };
  if (name === 'sq-more') return loadDirectory(true);
  if (name === 'sq-join') return needSignIn(() => run(async () => { await api(`/api/squads/${id}/join`, { method: 'POST' }); confetti(); navigate(`/s/${id}`); }, 'Welcome to the squad!'), 'join this squad');
  if (name === 'sq-request') return needSignIn(() => run(async () => {
    await api(`/api/squads/${id}/request`, { method: 'POST', body: { message: $('#sq-msg')?.value || '' } }); groupPage(id);
  }, 'Request sent — you’ll get a notification'), 'request to join');
  if (name === 'sq-cancel') return run(async () => { await api(`/api/squads/${id}/request`, { method: 'DELETE' }); groupPage(id); }, 'Request cancelled');
  if (name === 'sq-decide') {
    const squad = el.dataset.squad, approve = el.dataset.action === 'approve';
    return run(async () => { await api(`/api/squads/${squad}/requests/${id}`, { method: 'POST', body: { action: el.dataset.action } }); groupPage(squad); }, approve ? 'Approved — they’re in!' : 'Declined');
  }
}

/* ----- group page ----- */
function renderGroup(d) {
  current = d;
  rerender = () => renderGroup(d);
  const g = d.group, syncing = isSyncing(d.users);
  if (groupTab === 'settings' && !g.isOwner) groupTab = 'board';
  const active = d.challenges.filter((c) => c.status === 'active').length;

  const manage = g.isOwner && d.users.length > 1 ? `<div class="card" style="margin-top:22px"><h2>${hi('users', '#e1d2ff')} Manage members</h2>
    <div class="members">${d.users.filter((u) => u.username.toLowerCase() !== g.owner.toLowerCase()).map((u) =>
      `<span class="chip member">${esc(u.username)}<button data-act="remove-member" data-user="${esc(u.username)}" aria-label="Remove ${esc(u.username)}">×</button></span>`).join('')}</div></div>` : '';

  const challenges = d.challenges.length ? `<div class="gridc">${d.challenges.map((c) => `
    <a class="card ccard" href="/s/${g.id}/c/${c.id}" data-link>
      <div class="ctop"><div class="cname">${esc(c.title)}</div>${statusChip(c)}</div>
      <div class="chips">${reqChips(c.config)}</div>
      <div class="muted cdates">${longDay(c.startDay)} → ${longDay(c.endDay)}</div>
      ${c.me ? `<div class="mine"><div class="lbl"><span>Your progress</span><b>${c.me.effective}/${c.config.total}${c.me.completed ? ` ${icon('check')}` : ''}</b></div>${bar(c.me.pct, c.me.completed)}</div>` : ''}
      <div class="muted cfoot">${c.leader && c.leader.effective ? `Leading: <b>@${esc(c.leader.username)}</b> · ` : ''}${c.completedCount}/${c.participants} finished</div></a>`).join('')}</div>`
    : `<div class="card empty"><span class="big">${icon('target')}</span><h3>No challenges yet</h3><p class="muted">Set a goal for the squad — e.g. 30 problems in a week.</p></div>`;

  app.innerHTML = `
  <a class="back" href="/squads" data-link>← All squads</a>
  <section class="card banner gbanner">${g.isOwner ? `<a class="icoedit" href="/s/${g.id}/settings" data-link title="Change squad picture">${sqIco(g, 'big')}<span class="cam">${icon('camera')}</span></a>` : sqIco(g, 'big')}
    <div><h1>${esc(g.name)}</h1><div class="meta"><span class="chip">${plural(d.users.length, 'member')}</span><span class="chip">${icon('award')} Owner @${esc(g.owner)}</span>${modeChip(g.joinMode)}${g.listed ? '' : '<span class="chip">Unlisted</span>'}${g.isOwner && g.pendingRequests ? `<button class="chip st-up" data-gtab="settings">${icon('bell')} ${plural(g.pendingRequests, 'join request')}</button>` : ''}</div>${g.tagline ? `<div class="muted" style="margin-top:6px">${esc(g.tagline)}</div>` : ''}</div>
    <div class="actions">${g.isOwner ? '<button class="btn btn-ghost btn-small" data-act="delete-group">Delete squad</button>' : '<button class="btn btn-ghost btn-small" data-act="leave-group">Leave squad</button>'}</div></section>
  <section class="card invite"><div><div class="k">Invite code</div><div class="code">${fmtCode(g.code)}</div></div>
    <div class="btns"><button class="btn btn-small btn-yellow" data-act="copy-code">Copy code</button>
      <button class="btn btn-small" data-act="copy-link">Copy invite link</button>
      ${g.isOwner ? '<button class="btn btn-small btn-ghost" data-act="new-code">New code</button>' : ''}</div></section>
  <div class="tabs maintabs" role="tablist" style="margin-top:22px">
    <button class="tab" role="tab" data-gtab="board" aria-selected="${groupTab === 'board'}">Leaderboard</button>
    <button class="tab" role="tab" data-gtab="challenges" aria-selected="${groupTab === 'challenges'}">Challenges${active ? ` <span class="count">${active}</span>` : ''}</button>
    <button class="tab" role="tab" data-gtab="discussion" aria-selected="${groupTab === 'discussion'}">Discussion${d.unread ? ` <span class="count">${d.unread}</span>` : ''}</button>
    ${g.isOwner ? `<button class="tab" role="tab" data-gtab="settings" aria-selected="${groupTab === 'settings'}">Settings${g.pendingRequests ? ` <span class="count">${g.pendingRequests}</span>` : ''}</button>` : ''}</div>
  ${groupTab === 'board' ? boardHtml(d.users, d.feed, { syncing, below: manage })
    : groupTab === 'settings' ? settingsView(d)
    : groupTab === 'discussion' ? `<div class="sec-head"><h2>${hi('message', '#dbe9ff')} Discussion <small class="muted" style="font:600 14px var(--body)">${icon('lock')} members only</small></h2>
        <button class="btn btn-pink btn-small" data-act="g-new-post">${icon('plus')} New post</button></div>
      ${forumToolbar(gForum, { catAttr: 'data-gfcat', qId: 'gfq', sortId: 'gfsort' })}
      <div id="gflist"><div class="skeleton"></div><div class="skeleton"></div></div><div id="gfmore" style="text-align:center;margin-top:16px"></div>`
    : `<div class="sec-head"><h2>${hi('target', '#e1d2ff')} Challenges</h2><button class="btn btn-pink btn-small" data-act="new-challenge">${icon('plus')} New challenge</button></div>${challenges}`}`;

  if (groupTab === 'settings') {
    bindSettings(d);
    if (g.pendingRequests) api('/api/notifications/read', { method: 'POST', body: { squadId: g.id, admin: true } }).then((r) => { auth.unread = r.unread; renderNav(); }).catch(() => {});
  }
  if (groupTab === 'discussion') {
    if (gForum.groupId !== g.id) Object.assign(gForum, makeForumState({ groupId: g.id })); // switched groups: start clean
    bindToolbar(gForum, { qId: 'gfq', sortId: 'gfsort' }, loadGroupForum);
    loadGroupForum();
    if (d.unread) api('/api/notifications/read', { method: 'POST', body: { squadId: g.id } }).then((r) => { auth.unread = r.unread; renderNav(); document.querySelector('[data-gtab="discussion"] .count')?.remove(); }).catch(() => {});
  }
}

async function groupPage(id) {
  app.innerHTML = '<div class="skeleton"></div>'.repeat(4);
  const here = location.pathname;
  // Not a member (or signed out)? If the squad is listed, show its public card instead of an error.
  const asCard = async (err) => {
    try {
      const c = await api(`/api/squads/${id}/card`);
      if (location.pathname !== here) return;
      if (c.viewer?.member && err) throw err;
      squadCardPage(c);
    } catch (e2) {
      app.innerHTML = auth.username
        ? `<div class="card empty" style="margin-top:28px"><span class="big">${icon('search')}</span><h3>${esc(e2.message)}</h3><a class="btn btn-yellow" href="/squads" data-link>Browse squads</a></div>`
        : `<div class="card empty" style="margin-top:28px"><span class="big">${icon('lock')}</span><h3>This squad might be private</h3><p class="muted">Sign in if you’re a member, or browse the public squads.</p>
            <button class="btn btn-pink" data-join data-title="Sign in">Sign in</button> <a class="btn btn-yellow" href="/squads" data-link>Browse squads</a></div>`;
    }
  };
  if (!auth.username) return asCard(null);
  const load = async () => {
    const d = await api(`/api/groups/${id}`);
    if (location.pathname === here) renderGroup(d);
    return d;
  };
  try {
    let d = await load();
    const poll = async () => {
      if (location.pathname !== here) return;
      if (isSyncing(d.users) && groupTab !== 'discussion' && groupTab !== 'settings') { try { d = await load(); } catch {} }
      timer = setTimeout(poll, 4000);
    };
    timer = setTimeout(poll, 4000);
  } catch (e) { await asCard(e); }
}

async function groupAction(act, el) {
  const g = current?.group;
  const run = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); } catch (e) { toast(e.message); } };
  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast(text); } };
  if (act === 'copy-code') return copy(g.code, 'Invite code copied');
  if (act === 'copy-link') return copy(`${location.origin}/join/${g.code}`, 'Invite link copied');
  if (act === 'new-code' && await confirmBox('Generate a new code?', 'The old code and invite link will stop working. Existing members stay.', 'New code'))
    return run(async () => { await api(`/api/groups/${g.id}/code`, { method: 'POST' }); route(); }, 'New invite code ready');
  if (act === 'delete-group' && await confirmBox('Delete this squad?', 'The leaderboard and all its challenges will be gone for everyone.', 'Delete squad'))
    return run(async () => { await api(`/api/groups/${g.id}`, { method: 'DELETE' }); navigate('/squads'); }, 'Squad deleted');
  if (act === 'leave-group' && await confirmBox('Leave this squad?', 'You can rejoin later with the invite code.', 'Leave'))
    return run(async () => { await api(`/api/groups/${g.id}/leave`, { method: 'POST' }); navigate('/squads'); }, 'You left the squad');
  if (act === 'remove-member' && await confirmBox(`Remove @${el.dataset.user}?`, 'They can rejoin with the invite code unless you generate a new one.', 'Remove'))
    return run(async () => { await api(`/api/groups/${g.id}/members/${encodeURIComponent(el.dataset.user)}`, { method: 'DELETE' }); route(); }, 'Member removed');
  if (act === 'new-challenge') return openChallengeModal(current);
  if (act === 'delete-challenge' && await confirmBox('Delete this challenge?', 'Standings for it will be lost.', 'Delete'))
    return run(async () => { await api(`/api/groups/${el.dataset.group}/challenges/${el.dataset.id}`, { method: 'DELETE' }); navigate(`/s/${el.dataset.group}`); }, 'Challenge deleted');
}

/* ----- create challenge ----- */
function openChallengeModal(d) {
  const today = todayIn(d.tz);
  const picked = new Set();
  const plats = new Set(['leetcode']);
  const { close, el } = showModal(`<h2>New challenge</h2><p class="muted" style="margin:0">Everyone in <b>${esc(d.group.name)}</b> takes part automatically.</p>
    <div class="templates"><span class="muted">Quick start:</span>
      <button type="button" class="chip tpl" data-tpl="week30">30 in a week</button>
      <button type="button" class="chip tpl" data-tpl="medium">Medium marathon</button>
      <button type="button" class="chip tpl" data-tpl="hard">Hard mode</button></div>
    <form autocomplete="off" id="ch-form">
      <div class="field"><label for="c-title">Name</label><input id="c-title" name="title" required maxlength="60" placeholder="e.g. Graph week"></div>
      <div class="field"><label for="c-desc">Description <em>(optional)</em></label><input id="c-desc" name="description" maxlength="300" placeholder="Winner buys chai"></div>
      <div class="field"><label>How long?</label>
        <div class="seg presets" role="group">${[[1, '1 day'], [3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '30 days']].map(([n, l]) => `<button type="button" data-days="${n}" aria-pressed="${n === 7}">${l}</button>`).join('')}</div>
        <div class="row2"><div><small>Starts</small><input type="date" name="startDay" id="c-start" value="${today}" required></div>
          <div><small>Ends (inclusive)</small><input type="date" name="endDay" id="c-end" value="${addDays(today, 6)}" required></div></div></div>
      <div class="field"><label>Goal</label>
        <div class="row4"><div><small>Total problems</small><input type="number" name="total" id="c-total" min="1" max="1000" value="10" required></div>
          <div><small>≥ Easy</small><input type="number" name="minEasy" min="0" value="0"></div>
          <div><small>≥ Medium</small><input type="number" name="minMedium" min="0" value="0"></div>
          <div><small>≥ Hard</small><input type="number" name="minHard" min="0" value="0"></div></div></div>
      <div class="field"><label>Count problems from</label>
        <div class="topic-pick platpick">${[['leetcode', 'LeetCode'], ['codeforces', 'Codeforces']].map(([k, l]) => `<button type="button" class="chip tp" data-plat="${k}" aria-pressed="${k === 'leetcode'}">${l}</button>`).join('')}</div>
        <small>Codeforces counts only for friends who’ve linked their handle.</small></div>
      <div class="field"><label>Topics <em>(optional — only problems tagged with these count)</em></label>
        <div class="topic-pick">${TOPICS.map((t) => `<button type="button" class="chip tp" data-topic="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('')}</div></div>
      <div class="summary" id="c-sum"></div>
      <div class="err" id="c-err" hidden></div>
      <div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="c-go">Start challenge</button></div>
    </form>`, 'wide');

  const f = el.querySelector('#ch-form');
  const val = (n) => Number(f.elements[n].value) || 0;
  const summarize = () => {
    const total = val('total'), e = val('minEasy'), m = val('minMedium'), h = val('minHard'), free = total - e - m - h;
    const days = Math.round((Date.parse(f.elements.endDay.value) - Date.parse(f.elements.startDay.value)) / 864e5) + 1;
    const parts = [e && `${e} Easy`, m && `${m} Medium`, h && `${h} Hard`].filter(Boolean);
    el.querySelector('#c-sum').innerHTML = `${icon('target')} Solve <b>${plural(total, 'problem')}</b>${parts.length ? ` — at least ${parts.join(', ')}${free > 0 ? `, plus ${free} of any difficulty` : ''}` : ''}${picked.size ? ` from <b>${[...picked].join(', ')}</b>` : ''}
      ${days > 0 ? `in <b>${plural(days, 'day')}</b> (${(total / days).toFixed(1)}/day)` : '<span style="color:#b3123a">— end date is before start date</span>'}.`;
  };
  const setEnd = (n) => { f.elements.endDay.value = addDays(f.elements.startDay.value || today, n - 1); };
  const setPreset = (n) => { el.querySelectorAll('[data-days]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.days) === n)); };

  el.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { setEnd(+b.dataset.days); setPreset(+b.dataset.days); summarize(); }));
  el.querySelectorAll('[data-topic]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.topic, on = !picked.has(t);
    on ? picked.add(t) : picked.delete(t);
    b.setAttribute('aria-pressed', on); summarize();
  }));
  el.querySelectorAll('[data-plat]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.plat;
    if (plats.has(k) && plats.size === 1) return; // keep at least one platform
    plats.has(k) ? plats.delete(k) : plats.add(k);
    b.setAttribute('aria-pressed', plats.has(k));
  }));
  f.elements.startDay.addEventListener('change', () => { const p = el.querySelector('[data-days][aria-pressed="true"]'); if (p) setEnd(+p.dataset.days); summarize(); });
  f.elements.endDay.addEventListener('change', () => { setPreset(-1); summarize(); });
  f.addEventListener('input', summarize);
  const TPL = { week30: { title: '30 in a week', total: 30, days: 7 }, medium: { title: 'Medium marathon', total: 15, minMedium: 10, days: 14 }, hard: { title: 'Hard mode', total: 7, minHard: 3, days: 7 } };
  el.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
    const t = TPL[b.dataset.tpl];
    f.elements.title.value = t.title; f.elements.total.value = t.total;
    f.elements.minEasy.value = t.minEasy || 0; f.elements.minMedium.value = t.minMedium || 0; f.elements.minHard.value = t.minHard || 0;
    setEnd(t.days); setPreset(t.days); summarize();
  }));
  summarize();
  f.elements.title.focus();

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('#c-go'), err = el.querySelector('#c-err');
    btn.disabled = true; err.hidden = true;
    const body = Object.fromEntries(new FormData(f));
    body.topics = [...picked];
    body.platforms = [...plats];
    try {
      const r = await api(`/api/groups/${d.group.id}/challenges`, { method: 'POST', body });
      close(); confetti(); toast('Challenge on! Good luck everyone');
      navigate(`/s/${d.group.id}/c/${r.id}`);
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}

/* ----- challenge page ----- */
function renderChallenge(c, threads = []) {
  const t = c.config, mine = c.standings.find((r) => r.username.toLowerCase() === c.me.toLowerCase());
  let pace = '';
  if (mine && c.status === 'active' && !mine.completed) {
    const left = t.total - mine.effective;
    pace = `<div class="notice">${icon('rocket')} You need <b>${plural(left, 'more problem')}</b> — about <b>${Math.ceil(left / Math.max(1, c.daysLeft))}/day</b> over the next ${plural(c.daysLeft, 'day')}.</div>`;
  } else if (mine?.completed) pace = `<div class="notice good">${icon('check')} You completed this challenge — nice work!</div>`;

  let finishers = 0;
  const rows = c.standings.map((r, i) => {
    const medal = r.completed && finishers < 3 ? MEDALS[finishers++] : i + 1;
    const chip = (k, label, min) => (min || r.counts[k]) ? `<span class="chip ${k}${min && r.counts[k] >= min ? ' met' : ''}">${r.counts[k]}${min ? `/${min}` : ''} ${label}</span>` : '';
    return `<a class="row srow ${r.completed ? 'done' : ''}" href="/u/${encodeURIComponent(r.username)}" data-link style="animation-delay:${i * 50}ms">
      <div class="rank">${medal}</div>${avatar(r)}
      <div class="who"><div class="nm">${esc(r.name || r.username)}<span class="handle">@${esc(r.username)}</span></div>
        <div class="chips">${chip('easy', 'E', t.minEasy)}${chip('medium', 'M', t.minMedium)}${chip('hard', 'H', t.minHard)}${r.counts.other ? `<span class="chip">${r.counts.other} ?</span>` : ''}</div>
        <div class="prog">${bar(r.pct, r.completed)}</div>
        ${r.recent.length ? `<div class="recent-chips">${r.recent.slice(0, 3).map((p) => `<span class="chip ${diffClass(p.difficulty)}">${esc(p.title)}</span>`).join('')}</div>` : ''}</div>
      <div class="score">${r.completed ? `<span class="chip st-done">${icon('check')} Done</span><small>${ago(r.completedAt)}</small>` : `<b>${r.effective}/${t.total}</b><small>${t.total - r.effective} to go</small>`}</div></a>`;
  }).join('');

  app.innerHTML = `<a class="back" href="/s/${c.group.id}" data-link>← ${esc(c.group.name)}</a>
  <section class="card banner cbanner"><div class="gico big">${icon('target')}</div>
    <div><h1>${esc(c.title)}</h1><div class="meta">${statusChip(c)}<span class="chip">${longDay(c.startDay)} → ${longDay(c.endDay)}</span><span class="chip">by @${esc(c.creator)}</span></div>
      ${c.description ? `<p class="muted" style="margin:10px 0 0">${esc(c.description)}</p>` : ''}</div>
    <div class="actions">${c.canDelete ? `<button class="btn btn-ghost btn-small" data-act="delete-challenge" data-group="${c.group.id}" data-id="${c.id}">Delete</button>` : ''}</div></section>
  <section class="card" style="margin-top:22px"><h2>${hi('list', '#d3f8e6')} The goal</h2><div class="chips">${reqChips(t)}</div>
    <p class="muted" style="margin:12px 0 0;font-size:14px">${t.topics.length ? 'Only problems tagged with these topics count. ' : ''}Each distinct problem with an Accepted submission during the dates counts once — re-solves too. Data refreshes every 30 minutes.</p></section>
  ${pace}
  <div class="rows" style="margin-top:22px">${rows}</div>
  <section class="card" style="margin-top:26px"><h2>${hi('message', '#dbe9ff')} Discussion <small>${plural(threads.length, 'thread')}</small>
      <button class="btn btn-pink btn-small" style="margin-left:12px" data-act="c-new-thread" data-group="${c.group.id}" data-groupname="${esc(c.group.name)}" data-challenge="${c.id}" data-title="${esc(c.title)}">${icon('plus')} Start a thread</button></h2>
    ${threads.length ? `<div class="contests">${threads.slice(0, 6).map((p) => `<a class="crow" href="/forum/${p.id}" data-link><div class="cn"><b>${esc(p.title)}</b><span class="muted">${esc(p.name || p.author)} · ${ago(p.lastActivity)}</span></div>
        <div class="cr"><b>${p.replyCount}</b><span class="muted">${p.replyCount === 1 ? 'reply' : 'replies'}</span></div></a>`).join('')}</div>
      ${threads.length > 6 ? `<p class="muted fine"><a href="/s/${c.group.id}/discussion" data-link style="text-decoration:underline">See all in the squad discussion</a></p>` : ''}`
      : '<p class="muted" style="margin:0">No threads yet — share tips, ask for help, or trash-talk (kindly) about this challenge. Only your squad can see it.</p>'}</section>`;
}

async function challengePage(gid, cid) {
  app.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  if (!auth.username) return groupsPage();
  try {
    const [c, threads] = await Promise.all([
      api(`/api/groups/${gid}/challenges/${cid}`),
      api(`/api/groups/${gid}/forum/posts?challenge=${cid}&sort=active`).catch(() => ({ posts: [] })),
    ]);
    if (location.pathname === `/s/${gid}/c/${cid}`) renderChallenge(c, threads.posts);
  } catch (e) {
    app.innerHTML = `<div class="card empty" style="margin-top:28px"><span class="big">${icon('search')}</span><h3>${esc(e.message)}</h3><a class="btn btn-yellow" href="/squads" data-link>My squads</a></div>`;
  }
}


/* ---------- activity log (non-LeetCode) ---------- */
const CAT_COLOR = { 'Project': '#cfe0ff', 'System Design': '#e1d2ff', 'Learning': '#c9f7e3', 'Reading': '#fff3b0', 'Interview Prep': '#ffd0e1', 'Open Source': '#ffdcb8', 'Other': '#e9e6f2' };
const CAT_SOLID = { 'Project': '#4d96ff', 'System Design': '#9b5de5', 'Learning': '#3ddc97', 'Reading': '#ffc93c', 'Interview Prep': '#ff6b9d', 'Open Source': '#ff9f45', 'Other': '#9aa0b5' };
const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
const ownsProfile = (p) => auth.username && auth.username.toLowerCase() === p.username.toLowerCase();

function dayHeading(day, today) {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return new Date(day + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function logCard(p) {
  const L = p.log, own = ownsProfile(p);
  const maxMin = Math.max(1, ...L.byCategory.map((c) => c.minutes || c.entries * 10));
  const cats = L.byCategory.length ? L.byCategory.map((c) => `<div class="hbar"><span class="nm">${esc(c.category)}</span>
    <div class="track"><div class="fill" style="width:${((c.minutes || c.entries * 10) / maxMin) * 100}%;background:${CAT_SOLID[c.category] || '#9aa0b5'}"></div></div>
    <span class="n" title="${plural(c.entries, 'entry')}">${c.minutes ? fmtMins(c.minutes) : c.entries + '×'}</span></div>`).join('') : '';

  const groups = [];
  for (const e of L.entries) {
    if (!groups.length || groups[groups.length - 1].day !== e.day) groups.push({ day: e.day, items: [] });
    groups[groups.length - 1].items.push(e);
  }
  const timeline = groups.map((g) => `<div class="lday"><h3>${esc(dayHeading(g.day, p.today))}</h3>${g.items.map((e) => `
    <div class="lentry"><span class="chip cat" style="background:${CAT_COLOR[e.category] || '#e9e6f2'}">${esc(e.category)}</span>
      <div class="lbody"><div class="ltitle">${esc(e.title)}${e.link ? ` <a class="llink" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" title="Open link" aria-label="Open link">${icon('external')}</a>` : ''}</div>
        ${e.notes ? `<div class="lnotes">${esc(e.notes)}</div>` : ''}</div>
      <div class="lmeta">${e.minutes ? `<span class="chip">${icon('clock')} ${fmtMins(e.minutes)}</span>` : ''}
        ${own ? `<button class="iconbtn" data-act="log-edit" data-id="${e.id}" aria-label="Edit entry" title="Edit">${icon('pencil')}</button><button class="iconbtn" data-act="log-delete" data-id="${e.id}" aria-label="Delete entry" title="Delete">${icon('trash')}</button>` : ''}</div></div>`).join('')}</div>`).join('');

  const empty = own ? 'Nothing logged yet — add what you worked on today: a project, a system design deep-dive, a chapter you read…'
    : `@${esc(p.username)} hasn’t logged any non-LeetCode activity yet.`;

  return `<section class="card wide logcard"><h2>${hi('pencil', '#ffdcb8')} Other activity <small>last 30 days</small>
      ${own ? `<button class="btn btn-pink btn-small" data-act="log-add" style="margin-left:12px">${icon('plus')} Log activity</button>` : ''}</h2>
    ${L.entries.length ? `<div class="loggrid"><div>
        <div class="minitiles"><div><b>${L.days30}</b><span>days logged</span></div><div><b>${L.minutes30 ? fmtMins(L.minutes30) : '—'}</b><span>tracked</span></div><div><b>${L.entries30}</b><span>entries</span></div></div>
        ${cats ? `<div style="margin-top:14px">${cats}</div>` : '<p class="muted">Nothing in the last 30 days.</p>'}</div>
      <div class="timeline">${timeline}</div></div>` : `<p class="muted" style="margin:0">${empty}</p>`}</section>`;
}

function openLogModal(p, entry = null) {
  let cat = entry?.category || 'Project';
  const { close, el } = showModal(`<h2>${entry ? 'Edit entry' : 'Log activity'}</h2><p class="muted" style="margin:0">Anything you worked on besides solving problems — it shows on your profile.</p>
    <form autocomplete="off" id="log-form">
      <div class="field"><label>Category</label><div class="topic-pick catpick">${p.categories.map((c) => `<button type="button" class="chip tp" data-cat="${esc(c)}" style="--c:${CAT_COLOR[c] || '#e9e6f2'}" aria-pressed="${c === cat}">${esc(c)}</button>`).join('')}</div></div>
      <div class="field"><label for="l-title">What did you do?</label><input id="l-title" name="title" required maxlength="120" placeholder="e.g. Designed the URL shortener — sharding + caching" value="${esc(entry?.title || '')}"></div>
      <div class="field"><label for="l-notes">Notes <em>(optional)</em></label><textarea id="l-notes" name="notes" rows="3" maxlength="600" placeholder="What you learned, what’s next…">${esc(entry?.notes || '')}</textarea></div>
      <div class="row2"><div class="field"><label for="l-min">Time spent <em>(minutes, optional)</em></label><input id="l-min" name="minutes" type="number" min="1" max="1440" value="${entry?.minutes ?? ''}" placeholder="60">
          <div class="quick">${[15, 30, 60, 90, 120].map((m) => `<button type="button" class="chip tpl" data-min="${m}">${fmtMins(m)}</button>`).join('')}</div></div>
        <div class="field"><label for="l-day">Date</label><input id="l-day" name="day" type="date" max="${p.today}" value="${entry?.day || p.today}" required></div></div>
      <div class="field"><label for="l-link">Link <em>(optional — repo, doc, article)</em></label><input id="l-link" name="link" maxlength="300" placeholder="github.com/you/project" value="${esc(entry?.link || '')}"></div>
      <div class="err" hidden></div>
      <div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="l-go">${entry ? 'Save' : 'Add entry'}</button></div></form>`, 'wide');
  const f = el.querySelector('#log-form');
  el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.cat; el.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  el.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => { f.elements.minutes.value = b.dataset.min; }));
  f.elements.title.focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('#l-go'), err = el.querySelector('.err');
    btn.disabled = true; err.hidden = true;
    const body = { ...Object.fromEntries(new FormData(f)), category: cat };
    try {
      await api(entry ? `/api/activities/${entry.id}` : '/api/activities', { method: entry ? 'PUT' : 'POST', body });
      close(); toast(entry ? 'Entry updated' : 'Logged!'); profilePage(p.username);
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}


/* ---------- profile photo ---------- */
// Centre-crop to a square and shrink to 256px so uploads stay tiny. Uses FileReader (data: URLs) since CSP blocks blob: images.
function fileToSquareJpeg(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Couldn’t read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file doesn’t look like a usable image'));
      img.onload = () => {
        const S = 256, c = document.createElement('canvas');
        c.width = c.height = S;
        const ctx = c.getContext('2d'), m = Math.min(img.width, img.height);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
        resolve(c.toDataURL('image/jpeg', 0.88));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openPhotoModal(p) {
  let pending = null;
  const { close, el } = showModal(`<h2>Profile photo</h2>
    <p class="muted" style="margin:0">Upload your own picture. Without one, we use your LeetCode photo.</p>
    <div class="photo-edit"><div id="ph-prev">${avatar(p, true)}</div>
      <div><label class="btn btn-yellow btn-small" for="ph-file">${icon('camera')} Choose photo</label>
        <input id="ph-file" type="file" accept="image/*" hidden>
        <p class="muted" style="font-size:13px;margin:8px 0 0">Square pictures look best — we crop and resize for you.</p></div></div>
    <div class="err" hidden></div>
    <div class="btns">${p.customAvatar ? '<button type="button" class="btn btn-ghost" id="ph-reset" style="margin-right:auto">Use LeetCode photo</button>' : ''}
      <button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="ph-save" disabled>Save photo</button></div>`);
  const err = el.querySelector('.err'), save = el.querySelector('#ph-save');
  const fail = (m) => { err.textContent = m; err.hidden = false; };
  el.querySelector('#ph-file').addEventListener('change', async (e) => {
    err.hidden = true;
    const f = e.target.files[0];
    if (!f) return;
    try {
      pending = await fileToSquareJpeg(f);
      el.querySelector('#ph-prev').innerHTML = `<img class="avatar lg" src="${pending}" alt="Preview">`;
      save.disabled = false;
    } catch (ex) { fail(ex.message); }
  });
  const done = async (msg) => { close(); toast(msg); await refreshMe(); profilePage(p.username); };
  save.addEventListener('click', async () => {
    save.disabled = true;
    try { await api('/api/me/avatar', { method: 'PUT', body: { image: pending } }); await done('Photo updated'); }
    catch (ex) { fail(ex.message); save.disabled = false; }
  });
  el.querySelector('#ph-reset')?.addEventListener('click', async () => {
    try { await api('/api/me/avatar', { method: 'DELETE' }); await done('Using your LeetCode photo'); } catch (ex) { fail(ex.message); }
  });
}

async function logAction(name, el) {
  const p = currentProfile;
  if (!p || !ownsProfile(p)) return;
  if (name === 'log-add') return openLogModal(p);
  const entry = p.log.entries.find((e) => String(e.id) === el.dataset.id);
  if (!entry) return;
  if (name === 'log-edit') return openLogModal(p, entry);
  if (name === 'log-delete' && await confirmBox('Delete this entry?', entry.title, 'Delete')) {
    try { await api(`/api/activities/${entry.id}`, { method: 'DELETE' }); toast('Entry deleted'); profilePage(p.username); } catch (e) { toast(e.message); }
  }
}


/* ---------- forum ---------- */
const CAT_META = {
  Doubt: { color: '#ffd0e1', icon: 'help', label: 'Doubts', blurb: 'Stuck on something? Ask.' },
  Progress: { color: '#c9f7e3', icon: 'trendUp', label: 'Progress', blurb: 'Share what you’ve been doing.' },
  Feedback: { color: '#fff3b0', icon: 'pencil', label: 'Feedback', blurb: 'Want a second pair of eyes?' },
  Discussion: { color: '#dbe9ff', icon: 'message', label: 'Discussion', blurb: 'Anything else worth talking about.' },
};
const FORUM_SORTS = [['active', 'Latest activity'], ['new', 'Newest'], ['top', 'Most liked'], ['unanswered', 'Unanswered']];
const makeForumState = (extra = {}) => ({ category: '', sort: 'active', q: '', posts: [], page: 1, hasMore: false, ...extra });
const forumState = makeForumState();
let gForum = makeForumState({ groupId: null }); // the open group's discussion
let forumCurrent = null; // the post page being viewed: { post, replies, viewer }

// Plain text -> safe HTML: escape everything first, then add ```code blocks```, `inline code`, links and line breaks.
function renderBody(text) {
  const pieces = String(text).split('```');
  return pieces.map((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf('\n');
      const code = nl >= 0 && /^[a-z0-9+#.-]{0,15}$/i.test(part.slice(0, nl).trim()) ? part.slice(nl + 1) : part;
      return `<pre class="code"><code>${esc(code.replace(/^\n+|\n+$/g, ''))}</code></pre>`;
    }
    // the newlines hugging a code block are layout, not content
    if (i > 0) part = part.replace(/^\n+/, '');
    if (i < pieces.length - 1) part = part.replace(/\n+$/, '');
    let h = esc(part).replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/\bhttps?:\/\/[^\s<]+/g, (u) => {
      const clean = u.replace(/[.,;:!?)]+$/, '');
      return `<a href="${clean}" target="_blank" rel="noopener noreferrer nofollow">${clean}</a>${u.slice(clean.length)}`;
    });
    return h.replace(/\n/g, '<br>');
  }).join('');
}

const catChip = (c) => `<span class="chip cat" style="background:${CAT_META[c]?.color || '#eee'}">${icon(CAT_META[c]?.icon || 'message')} ${esc(c)}</span>`;
const person = (x) => `<span class="fperson">${avatar({ username: x.author, avatar: x.avatar }, 'mini')}<b>${esc(x.name || x.author)}</b><span class="muted">@${esc(x.author)}</span></span>`;

function postCard(p) {
  return `<a class="card fpost" href="/forum/${p.id}" data-link>
    <div class="fstat"><b>${p.likeCount}</b><span>likes</span></div>
    <div class="fstat${p.solved ? ' ok' : p.replyCount ? ' has' : ''}"><b>${p.solved ? icon('check') : p.replyCount}</b><span>${p.solved ? 'solved' : p.replyCount === 1 ? 'reply' : 'replies'}</span></div>
    <div class="fmain"><div class="ftitle">${esc(p.title)}</div>
      ${p.excerpt ? `<div class="fexcerpt">${esc(p.excerpt.replace(/```[a-z0-9+#.-]*\n?/gi, '').replace(/\s+/g, ' ').slice(0, 150))}</div>` : ''}
      <div class="fmeta">${catChip(p.category)}${p.challengeTitle ? `<span class="chip">${icon('target')} ${esc(p.challengeTitle)}</span>` : ''}${p.tags.map((t) => `<span class="chip topic">${esc(t)}</span>`).join('')}
        <span class="fwho">${person(p)} · ${ago(p.lastActivity)}</span></div></div></a>`;
}

// One list implementation for the public forum, a group's discussion and a challenge's threads.
function renderPosts(state, v) {
  const list = $(v.list);
  if (!list) return;
  list.innerHTML = state.posts.length ? state.posts.map(postCard).join('')
    : `<div class="card empty"><span class="big">${icon('message')}</span><h3>${state.q || state.category ? 'Nothing matches that' : 'No posts yet'}</h3>
        <p class="muted">${state.q || state.category ? 'Try a different filter or search.' : v.empty}</p></div>`;
  $(v.more).innerHTML = state.hasMore ? `<button class="btn btn-yellow" data-act="${v.moreAct}">Load more</button>` : '';
}

async function loadPosts(state, url, v, append = false) {
  const q = new URLSearchParams({ category: state.category, sort: state.sort, q: state.q, page: append ? state.page + 1 : 1 });
  const seq = (state.seq = (state.seq || 0) + 1); // ignore out-of-order responses
  try {
    const d = await api(`${url}${url.includes('?') ? '&' : '?'}${q}`);
    if (seq !== state.seq) return;
    state.posts = append ? state.posts.concat(d.posts) : d.posts;
    state.page = d.page; state.hasMore = d.hasMore;
    renderPosts(state, v);
  } catch (e) { const l = $(v.list); if (l) l.innerHTML = `<div class="card empty"><span class="big">${icon('alert')}</span><h3>${esc(e.message)}</h3></div>`; }
}

const PUBLIC_VIEW = { list: '#flist', more: '#fmore', moreAct: 'f-more', empty: 'Be the first — ask a doubt or share how your week went.' };
const GROUP_VIEW = { list: '#gflist', more: '#gfmore', moreAct: 'f-gmore', empty: 'Start the conversation — only your squad can see this.' };
const loadForum = (append = false) => loadPosts(forumState, '/api/forum/posts', PUBLIC_VIEW, append);
const loadGroupForum = (append = false) => loadPosts(gForum, `/api/groups/${gForum.groupId}/forum/posts`, GROUP_VIEW, append);

// Category tabs + search + sort. `data-` attribute prefix differs per list so their click handlers don't collide.
function forumToolbar(state, { catAttr, qId, sortId }) {
  const tabs = [['', 'All'], ...Object.entries(CAT_META).map(([k, v]) => [k, v.label])];
  return `<div class="tabrow" style="margin-top:14px"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab" role="tab" ${catAttr}="${k}" aria-selected="${k === state.category}">${l}</button>`).join('')}</div>
    <div class="forumtools"><input type="search" id="${qId}" placeholder="Search posts…" value="${esc(state.q)}" aria-label="Search posts" maxlength="60">
      <select id="${sortId}" aria-label="Sort">${FORUM_SORTS.map(([k, l]) => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>`;
}
function bindToolbar(state, { qId, sortId }, reload) {
  let t;
  $(`#${qId}`).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); reload(); }, 350); });
  $(`#${sortId}`).addEventListener('change', (e) => { state.sort = e.target.value; reload(); });
}

function forumPage() {
  app.innerHTML = `<section class="hero"><h1>The <span class="hl">forum</span></h1>
    <p>Ask doubts, share your progress, get feedback. Be kind — everyone here is learning. Looking for something private? Every squad has its own discussion tab.</p>
    <div class="stats-strip"><button class="btn btn-pink" data-act="f-new">${icon('plus')} New post</button></div></section>
    ${forumToolbar(forumState, { catAttr: 'data-fcat', qId: 'fq', sortId: 'fsort' })}
    <div id="flist"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div><div id="fmore" style="text-align:center;margin-top:16px"></div>`;
  bindToolbar(forumState, { qId: 'fq', sortId: 'fsort' }, loadForum);
  loadForum();
}

/* ----- single post ----- */
const canModerate = (d, author) => d.viewer && (d.moderator || d.viewer.username.toLowerCase() === author.toLowerCase());
const likeBtn = (target, id, count, liked, own) =>
  `<button class="likebtn${liked ? ' on' : ''}" data-act="f-like" data-target="${target}" data-id="${id}" aria-pressed="${liked}" ${own ? 'disabled title="You can’t like your own post"' : ''}>${icon('thumb')} <span>${count}</span></button>`;

function renderForumPost(d) {
  forumCurrent = d;
  const { post: p, replies, viewer } = d;
  const mine = viewer && viewer.username.toLowerCase() === p.author.toLowerCase();
  const replyHtml = replies.map((r) => {
    const rMine = viewer && viewer.username.toLowerCase() === r.author.toLowerCase();
    return `<article class="card freply${r.accepted ? ' accepted' : ''}" id="r${r.id}">
      ${r.accepted ? `<div class="accbadge">${icon('check')} Accepted answer</div>` : ''}
      <div class="fby"><a href="/u/${encodeURIComponent(r.author)}" data-link>${person(r)}</a><span class="muted">${ago(r.createdAt)}${r.updatedAt > r.createdAt + 60 ? ' · edited' : ''}</span></div>
      <div class="fbody">${renderBody(r.body)}</div>
      <div class="factions">${likeBtn('reply', r.id, r.likeCount, r.liked, rMine)}
        ${mine && p.category === 'Doubt' ? `<button class="btn btn-small ${r.accepted ? 'btn-ghost' : 'btn-mint'}" data-act="f-accept" data-reply="${r.accepted ? '' : r.id}">${icon('check')} ${r.accepted ? 'Unaccept' : 'Accept answer'}</button>` : ''}
        ${rMine ? `<button class="iconbtn" data-act="f-edit-reply" data-id="${r.id}" aria-label="Edit reply" title="Edit">${icon('pencil')}</button>` : ''}
        ${canModerate(d, r.author) ? `<button class="iconbtn" data-act="f-del-reply" data-id="${r.id}" aria-label="Delete reply" title="Delete">${icon('trash')}</button>` : ''}</div></article>`;
  }).join('');

  app.innerHTML = `<a class="back" href="${p.squadId ? `/s/${p.squadId}/discussion` : '/forum'}" data-link>← ${p.squadId ? `${esc(p.squadName || 'Squad')} · Discussion` : 'Forum'}</a>
    <article class="card fpostfull">
      <div class="fhead">${catChip(p.category)}${p.squadId ? `<span class="chip">${icon('lock')} Private to ${esc(p.squadName || 'this squad')}</span>` : ''}${p.challengeId && p.challengeTitle ? `<a class="chip" href="/s/${p.squadId}/c/${p.challengeId}" data-link>${icon('target')} ${esc(p.challengeTitle)}</a>` : ''}${p.solved ? `<span class="chip st-active">${icon('check')} Solved</span>` : ''}</div>
      <h1 class="ptitle">${esc(p.title)}</h1>
      <div class="fby"><a href="/u/${encodeURIComponent(p.author)}" data-link>${person(p)}</a><span class="muted">${ago(p.createdAt)}${p.updatedAt > p.createdAt + 60 ? ' · edited' : ''}</span></div>
      <div class="fbody">${renderBody(p.body)}</div>
      ${p.link ? `<p><a class="chip" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer nofollow">${icon('external')} ${esc(p.link.replace(/^https?:\/\//, '').slice(0, 60))}</a></p>` : ''}
      ${p.tags.length ? `<div class="chips">${p.tags.map((t) => `<span class="chip topic">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="factions">${likeBtn('post', p.id, p.likeCount, p.liked, mine)}
        ${mine ? `<button class="iconbtn" data-act="f-edit-post" aria-label="Edit post" title="Edit">${icon('pencil')}</button>` : ''}
        ${canModerate(d, p.author) ? `<button class="iconbtn" data-act="f-del-post" aria-label="Delete post" title="Delete">${icon('trash')}</button>` : ''}</div>
    </article>
    <div class="sec-head" style="margin-top:26px"><h2>${hi('message', '#dbe9ff')} ${plural(replies.length, 'reply').replace(/^0 replies$/, 'No replies yet')}</h2></div>
    <div class="replies">${replyHtml}</div>
    <section class="card composer"><h2>Your reply</h2>${viewer
      ? `<form id="reply-form"><textarea name="body" rows="5" maxlength="3000" required placeholder="Share what you know. Wrap code in triple backticks."></textarea>
         <div class="err" hidden></div><div class="btns"><button class="btn btn-pink">Post reply</button></div></form>`
      : `<p class="muted">Sign in with your LeetCode account to reply.</p><button class="btn btn-pink" data-join data-title="Sign in" >Sign in</button>`}</section>`;

  $('#reply-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-pink'), err = e.target.querySelector('.err');
    btn.disabled = true; err.hidden = true;
    try { await api(`/api/forum/posts/${p.id}/replies`, { method: 'POST', body: { body: e.target.elements.body.value } }); toast('Reply posted'); forumPostPage(p.id, true); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}

async function forumPostPage(id, keepScroll = false) {
  if (!keepScroll) app.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  try {
    const d = await api(`/api/forum/posts/${id}`);
    if (location.pathname !== `/forum/${id}`) return;
    document.title = `${d.post.title} · LeetSquad`;
    renderForumPost(d);
  } catch (e) {
    app.innerHTML = auth.username
      ? `<div class="card empty" style="margin-top:28px"><span class="big">${icon('search')}</span><h3>${esc(e.message)}</h3><a class="btn btn-yellow" href="/forum" data-link>Back to the forum</a></div>`
      : `<div class="card empty" style="margin-top:28px"><span class="big">${icon('lock')}</span><h3>This post might be private</h3><p class="muted">If it belongs to one of your squads, sign in to see it.</p><button class="btn btn-pink" data-join data-title="Sign in">Sign in</button></div>`;
  }
}

/* ----- composer / editors ----- */
function openPostModal(post = null, prefill = null, scope = null) {
  const start = post || prefill || {};
  let cat = start.category || 'Doubt';
  const picked = new Set(start.tags || []);
  const { close, el } = showModal(`<h2>${post ? 'Edit post' : scope?.challengeTitle ? 'New thread' : 'New post'}</h2>
    ${scope ? `<p class="muted" style="margin:0">${icon('lock')} Only members of <b>${esc(scope.groupName)}</b> can see this${scope.challengeTitle ? ` · about <b>${esc(scope.challengeTitle)}</b>` : ''}.</p>` : ''}
    <form autocomplete="off" id="post-form">
      <div class="field"><label>What kind of post?</label><div class="topic-pick catpick">${Object.entries(CAT_META).map(([k, v]) =>
        `<button type="button" class="chip tp" data-cat="${k}" style="--c:${v.color}" aria-pressed="${k === cat}">${icon(v.icon)} ${k}</button>`).join('')}</div>
        <small id="cat-hint" class="muted"></small></div>
      <div class="field"><label for="p-title">Title</label><input id="p-title" name="title" required minlength="3" maxlength="120" placeholder="e.g. Why does my DP solution TLE on test 40?" value="${esc(start.title || '')}"></div>
      <div class="field"><label for="p-body">Details</label><textarea id="p-body" name="body" rows="8" required maxlength="5000" placeholder="Explain what you tried. Tip: wrap code in triple backticks.">${esc(start.body || '')}</textarea></div>
      <div class="field"><label>Topics <em>(optional, up to 5)</em></label><div class="topic-pick">${TOPICS.map((t) =>
        `<button type="button" class="chip tp" data-tag="${esc(t)}" aria-pressed="${picked.has(t)}">${esc(t)}</button>`).join('')}</div></div>
      <div class="field"><label for="p-link">Related link <em>(optional — problem, repo, submission)</em></label><input id="p-link" name="link" maxlength="300" placeholder="leetcode.com/problems/…" value="${esc(start.link || '')}"></div>
      <div class="err" hidden></div>
      <div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink" id="p-go">${post ? 'Save' : 'Post'}</button></div></form>`, 'wide');
  const hint = () => { el.querySelector('#cat-hint').textContent = CAT_META[cat].blurb; };
  hint();
  el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.cat; el.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); hint();
  }));
  el.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tag;
    if (picked.has(t)) picked.delete(t); else if (picked.size < 5) picked.add(t); else return toast('Up to 5 topics');
    b.setAttribute('aria-pressed', picked.has(t));
  }));
  el.querySelector('#p-title').focus();
  el.querySelector('#post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('#p-go'), err = el.querySelector('.err'), f = e.target.elements;
    btn.disabled = true; err.hidden = true;
    const body = { category: cat, title: f.title.value, body: f.body.value, tags: [...picked], link: f.link.value };
    try {
      if (post) { await api(`/api/forum/posts/${post.id}`, { method: 'PUT', body }); close(); toast('Post updated'); forumPostPage(post.id, true); }
      else {
        const r = scope
          ? await api(`/api/groups/${scope.squadId}/forum/posts`, { method: 'POST', body: { ...body, challengeId: scope.challengeId ?? null } })
          : await api('/api/forum/posts', { method: 'POST', body });
        close(); confetti(); toast('Posted!'); navigate(`/forum/${r.id}`);
      }
    } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
  });
}

function openReplyEditor(reply) {
  const { close, el } = showModal(`<h2>Edit reply</h2><form id="re-form"><div class="field"><textarea name="body" rows="7" maxlength="3000" required>${esc(reply.body)}</textarea></div>
    <div class="err" hidden></div><div class="btns"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-pink">Save</button></div></form>`, 'wide');
  el.querySelector('textarea').focus();
  el.querySelector('#re-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = el.querySelector('.err');
    try { await api(`/api/forum/replies/${reply.id}`, { method: 'PUT', body: { body: e.target.elements.body.value } }); close(); toast('Reply updated'); forumPostPage(forumCurrent.post.id, true); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
}

async function forumAction(name, el) {
  const d = forumCurrent;
  if (name === 'f-new') return needSignIn(() => openPostModal(), 'post in the forum');
  if (name === 'f-more') return loadForum(true);
  if (name === 'f-gmore') return loadGroupForum(true);
  if (name === 'g-new-post' && current) return openPostModal(null, null, { squadId: current.group.id, groupName: current.group.name });
  if (name === 'c-new-thread') return openPostModal(null, { category: 'Discussion' }, { squadId: Number(el.dataset.group), groupName: el.dataset.groupname, challengeId: Number(el.dataset.challenge), challengeTitle: el.dataset.title });
  if (name === 'n-readall') {
    return api('/api/notifications/read', { method: 'POST', body: { all: true } }).then((r) => { auth.unread = r.unread; renderNav(); notificationsPage(); }).catch((e) => toast(e.message));
  }
  if (name === 'f-share') {
    const p = currentProfile;
    return needSignIn(() => openPostModal(null, {
      category: 'Progress', title: `My week: ${p.periods.week.count} problems solved`,
      body: `Last 7 days: ${p.periods.week.count} problems (${p.periods.week.points} pts) · ${p.streak.current}-day streak.\nTotal solved on LeetCode: ${p.totals.all}.\n\nWhat I worked on:\n- `,
    }), 'post in the forum');
  }
  if (name === 'f-like') {
    return needSignIn(async () => {
      try {
        const r = await api('/api/forum/like', { method: 'POST', body: { target: el.dataset.target, id: Number(el.dataset.id) } });
        el.classList.toggle('on', r.liked); el.setAttribute('aria-pressed', r.liked); el.querySelector('span').textContent = r.count;
      } catch (e) { toast(e.message); }
    }, 'like posts');
  }
  if (!d) return;
  if (name === 'f-edit-post') return openPostModal(d.post);
  if (name === 'f-edit-reply') return openReplyEditor(d.replies.find((r) => String(r.id) === el.dataset.id));
  const run = async (fn, msg) => { try { await fn(); toast(msg); } catch (e) { toast(e.message); } };
  if (name === 'f-accept') return run(async () => { await api(`/api/forum/posts/${d.post.id}/accept`, { method: 'POST', body: { replyId: el.dataset.reply ? Number(el.dataset.reply) : null } }); forumPostPage(d.post.id, true); }, el.dataset.reply ? 'Marked as the accepted answer' : 'Answer unaccepted');
  if (name === 'f-del-post' && await confirmBox('Delete this post?', 'The post and all its replies will be removed.', 'Delete'))
    return run(async () => { await api(`/api/forum/posts/${d.post.id}`, { method: 'DELETE' }); navigate(d.post.squadId ? `/s/${d.post.squadId}/discussion` : '/forum'); }, 'Post deleted');
  if (name === 'f-del-reply' && await confirmBox('Delete this reply?', 'This can’t be undone.', 'Delete'))
    return run(async () => { await api(`/api/forum/replies/${el.dataset.id}`, { method: 'DELETE' }); forumPostPage(d.post.id, true); }, 'Reply deleted');
}

/* ---------- nav ---------- */
async function refreshUnread() {
  if (!auth.token) return;
  try { const r = await api('/api/notifications/count'); if (r.unread !== auth.unread) { auth.unread = r.unread; renderNav(); } } catch { /* offline / signed out */ }
}
setInterval(() => { if (!document.hidden) refreshUnread(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });

const NOTIF_ICON = { join_request: 'users', request_approved: 'check', request_declined: 'alert', member_joined: 'users', reply: 'message', thread_reply: 'message', like: 'thumb', accepted: 'check', group_post: 'users', challenge_thread: 'target', challenge_new: 'target' };
const NOTIF_COLOR = { join_request: '#e1d2ff', request_approved: '#c9f7e3', request_declined: '#ffd0e1', member_joined: '#e1d2ff', reply: '#dbe9ff', thread_reply: '#dbe9ff', like: '#ffd0e1', accepted: '#c9f7e3', group_post: '#e1d2ff', challenge_thread: '#fff3b0', challenge_new: '#fff3b0' };
function notifText(n) {
  const who = `<b>${esc(n.name || n.actor || 'Someone')}</b>`, t = n.title ? `“${esc(n.title)}”` : 'a post', grp = `<b>${esc(n.squadName || 'your squad')}</b>`;
  switch (n.type) {
    case 'reply': return `${who} replied to your post ${t}`;
    case 'thread_reply': return `${who} also replied on ${t}`;
    case 'accepted': return `${who} accepted your answer on ${t}`;
    case 'like': return n.replyId ? `${who} liked your reply on ${t}` : `${who} liked your post ${t}`;
    case 'group_post': return `${who} posted in ${grp}: ${t}`;
    case 'challenge_thread': return `${who} started a thread on <b>${esc(n.challengeTitle || 'a challenge')}</b> in ${grp}: ${t}`;
    case 'challenge_new': return `${who} started a challenge in ${grp}: ${t}`;
    case 'join_request': return `${who} asked to join ${grp}`;
    case 'request_approved': return `${who} approved your request to join ${grp}`;
    case 'request_declined': return `${who} declined your request to join ${grp}`;
    case 'member_joined': return `${who} joined ${grp}`;
    default: return `${who} did something in ${grp}`;
  }
}
const notifHref = (n) => (n.type === 'challenge_new' ? `/s/${n.squadId}/c/${n.challengeId}`
  : n.type === 'join_request' ? `/s/${n.squadId}/settings` : n.type === 'request_declined' ? '/squads/mine'
  : n.type === 'request_approved' || n.type === 'member_joined' ? `/s/${n.squadId}` : `/forum/${n.postId}`);

async function notificationsPage() {
  if (!auth.username) {
    app.innerHTML = `<div class="card empty" style="margin-top:28px"><span class="big">${icon('bell')}</span><h3>Sign in to see your notifications</h3><button class="btn btn-pink" data-join data-title="Sign in">Sign in</button></div>`;
    return;
  }
  app.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  try {
    const d = await api('/api/notifications');
    auth.unread = d.unread; renderNav();
    app.innerHTML = `<section class="hero"><h1>Notifications</h1><p>Replies to your posts, answers you gave that were accepted, and what’s happening in your squads.</p>
      ${d.unread ? `<div class="stats-strip"><button class="btn btn-small btn-yellow" data-act="n-readall">${icon('check')} Mark all as read</button></div>` : ''}</section>
      <div class="notifs">${d.items.length ? d.items.map((n) => `<a class="card notif${n.read ? '' : ' unread'}" href="${notifHref(n)}" data-link data-nid="${n.id}">
        <span class="nico" style="background:${NOTIF_COLOR[n.type] || '#eee'}">${icon(NOTIF_ICON[n.type] || 'bell')}</span>
        <div class="ntext"><div>${notifText(n)}</div><div class="muted">${ago(n.createdAt)}</div></div>${n.read ? '' : '<span class="udot" aria-label="Unread"></span>'}</a>`).join('')
        : `<div class="card empty"><span class="big">${icon('bell')}</span><h3>All quiet</h3><p class="muted">When someone replies to you or posts in one of your squads, it shows up here.</p></div>`}</div>`;
  } catch (e) { app.innerHTML = `<div class="card empty"><span class="big">${icon('alert')}</span><h3>${esc(e.message)}</h3></div>`; }
}

function renderNav() {
  const onGroups = /^\/(groups|squads|g\/|s\/|join\/)/.test(location.pathname);
  const onForum = location.pathname.startsWith('/forum');
  $('#nav').innerHTML = `<a class="navlink${onForum ? ' on' : ''}" href="/forum" data-link>${icon('message')} Forum</a><a class="navlink${onGroups ? ' on' : ''}" href="/squads" data-link>${icon('users')} Squads</a>` + (auth.username
    ? `<a class="navlink bell${location.pathname === '/notifications' ? ' on' : ''}" href="/notifications" data-link aria-label="Notifications${auth.unread ? `, ${auth.unread} unread` : ''}" title="Notifications">${icon('bell')}${auth.unread ? `<span class="badge">${auth.unread > 99 ? '99+' : auth.unread}</span>` : ''}</a>
       <a class="mepill" href="/u/${encodeURIComponent(auth.username)}" data-link title="Your profile">${avatar({ username: auth.username, avatar: auth.avatar }, 'mini')}<span class="mename">${esc(auth.username)}</span></a>
       <button class="btn btn-small btn-ghost" data-act="sign-out">Sign out</button>`
    : `<button class="btn btn-pink" data-join data-title="Sign in">Sign in</button>`);
}

/* ---------- routing ---------- */
function navigate(path, replace = false) {
  history[replace ? 'replaceState' : 'pushState']({}, '', path);
  route();
}
function route() {
  // Old /groups and /g/... links (already shared) now live at /squads and /s/...
  const legacy = location.pathname.replace(/^\/groups(?=\/|$)/, '/squads').replace(/^\/g\//, '/s/');
  if (legacy !== location.pathname) history.replaceState({}, '', legacy + location.search);
  clearTimeout(timer);
  window.scrollTo(0, 0);
  renderNav();
  const path = location.pathname;
  let m;
  const setTitle = (t) => { document.title = t ? `${t} · LeetSquad` : 'LeetSquad'; };
  if ((m = path.match(/^\/u\/([^/]+)\/?$/))) { setTitle(decodeURIComponent(m[1])); profilePage(decodeURIComponent(m[1])); }
  else if (/^\/forum\/?$/.test(path)) { setTitle('Forum'); forumPage(); }
  else if ((m = path.match(/^\/forum\/(\d+)\/?$/))) { setTitle('Forum'); forumPostPage(m[1]); }
  else if (/^\/notifications\/?$/.test(path)) { setTitle('Notifications'); notificationsPage(); }
  else if (/^\/(?:groups|squads)(?:\/mine)?\/?$/.test(path)) { setTitle('Squads'); groupsPage(); }
  else if ((m = path.match(/^\/(?:g|s)\/(\d+)\/c\/(\d+)\/?$/))) { setTitle('Challenge'); challengePage(m[1], m[2]); }
  else if ((m = path.match(/^\/(?:g|s)\/(\d+)\/settings\/?$/))) { setTitle('Squad settings'); groupTab = 'settings'; groupPage(m[1]); }
  else if ((m = path.match(/^\/(?:g|s)\/(\d+)\/discussion\/?$/))) { setTitle('Squad discussion'); groupTab = 'discussion'; groupPage(m[1]); }
  else if ((m = path.match(/^\/(?:g|s)\/(\d+)\/?$/))) { setTitle('Squad'); groupTab = 'board'; groupPage(m[1]); }
  else if ((m = path.match(/^\/join\/([^/]+)\/?$/))) { setTitle('Invite'); joinPage(decodeURIComponent(m[1])); }
  else { setTitle(''); home(); }
  setTimeout(refreshUnread, 1500); // opening a post/tab clears its notifications server-side; refresh the badge
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); navigate(a.getAttribute('href')); return; }
  const t = e.target.closest('[data-period]');
  if (t) { period = t.dataset.period; if (rerender) rerender(); return; }
  const nf = e.target.closest('[data-nid]');
  if (nf && auth.token) api('/api/notifications/read', { method: 'POST', body: { ids: [Number(nf.dataset.nid)] } }).catch(() => {});
  const sm = e.target.closest('[data-sqmode]');
  if (sm) { dirState.mode = sm.dataset.sqmode; document.querySelectorAll('[data-sqmode]').forEach((b) => b.setAttribute('aria-selected', b === sm)); loadDirectory(); return; }
  const gfc = e.target.closest('[data-gfcat]');
  if (gfc) { gForum.category = gfc.dataset.gfcat; document.querySelectorAll('[data-gfcat]').forEach((b) => b.setAttribute('aria-selected', b === gfc)); loadGroupForum(); return; }
  const fc = e.target.closest('[data-fcat]');
  if (fc) { forumState.category = fc.dataset.fcat; document.querySelectorAll('[data-fcat]').forEach((b) => b.setAttribute('aria-selected', b === fc)); loadForum(); return; }
  const sc = e.target.closest('[data-source]');
  if (sc) { source = sc.dataset.source; if (rerender) rerender(); return; }
  const pt = e.target.closest('[data-ptab]');
  if (pt) { profTab = pt.dataset.ptab; if (currentProfile) renderProfile(currentProfile); return; }
  const as = e.target.closest('[data-actsrc]');
  if (as) { actSrc = as.dataset.actsrc; if (currentProfile) renderProfile(currentProfile); return; }
  const gt = e.target.closest('[data-gtab]');
  if (gt) { groupTab = gt.dataset.gtab; if (current && rerender) rerender(); return; }
  const j = e.target.closest('[data-join]');
  if (j) { e.preventDefault(); openModal(j.dataset.mode || 'join', '', null, { title: j.dataset.title }); return; }
  const act = e.target.closest('[data-act]');
  if (!act) return;
  if (act.tagName === 'A') e.preventDefault();
  const name = act.dataset.act;
  if (name === 'create-group') openCreateGroup();
  else if (name === 'join-code') openJoinCode();
  else if (name === 'sign-out') {
    api('/api/logout', { method: 'POST' }).catch(() => {});
    setAuth(null, null); toast('Signed out'); route();
  } else if (name === 'photo') { if (currentProfile && ownsProfile(currentProfile)) openPhotoModal(currentProfile); }
  else if (name === 'links') { e.preventDefault(); if (currentProfile && ownsProfile(currentProfile)) openLinksModal(currentProfile); }
  else if (name.startsWith('sq-')) squadAction(name, act);
  else if (name.startsWith('f-') || ['g-new-post', 'c-new-thread', 'n-readall'].includes(name)) forumAction(name, act);
  else if (name.startsWith('log-')) logAction(name, act);
  else groupAction(name, act);
});
window.addEventListener('popstate', route);
if (auth.token) refreshMe();
route();
