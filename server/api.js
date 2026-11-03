import { baseState, CONTENT_VERSION } from '../src/domain/state.js';
import { transition, GameError } from '../src/domain/engine.js';
import { publicTasks } from '../src/domain/task-processing.js';
import { publicWeekRun, taskDelta } from './game-updates.js';
import {
  ApiError,
  csrfToken,
  digest,
  hmac,
  readJson,
  securityHeaders,
  validateEnvelope,
  verifyCsrf,
} from './security.js';

// Only this service commits game state. Clients submit commands, never computed stats or saves.
export function createApi({
  store,
  authenticate,
  secret,
  origin,
  now = Date.now,
  logger = console.log,
  nextSeed = () => crypto.getRandomValues(new Uint32Array(1))[0],
}) {
  if (!secret || secret.length < 32 || !/^https?:\/\//.test(origin ?? ''))
    throw new Error('API requires an exact public origin and a secret of at least 32 characters.');
  const output = (body, status, trace) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...securityHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Request-ID': trace,
      },
    });
  function publicState(state) {
    return {
      ...state,
      seed: 0,
      tasks: publicTasks(state.tasks),
      weekRun: publicWeekRun(state.weekRun),
      history: state.history.map(({ seedBefore, seedAfter, ...entry }) => entry),
    };
  }
  return async (request) => {
    const trace = crypto.randomUUID();
    const started = now();
    let player;
    try {
      const url = new URL(request.url);
      if (request.headers.get('sec-fetch-site') === 'cross-site')
        throw new ApiError(403, 'CROSS_SITE', '다른 사이트의 요청을 허용하지 않아요.');
      const ip = request.headers.get('cf-connecting-ip') ?? 'local';
      const ipKey = await hmac(secret, `rate-ip:${ip}`);
      if (!(await store.takeRate(ipKey, Math.floor(now() / 60000), 180)))
        throw new ApiError(429, 'RATE_LIMIT', '요청이 너무 많아요. 잠시 뒤 다시 시도하세요.');
      if (url.pathname === '/api/health' && request.method === 'GET')
        return output({ ok: true, contentVersion: CONTENT_VERSION, mode: 'server' }, 200, trace);
      if (!['/api/game', '/api/action', '/api/reset'].includes(url.pathname))
        throw new ApiError(404, 'NOT_FOUND', '없는 API예요.');
      if (
        (url.pathname === '/api/game' && request.method !== 'GET') ||
        (url.pathname !== '/api/game' && request.method !== 'POST')
      )
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', '허용되지 않은 요청 방식이에요.');
      if (request.method === 'POST' && request.headers.get('origin') !== origin)
        throw new ApiError(403, 'ORIGIN_DENIED', '허용된 게임 주소에서만 요청할 수 있어요.');
      const uid = await authenticate(request);
      if (request.headers.get('X-Game-Version') !== CONTENT_VERSION)
        throw new ApiError(
          409,
          'CLIENT_UPDATE_REQUIRED',
          '게임이 업데이트되었습니다. 새로고침한 뒤 계속해 주세요.',
        );
      player = await hmac(secret, `player:${uid}`);
      if (!(await store.takeRate(player, Math.floor(now() / 60000), 120)))
        throw new ApiError(429, 'RATE_LIMIT', '요청이 너무 많아요. 잠시 뒤 다시 시도하세요.');
      let state = await store.get(player);
      if (!state) {
        state = baseState(crypto.getRandomValues(new Uint32Array(1))[0]);
        await store.create(player, state);
        state = await store.get(player);
      }
      if (request.method === 'GET')
        return output(
          { state: publicState(state), csrf: await csrfToken(secret, player, now()) },
          200,
          trace,
        );
      if (!(await verifyCsrf(secret, player, request.headers.get('x-csrf-token'), now())))
        throw new ApiError(
          403,
          'CSRF_INVALID',
          '보안 확인이 만료됐어요. 최신 기록을 다시 불러오세요.',
        );
      const body = await readJson(request);
      const reset = url.pathname === '/api/reset';
      validateEnvelope(body, reset);
      const commandHash = await digest(
        JSON.stringify(reset ? { reset: true, confirmation: body.confirmation } : body.command),
      );
      const previous = await store.receipt(player, body.idempotencyKey);
      if (previous) {
        if (previous.hash !== commandHash)
          throw new ApiError(
            409,
            'IDEMPOTENCY_REUSE',
            '같은 중복 방지 키로 다른 요청을 보낼 수 없어요.',
          );
        return output(
          {
            state: publicState(await store.get(player)),
            csrf: await csrfToken(secret, player, now()),
            replayed: true,
          },
          200,
          trace,
        );
      }
      if (state.revision !== body.expectedRevision)
        throw new ApiError(
          409,
          'REVISION_CONFLICT',
          '다른 창에서 진행 기록이 바뀌었어요. 최신 저장을 불러오세요.',
        );
      const next = reset
        ? {
            ...baseState(crypto.getRandomValues(new Uint32Array(1))[0]),
            revision: state.revision + 1,
          }
        : transition({ ...state, seed: nextSeed() }, body.command);
      const committed = await store.commit(
        player,
        state.revision,
        next,
        body.idempotencyKey,
        commandHash,
      );
      if (!committed) {
        const concurrent = await store.receipt(player, body.idempotencyKey);
        if (concurrent?.hash === commandHash)
          return output(
            {
              state: publicState(await store.get(player)),
              csrf: await csrfToken(secret, player, now()),
              replayed: true,
            },
            200,
            trace,
          );
        throw new ApiError(
          409,
          'REVISION_CONFLICT',
          '다른 요청이 먼저 저장됐어요. 최신 기록을 불러오세요.',
        );
      }
      logger(
        JSON.stringify({
          at: new Date(now()).toISOString(),
          contentVersion: CONTENT_VERSION,
          trace,
          code: 'COMMAND_COMMITTED',
          command: reset ? 'reset' : body.command.type,
          revision: next.revision,
          week: next.week,
          durationMs: now() - started,
        }),
      );
      return output(
        {
          ...(body.command?.type === 'task_game' &&
          request.headers.get('X-Game-Update') === 'task-v1'
            ? { delta: taskDelta(state, next, body.command.task) }
            : { state: publicState(next) }),
          csrf: await csrfToken(secret, player, now()),
        },
        200,
        trace,
      );
    } catch (error) {
      const status =
        error instanceof ApiError ? error.status : error instanceof GameError ? 400 : 500;
      const code = error.code ?? 'INTERNAL_ERROR';
      logger(
        JSON.stringify({
          at: new Date(now()).toISOString(),
          contentVersion: CONTENT_VERSION,
          trace,
          code,
          status,
          durationMs: now() - started,
          ...(error.commandType ? { command: error.commandType, phase: error.phase } : {}),
          ...(error.migrationId ? { migration: error.migrationId } : {}),
          ...(status === 500
            ? {
                errorType: error.name,
                frames: String(error.stack ?? '')
                  .split('\n')
                  .slice(1, 6)
                  .map((frame) => frame.trim()),
              }
            : {}),
        }),
      );
      return output(
        {
          code: status === 500 ? 'INTERNAL_ERROR' : code,
          message:
            status === 500 ? '서버에서 처리하지 못했어요. 요청 ID로 문의해 주세요.' : error.message,
          trace,
        },
        status,
        trace,
      );
    }
  };
}
