import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError } from './security.js';

const GOOGLE_KEYS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);
export function createFirebaseVerifier({
  projectId,
  apiKey,
  keySet = GOOGLE_KEYS,
  lookup = fetch,
}) {
  if (!/^[a-z0-9][a-z0-9-]{3,62}$/.test(projectId ?? '') || !apiKey)
    throw new Error('Firebase projectId and public apiKey are required.');
  return async (request) => {
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 8200)
      throw new ApiError(401, 'AUTH_REQUIRED', 'Google 로그인이 필요해요.');
    const token = authorization.slice(7);
    try {
      const { payload } = await jwtVerify(token, keySet, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        clockTolerance: 5,
        requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
      });
      const now = Date.now() / 1000;
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        payload.sub.length > 128 ||
        typeof payload.auth_time !== 'number' ||
        payload.auth_time > now + 5 ||
        typeof payload.iat !== 'number' ||
        payload.iat > now + 5 ||
        !payload.email_verified ||
        payload.firebase?.sign_in_provider !== 'google.com'
      )
        throw new Error('claims');
      // Check disabled/revoked users with Google, rather than accepting a signed token until expiry.
      const response = await lookup(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error('lookup');
      const account = (await response.json()).users?.[0];
      if (
        !account ||
        account.localId !== payload.sub ||
        account.disabled ||
        Number(account.validSince ?? 0) > payload.auth_time
      )
        throw new Error('revoked');
      return payload.sub;
    } catch {
      throw new ApiError(
        401,
        'AUTH_INVALID',
        '로그인이 만료되었거나 사용할 수 없어요. 다시 로그인해 주세요.',
      );
    }
  };
}
