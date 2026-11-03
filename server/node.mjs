import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { mkdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createApi } from './api.js';
import { createFirebaseVerifier } from './firebase-auth.js';
import { SqliteStore } from './sqlite-store.js';
import { securityHeaders, contentSecurityPolicy } from './security.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.API_PORT ?? 4174);
const host = process.env.HOST ?? '127.0.0.1';
const origin = process.env.PUBLIC_ORIGIN ?? 'http://localhost:5173';
const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY;
if (!projectId || !apiKey) {
  console.error(
    'Google 로그인 설정이 필요합니다. docs/firebase-setup.md와 .env.example을 확인하세요.',
  );
  process.exit(1);
}
const production = process.env.NODE_ENV === 'production';
if (production && (!origin.startsWith('https://') || !process.env.PLAYER_ID_SECRET))
  throw new Error('Production requires HTTPS PUBLIC_ORIGIN and PLAYER_ID_SECRET.');
if (
  production &&
  (!existsSync(resolve(root, 'dist/build-mode.json')) ||
    JSON.parse(readFileSync(resolve(root, 'dist/build-mode.json'), 'utf8')).mode !== 'server')
)
  throw new Error('Run npm run build:secure before production startup.');
if (!production && !['127.0.0.1', 'localhost', '::1'].includes(host))
  throw new Error('Development API must bind to loopback.');
mkdirSync(resolve(root, '.local'), { recursive: true });
const secretFile = resolve(root, '.local', 'identity-secret');
let secret = process.env.PLAYER_ID_SECRET;
if (!secret) {
  if (!existsSync(secretFile))
    writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600 });
  secret = readFileSync(secretFile, 'utf8').trim();
}
const store = new SqliteStore(process.env.GAME_DB_PATH ?? resolve(root, '.local', 'game.sqlite'));
const api = createApi({
  store,
  authenticate: createFirebaseVerifier({ projectId, apiKey }),
  secret,
  origin,
});
const dist = resolve(root, 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/')) {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers))
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
      // Never trust a direct caller's proxy IP header on the standalone server.
      headers.set('cf-connecting-ip', req.socket.remoteAddress ?? 'local');
      const request = new Request(url, {
        method: req.method,
        headers,
        ...(req.method !== 'GET' && req.method !== 'HEAD'
          ? { body: Readable.toWeb(req), duplex: 'half' }
          : {}),
      });
      const response = await api(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, securityHeaders);
      res.end();
      return;
    }
    const decoded = decodeURIComponent(url.pathname);
    let path = resolve(dist, `.${decoded}`);
    if (
      decoded.includes('\0') ||
      (path !== dist && !path.startsWith(dist + sep)) ||
      decoded.split('/').some((s) => s.startsWith('.') && s !== '')
    ) {
      res.writeHead(404, securityHeaders);
      res.end();
      return;
    }
    if (!extname(path)) path = resolve(dist, 'index.html');
    if (!existsSync(path) || !statSync(path).isFile()) {
      res.writeHead(404, securityHeaders);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      ...securityHeaders,
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'Content-Security-Policy': contentSecurityPolicy(),
      ...(production ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
    });
    res.end(req.method === 'HEAD' ? '' : readFileSync(path));
  } catch {
    res.writeHead(500, securityHeaders);
    res.end('Request failed');
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.maxHeadersCount = 40;
server.listen(port, host, () =>
  console.log(`SASAGo3 authoritative API: http://${host}:${port} · allowed game origin ${origin}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      store.close();
      process.exit(0);
    });
  });
