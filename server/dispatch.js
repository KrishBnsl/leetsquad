// Optional: ask GitHub Actions to run the sync worker right now (instead of waiting for the next scheduled run).
// Needs GH_REPO ("owner/name") and GH_DISPATCH_TOKEN (fine-grained token with "Actions: read & write" on that repo).
import { kvGet, kvSet } from './clist.js';

export const dispatchConfigured = () => !!(process.env.GH_REPO && process.env.GH_DISPATCH_TOKEN);

// minGap: don't start another run if one was requested less than this many seconds ago.
export async function dispatchWorker({ minGap = 45 } = {}) {
  if (!dispatchConfigured()) return false;
  const last = Number(await kvGet('last_dispatch') || 0);
  if (Date.now() / 1000 - last < minGap) return false; // one run is enough for a burst of requests
  await kvSet('last_dispatch', Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(`${process.env.GH_API_URL || 'https://api.github.com'}/repos/${process.env.GH_REPO}/actions/workflows/sync.yml/dispatches`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json', 'user-agent': 'LeetSquad',
        authorization: `Bearer ${process.env.GH_DISPATCH_TOKEN}`, 'content-type': 'application/json',
      },
      body: JSON.stringify({ ref: process.env.GH_BRANCH || 'main' }),
      signal: AbortSignal.timeout(8000),
    });
    return res.status === 204;
  } catch { return false; }
}
