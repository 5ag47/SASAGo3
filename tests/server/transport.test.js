import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApiTransport } from '../../src/platform/api-transport.js';
import { createApi } from '../../server/api.js';
import { SqliteStore } from '../../server/sqlite-store.js';
const origin = 'https://test.example';
test('a lost response retries the same command key and server purchase occurs exactly once', async (t) => {
  const store = new SqliteStore(':memory:');
  t.after(() => store.close());
  const api = createApi({
    store,
    origin,
    secret: 'test-only-secret-123456789012345678901234567890',
    authenticate: async () => 'test-player',
    logger: () => {},
  });
  let loseResponse = false;
  const bodies = [];
  const logs = [];
  const client = createApiTransport({
    getToken: async () => 'test-bearer-secret',
    pause: async () => {},
    onTrace: (...args) => logs.push(args),
    fetcher: async (path, options) => {
      const response = await api(
        new Request(origin + path, { ...options, headers: { ...options.headers, Origin: origin } }),
      );
      if (options.method === 'POST') bodies.push(options.body);
      if (loseResponse) {
        loseResponse = false;
        throw new TypeError('response connection lost');
      }
      return response;
    },
  });
  let session = await client.request('/api/game');
  const send = (command) =>
    client.request('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: session.state.revision,
        idempotencyKey: randomUUID(),
        command,
      }),
    });
  session = await send({
    type: 'create',
    profile: { name: '구매 테스트', character: 'boy', role: 'steady', major: 'math' },
  });
  const before = session.state.money;
  loseResponse = true;
  session = await send({ type: 'buy', item: 'milk' });
  assert.equal(session.state.money, before - 1800);
  assert.equal(session.replayed, true);
  assert.equal(bodies.at(-1), bodies.at(-2));
  assert.ok(logs.some((entry) => entry[2].trace));
  assert.ok(!JSON.stringify(logs).includes('test-bearer-secret'));
});
test('unconfirmed mutations fail with an explicit uncertain outcome after bounded retries', async () => {
  let calls = 0;
  const client = createApiTransport({
    getToken: async () => 'token',
    pause: async () => {},
    fetcher: async () => {
      calls++;
      throw new TypeError('offline');
    },
  });
  await assert.rejects(
    client.request('/api/action', { method: 'POST', body: '{}' }),
    (error) => error.code === 'REQUEST_UNCERTAIN' && error.outcomeUnknown,
  );
  assert.equal(calls, 2);
});
test('permission failures do not retry and retain the request trace', async () => {
  let calls = 0;
  const client = createApiTransport({
    getToken: async () => 'token',
    fetcher: async () => {
      calls++;
      return new Response(JSON.stringify({ code: 'CSRF_INVALID', message: '만료' }), {
        status: 403,
        headers: { 'X-Request-ID': 'trace-test' },
      });
    },
  });
  await assert.rejects(
    client.request('/api/action', { method: 'POST' }),
    (error) => error.code === 'CSRF_INVALID' && error.trace === 'trace-test',
  );
  assert.equal(calls, 1);
});
test('read failures and login network failures do not claim a mutation is uncertain', async () => {
  const client = createApiTransport({
    getToken: async () => 'token',
    pause: async () => {},
    fetcher: async () => new Response('bad gateway', { status: 502 }),
  });
  await assert.rejects(
    client.request('/api/game'),
    (error) => error.code === 'NETWORK_UNAVAILABLE' && !error.outcomeUnknown,
  );
  const authOffline = createApiTransport({
    getToken: async () => {
      throw Object.assign(new Error('offline'), { code: 'auth/network-request-failed' });
    },
  });
  await assert.rejects(
    authOffline.request('/api/game'),
    (error) => error.code === 'NETWORK_UNAVAILABLE',
  );
});
