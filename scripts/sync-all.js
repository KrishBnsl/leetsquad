// The background worker (run by .github/workflows/sync.yml, or by hand): syncs every user that is due,
// including anyone who asked for a refresh, then refreshes problem ratings if they're over a day old.
import '../server/env.js';

// In GitHub Actions an unset secret arrives as an empty string, which would silently fall back to an empty local
// database and report a pointless "success". Say so loudly instead (as a warning, not a failure, so setup doesn't spam emails).
if (process.env.GITHUB_ACTIONS && !process.env.TURSO_DATABASE_URL) {
  console.log('::warning title=Sync skipped::TURSO_DATABASE_URL is not set. Add the repository secrets (see README step 5) and re-run.');
  process.exit(0);
}
const { ready } = await import('../server/db.js');
const { runSyncPass } = await import('../server/sync.js');
const { refreshClistIfDue } = await import('../server/clist.js');
await ready;

const t0 = Date.now();
const users = await runSyncPass({ sweep: true });
const ratings = await refreshClistIfDue();
console.log(`[worker] synced ${users} user(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s${ratings ? ' · refreshed problem ratings' : ''}`);
process.exit(0);
