import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { createFirebaseVerifier } from '../../server/firebase-auth.js';
const projectId = 'test-project';
const now = Math.floor(Date.now() / 1000);
const { privateKey, publicKey } = await generateKeyPair('RS256');
async function signed(extra = {}, signingKey = privateKey) {
  return new SignJWT({
    auth_time: now - 10,
    email_verified: true,
    firebase: { sign_in_provider: 'google.com' },
    ...extra,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject('uid-123')
    .setAudience(extra.aud ?? projectId)
    .setIssuer(extra.iss ?? `https://securetoken.google.com/${projectId}`)
    .setIssuedAt(extra.iat ?? now - 1)
    .setExpirationTime(extra.exp ?? now + 3600)
    .sign(signingKey);
}
const lookup = async () =>
  Response.json({ users: [{ localId: 'uid-123', validSince: String(now - 100) }] });
const request = (token) =>
  new Request('https://example.test/api/game', { headers: { Authorization: `Bearer ${token}` } });
test('verified Firebase Google tokens return only the verified uid', async () => {
  const verify = createFirebaseVerifier({
    projectId,
    apiKey: 'public-test',
    keySet: publicKey,
    lookup,
  });
  assert.equal(await verify(request(await signed())), 'uid-123');
});
test('wrong project, issuer, expired time, unverified email and non-Google providers are denied', async () => {
  const verify = createFirebaseVerifier({
    projectId,
    apiKey: 'public-test',
    keySet: publicKey,
    lookup,
  });
  for (const fields of [
    { aud: 'other-project' },
    { iss: 'https://evil.example' },
    { exp: now - 100 },
    { iat: now + 100 },
    { auth_time: now + 100 },
    { email_verified: false },
    { firebase: { sign_in_provider: 'anonymous' } },
  ])
    await assert.rejects(
      () => signed(fields).then((token) => verify(request(token))),
      (e) => e.code === 'AUTH_INVALID',
    );
});
test('a token with a forged signature is denied', async () => {
  const other = await generateKeyPair('RS256');
  const verify = createFirebaseVerifier({
    projectId,
    apiKey: 'public-test',
    keySet: publicKey,
    lookup,
  });
  await assert.rejects(
    () => signed({}, other.privateKey).then((token) => verify(request(token))),
    (e) => e.code === 'AUTH_INVALID',
  );
});
test('disabled and revoked accounts are denied even with a valid signature', async () => {
  for (const account of [
    { localId: 'uid-123', disabled: true },
    { localId: 'uid-123', validSince: String(now + 100) },
    { localId: 'another-user' },
  ]) {
    const verify = createFirebaseVerifier({
      projectId,
      apiKey: 'public-test',
      keySet: publicKey,
      lookup: async () => Response.json({ users: [account] }),
    });
    await assert.rejects(
      () => signed().then((token) => verify(request(token))),
      (e) => e.code === 'AUTH_INVALID',
    );
  }
});
