import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { nodeVersionOk, portFree, presentEnvKeys } from '../../tools/play.mjs';

test('the launcher accepts the Node versions package.json allows', () => {
  assert.equal(nodeVersionOk('22.12.0'), true);
  assert.equal(nodeVersionOk('24.1.0'), true);
  assert.equal(nodeVersionOk('22.11.9'), false);
  assert.equal(nodeVersionOk('20.18.0'), false);
});

test('login settings are detected by key presence without exposing values', () => {
  const keys = presentEnvKeys(
    'VITE_FIREBASE_API_KEY=abc\r\nVITE_FIREBASE_AUTH_DOMAIN=\n# VITE_FIREBASE_APP_ID=x\nVITE_FIREBASE_PROJECT_ID="p"\n',
  );
  assert.deepEqual([...keys].sort(), ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID']);
  assert.ok(
    [...keys].every((key) => !key.includes('abc')),
    'returns names only',
  );
});

test('a port held by another program is reported busy and released ports are free', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  assert.equal(await portFree(port), false);
  await new Promise((resolve) => server.close(resolve));
  assert.equal(await portFree(port), true);
});
