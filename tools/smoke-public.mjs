import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const origin = new URL(process.argv[2] ?? config.match(/^PUBLIC_ORIGIN\s*=\s*"([^"]+)"/m)?.[1]);
assert.equal(origin.protocol, 'https:', 'Public API checks require HTTPS.');
async function probe(path, options) {
  const response = await fetch(new URL(path, origin), {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  assert.ok(response.headers.get('X-Request-ID'), 'Missing request trace');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return { status: response.status, body, hsts: response.headers.has('Strict-Transport-Security') };
}
const [health, anonymous, foreign] = await Promise.all([
  probe('/api/health'),
  probe('/api/game'),
  probe('/api/action', {
    method: 'POST',
    headers: { Origin: 'https://foreign.invalid', 'Content-Type': 'application/json' },
    body: '{}',
  }),
]);
assert.equal(health.status, 200);
assert.equal(health.body.mode, 'server');
assert.ok(health.hsts);
assert.equal(anonymous.status, 401);
assert.equal(foreign.status, 403);
console.log(
  JSON.stringify(
    {
      origin: origin.origin,
      health: health.status,
      anonymousDenied: anonymous.status,
      foreignOriginDenied: foreign.status,
      contentVersion: health.body.contentVersion,
      authenticatedSaveVerified: false,
    },
    null,
    2,
  ),
);
