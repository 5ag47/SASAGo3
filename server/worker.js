import { createApi } from './api.js';
import { D1Store } from './d1-store.js';
import { createFirebaseVerifier } from './firebase-auth.js';
import { securityHeaders, contentSecurityPolicy } from './security.js';
let handler;
let environment;
export default {
  async fetch(request, env) {
    const trace = crypto.randomUUID();
    try {
      if (!env.DB || !env.PLAYER_ID_SECRET || !env.PUBLIC_ORIGIN?.startsWith('https://'))
        return Response.json(
          { code: 'SERVER_NOT_CONFIGURED', trace },
          { status: 503, headers: { ...securityHeaders, 'X-Request-ID': trace } },
        );
      const build = await env.ASSETS.fetch(new Request(new URL('/build-mode.json', request.url)));
      if (!build.ok || (await build.json()).mode !== 'server')
        return Response.json(
          { code: 'SECURE_BUILD_REQUIRED', trace },
          { status: 503, headers: { ...securityHeaders, 'X-Request-ID': trace } },
        );
      if (new URL(request.url).pathname.startsWith('/api/')) {
        if (environment !== env) {
          environment = env;
          handler = createApi({
            store: new D1Store(env.DB),
            authenticate: createFirebaseVerifier({
              projectId: env.FIREBASE_PROJECT_ID,
              apiKey: env.FIREBASE_API_KEY,
            }),
            secret: env.PLAYER_ID_SECRET,
            origin: env.PUBLIC_ORIGIN,
          });
        }
        const response = await handler(request);
        const headers = new Headers(response.headers);
        headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        return new Response(response.body, { status: response.status, headers });
      }
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
      headers.set('Content-Security-Policy', contentSecurityPolicy());
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      console.error(
        JSON.stringify({
          at: new Date().toISOString(),
          trace,
          code: 'WORKER_FAILURE',
          errorType: error.name,
          frames: String(error.stack ?? '')
            .split('\n')
            .slice(1, 6)
            .map((frame) => frame.trim()),
        }),
      );
      return Response.json(
        { code: 'SERVER_UNAVAILABLE', trace },
        { status: 503, headers: { ...securityHeaders, 'X-Request-ID': trace } },
      );
    }
  },
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM rate_limits WHERE window < ?')
      .bind(Math.floor(Date.now() / 60000) - 5)
      .run();
  },
};
