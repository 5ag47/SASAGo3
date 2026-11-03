import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../server/worker.js';
const request = (path = '/') => new Request(`https://game.example${path}`);
const env = (mode = 'server') => ({
  DB: { prepare: () => ({ bind: () => ({ first: async () => ({ count: 1 }) }) }) },
  PLAYER_ID_SECRET: 'test-only-secret-123456789012345678901234567890',
  PUBLIC_ORIGIN: 'https://game.example',
  FIREBASE_PROJECT_ID: 'sasago3',
  FIREBASE_API_KEY: 'test-key',
  ASSETS: {
    fetch: async (request) =>
      new URL(request.url).pathname === '/build-mode.json'
        ? Response.json({ mode })
        : new Response('<main>game</main>', { headers: { 'Content-Type': 'text/html' } }),
  },
});
test('Worker denies missing secrets and browser-save builds before serving the game', async () => {
  const missing = await worker.fetch(request(), {});
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).code, 'SERVER_NOT_CONFIGURED');
  const unsafe = await worker.fetch(request(), env('local'));
  assert.equal(unsafe.status, 503);
  assert.equal((await unsafe.json()).code, 'SECURE_BUILD_REQUIRED');
});
test('Worker health and assets carry secure response headers', async () => {
  const instance = env();
  const health = await worker.fetch(request('/api/health'), instance);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).mode, 'server');
  assert.ok(health.headers.get('Strict-Transport-Security'));
  const page = await worker.fetch(request(), instance);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('X-Frame-Options'), 'DENY');
  assert.ok(page.headers.get('Content-Security-Policy').includes("object-src 'none'"));
});
