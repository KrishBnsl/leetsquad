// Local server: serves the static site + the API, runs the sync worker loop and daily backups.
// (On Vercel the static files come from the CDN, the API is api/[...path].js, and the worker is a GitHub Action.)
import './env.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, IS_TURSO, localDb } from './db.js';
import { handle, SECURITY_HEADERS } from './app.js';
import { startScheduler, RUN_WORKER } from './sync.js';
import { startClistScheduler } from './clist.js';
import { startBackups } from './backup.js';
import { TZ } from './stats.js';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 3000;
// Loopback only by default: a tunnel/proxy on this machine is the way in. Set HOST=0.0.0.0 to expose on your network.
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, pathname) {
  const deny = (code, msg) => { res.writeHead(code, { ...SECURITY_HEADERS, 'content-type': 'text/plain' }); res.end(msg); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return deny(405, 'Method not allowed');
  let file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC + path.sep) && file !== PUBLIC) return deny(403, 'Forbidden');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(pathname)) return deny(404, 'Not found');
    file = path.join(PUBLIC, 'index.html'); // SPA fallback
  }
  res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  req.on('error', (e) => console.error('[request error]', e.message));
  try {
    if (await handle(req, res)) return;
    serveStatic(req, res, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.writeHead(500, { 'content-type': 'application/json' }); res.end('{"error":"Something went wrong"}'); }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🏆 LeetSquad running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (day boundary: ${TZ}, database: ${IS_TURSO ? 'Turso/libSQL' : 'local file'})`);
  if (RUN_WORKER) { startScheduler(); startClistScheduler(); }
  if (!IS_TURSO) startBackups(); // Turso keeps its own point-in-time backups
});

// Clean stop: finish the WAL so the database file on disk is complete.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close();
    try { localDb?.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* ignore */ }
    process.exit(0);
  });
}
// A failed background fetch must never take the whole site down.
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
