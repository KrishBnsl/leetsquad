// Link previews for squad pages: /join/CODE and /s/ID are rewritten here so crawlers see the squad's own title and
// description in the static <head>. Browsers get the same HTML and the SPA takes over as usual.
import { db, ready } from '../server/db.js';
import { normalizeCode, cardFields } from '../server/squads.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const MODES = { open: 'Open to everyone', request: 'Join by request', invite: 'Invite only' };

async function lookup(kind, v) {
  await ready;
  const cols = 's.*, (SELECT COUNT(*) FROM squad_members m WHERE m.squad_id = s.id) AS members';
  if (kind === 'join') return db.get(`SELECT ${cols} FROM squads s WHERE s.code = ?`, normalizeCode(v));
  const s = await db.get(`SELECT ${cols} FROM squads s WHERE s.id = ?`, Number(v) || 0);
  return s && s.listed ? s : null; // unlisted squads are only revealed by their invite code
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const kind = url.searchParams.get('kind') === 'join' ? 'join' : 'squad';
  const v = url.searchParams.get('v') || '';
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  try {
    const page = await fetch(`${origin}/index.html`);
    if (!page.ok) throw new Error('template');
    let html = await page.text();
    const s = await lookup(kind, v).catch(() => null);
    if (s) {
      const c = cardFields(s);
      const what = clip(c.tagline || c.about || 'A squad on LeetSquad', 110).replace(/[.!?…]*$/, '.');
      const title = kind === 'join' ? `Join ${s.name} on LeetSquad` : `${s.name} · LeetSquad squad`;
      const desc = `${what} ${s.members} member${s.members === 1 ? '' : 's'} · ${MODES[c.joinMode] || 'Invite only'}. Track LeetCode, Codeforces and GitHub together.`;
      const page = `${origin}${kind === 'join' ? '/join/' + encodeURIComponent(v) : '/s/' + s.id}`;
      const set = (re, val) => { html = html.replace(re, (_, a, b) => `${a}${esc(val)}${b}`); };
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
      set(/(<meta name="description" content=")[^"]*(")/, desc);
      set(/(<meta property="og:title" content=")[^"]*(")/, title);
      set(/(<meta property="og:description" content=")[^"]*(")/, desc);
      set(/(<meta property="og:url" content=")[^"]*(")/, page);
      set(/(<meta name="twitter:title" content=")[^"]*(")/, title);
      set(/(<meta name="twitter:description" content=")[^"]*(")/, desc);
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.end(html);
  } catch {
    res.statusCode = 302;
    res.setHeader('location', '/');
    res.end();
  }
}
