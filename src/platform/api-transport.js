import { GameError } from '../domain/engine.js';
import { CONTENT_VERSION } from '../domain/state.js';

const transientStatuses = new Set([500, 502, 503, 504]);
export function createApiTransport({
  getToken,
  fetcher = globalThis.fetch,
  onTrace = () => {},
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 15000,
}) {
  let csrf;
  function failure(code, message, detail = {}) {
    return Object.assign(new GameError(code, message), detail);
  }
  async function request(path, options = {}) {
    const mutation = options.method === 'POST';
    for (let attempt = 0; attempt < 2; attempt++) {
      let token;
      try {
        token = await getToken();
      } catch (error) {
        if (error.code === 'auth/network-request-failed')
          throw failure(
            'NETWORK_UNAVAILABLE',
            '로그인 서버에 연결하지 못했습니다. 연결을 확인해 주세요.',
          );
        throw failure('AUTH_REQUIRED', '로그인이 만료됐습니다. 다시 로그인해 주세요.');
      }
      let trace;
      try {
        const response = await fetcher(path, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
            'X-Game-Version': CONTENT_VERSION,
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
          credentials: 'same-origin',
          cache: 'no-store',
          signal: AbortSignal.timeout(timeoutMs),
        });
        trace = response.headers.get('X-Request-ID') ?? undefined;
        let body;
        try {
          body = await response.json();
        } catch {
          throw failure('RESPONSE_INVALID', '서버 응답을 확인하지 못했습니다.', {
            transient: true,
            trace,
          });
        }
        if (!response.ok)
          throw failure(
            body.code ?? 'NETWORK_ERROR',
            body.message ?? '서버 요청을 완료하지 못했습니다.',
            { trace, status: response.status, transient: transientStatuses.has(response.status) },
          );
        if (!body || typeof body !== 'object' || !body.state)
          throw failure('RESPONSE_INVALID', '서버 응답을 확인하지 못했습니다.', {
            transient: true,
            trace,
          });
        if (body.csrf) csrf = body.csrf;
        onTrace('info', 'HTTP_OK', {
          path,
          trace,
          attempt: attempt + 1,
          revision: body.state.revision,
          replayed: Boolean(body.replayed),
        });
        return body;
      } catch (error) {
        const transient = !(error instanceof GameError) || error.transient;
        if (!transient) throw error;
        onTrace('warn', attempt === 0 ? 'HTTP_RETRY' : 'HTTP_UNAVAILABLE', {
          path,
          trace: error.trace ?? trace,
          attempt: attempt + 1,
          reason: error.code ?? error.name,
        });
        if (attempt === 0) {
          await pause(250);
          continue;
        }
        throw failure(
          mutation ? 'REQUEST_UNCERTAIN' : 'NETWORK_UNAVAILABLE',
          mutation
            ? '저장 결과를 확인하지 못했습니다. 최신 기록을 불러온 뒤 계속해 주세요.'
            : '서버에 연결하지 못했습니다. 연결을 확인한 뒤 다시 불러오세요.',
          { trace: error.trace ?? trace, outcomeUnknown: mutation },
        );
      }
    }
  }
  return {
    request,
    clear: () => {
      csrf = undefined;
    },
  };
}
