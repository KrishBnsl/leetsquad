// Optional: problem ratings from clist.by (https://clist.by/api/v4/doc/).
// Needs a free clist account: set CLIST_USERNAME and CLIST_API_KEY. Without them this module does nothing.
import { db, batchChunks } from './db.js';
import { sleep } from './leetcode.js';

const BASE = process.env.CLIST_URL || 'https://clist.by/api/v4';
const REFRESH_EVERY_S = 24 * 3600;
const PAGE = 1000;

export const clistEnabled = () => !!(process.env.CLIST_USERNAME && process.env.CLIST_API_KEY);

export const kvGet = async (k) => (await db.get('SELECT value FROM kv WHERE key = ?', k))?.value;
export const kvSet = (k, v) => db.run('INSERT INTO kv (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, String(v));

// Where each clist resource's problems map onto our own problem slugs.
const CF_URL = /codeforces\.com\/(?:(?:contest|gym)\/(\d+)\/problem\/|problemset\/problem\/(\d+)\/)([A-Za-z0-9]+)/;
const RESOURCES = [
  // clist gives the LeetCode titleSlug directly; `url` points at the contest page, `archive_url` at /problems/<slug>.
  { resource: 'leetcode.com', slugOf: (o) => o.slug || /leetcode\.com\/problems\/([^/?#]+)/.exec(o.archive_url || o.url || '')?.[1] },
  { resource: 'codeforces.com', slugOf: (o) => { const m = CF_URL.exec(o.url || ''); return m ? `cf:${m[1] || m[2]}${m[3]}` : null; } },
];

async function page(resource, offset, attempt = 0) {
  const url = `${BASE}/problem/?${new URLSearchParams({ resource, limit: PAGE, offset, order_by: 'id' })}`;
  const res = await fetch(url, {
    headers: { authorization: `ApiKey ${process.env.CLIST_USERNAME}:${process.env.CLIST_API_KEY}`, accept: 'application/json' },
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 429 && attempt < 4) { await sleep(15000 * (attempt + 1)); return page(resource, offset, attempt + 1); }
  if (res.status === 401 || res.status === 403) throw new Error('clist rejected the API credentials');
  if (!res.ok) throw new Error(`clist returned ${res.status}`);
  return res.json();
}

// Pulls problem ratings for LeetCode and Codeforces. Unrated problems (older LeetCode, gym contests) are simply skipped
// and keep their Easy/Medium/Hard or Codeforces-API rating.
export async function refreshClist() {
  if (!clistEnabled()) return;
  const saved = {};
  try {
    for (const { resource, slugOf } of RESOURCES) {
      let offset = 0;
      saved[resource] = 0;
      for (let i = 0; i < 60; i++) {
        const data = await page(resource, offset);
        const objects = data.objects || [];
        const stmts = [];
        for (const o of objects) {
          const slug = slugOf(o);
          const rating = Number(o.rating);
          if (slug && Number.isFinite(rating) && rating > 0) { stmts.push(['INSERT OR REPLACE INTO clist_ratings (slug, rating) VALUES (?,?)', slug, Math.round(rating)]); saved[resource]++; }
        }
        await batchChunks(stmts);
        if (objects.length < PAGE) break;
        offset += PAGE;
        await sleep(7000); // clist allows 10 requests/minute
      }
      await sleep(7000);
    }
    await kvSet('clist_synced', Math.floor(Date.now() / 1000));
    await kvSet('clist_error', '');
    console.log(`[clist] saved ratings:`, JSON.stringify(saved));
  } catch (e) {
    await kvSet('clist_error', e.message);
    console.error('[clist]', e.message);
  }
}

// Refresh only when the last successful run is over a day old.
export async function refreshClistIfDue() {
  if (!clistEnabled()) return false;
  const last = Number(await kvGet('clist_synced') || 0);
  if (Date.now() / 1000 - last <= REFRESH_EVERY_S) return false;
  await refreshClist();
  return true;
}

export function startClistScheduler() {
  if (!clistEnabled()) { console.log('[clist] CLIST_USERNAME / CLIST_API_KEY not set — LeetCode ratings disabled'); return; }
  const tick = () => { refreshClistIfDue().catch((e) => console.error('[clist]', e)); };
  setTimeout(tick, 15000);
  setInterval(tick, 3600_000).unref();
}
