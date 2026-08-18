// Waitlist signup capture. Deliberately tiny and dependency-free (only
// Node's stdlib) so the entire thing that ever touches a subscriber's email
// address fits on one screen and can be read in a couple of minutes.
//
// Design constraints (see conversation, not repeated in code elsewhere):
//   - This is a one-time list, not a mailing platform. No campaigns, no
//     third parties, no analytics.
//   - Write-only. There is no route anywhere that reads the list back over
//     HTTP, even internally — the only way to get emails out is `docker
//     exec` into this container on the box itself.
//   - Not reachable from the internet directly (no published port); Caddy
//     is the only thing that can reach it, over Docker's internal network,
//     for the one POST route it proxies.
//   - Bot defenses are all silent and self-hosted: a honeypot field, a
//     minimum-fill-time check, and per-IP rate limiting. No CAPTCHA, no
//     external script of any kind.

import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const PORT = process.env.PORT || 8090;
const DATA_FILE = process.env.DATA_FILE || '/data/waitlist.ndjson';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://kowloon.network';

const MAX_BODY_BYTES = 2048;
const MIN_FILL_MS = 1500; // faster than this from page-load = almost certainly a bot
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8; // requests per IP per window
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

mkdirSync(dirname(DATA_FILE), { recursive: true });

const seen = new Set();
if (existsSync(DATA_FILE)) {
  for (const line of readFileSync(DATA_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      seen.add(JSON.parse(line).email);
    } catch {
      // ignore a malformed line rather than fail startup over it
    }
  }
}

const rateLimits = new Map(); // ip -> { count, windowStart }
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, entry] of rateLimits) {
    if (entry.windowStart < cutoff) rateLimits.delete(ip);
  }
}, 5 * 60_000).unref();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  withCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    withCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200);
    res.end('ok');
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' });
    return;
  }

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    sendJson(res, 429, { ok: false, error: 'too many requests' });
    return;
  }

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid request' });
    return;
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const honeypot = String(payload.company || '');
  const loadedAt = Number(payload.loadedAt) || 0;

  if (!EMAIL_RE.test(email)) {
    sendJson(res, 400, { ok: false, error: 'enter a valid email address' });
    return;
  }

  // Bot signals below are handled *silently* — a fake success, no
  // indication anything was rejected, so a bot script has nothing to learn
  // from the response and no reason to adapt.
  const tooFast = loadedAt > 0 && Date.now() - loadedAt < MIN_FILL_MS;
  if (honeypot.trim() !== '' || tooFast) {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!seen.has(email)) {
    seen.add(email);
    appendFileSync(DATA_FILE, JSON.stringify({ email, ts: Date.now() }) + '\n');
  }

  sendJson(res, 200, { ok: true });
});

server.listen(PORT, () => {
  console.log(`waitlist service listening on :${PORT}, writing to ${DATA_FILE}`);
});
