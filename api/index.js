// Vercel serverless entry: vercel.json rewrites every /api/* request here and is handled by the shared API (server/app.js).
import { handle } from '../server/app.js';

export default async function handler(req, res) {
  if (!(await handle(req, res))) {
    res.statusCode = 404;
    res.end('Not found');
  }
}
