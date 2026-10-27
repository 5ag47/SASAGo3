import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApi } from '../../server/api.js';
import { SqliteStore } from '../../server/sqlite-store.js';
import { ApiError } from '../../server/security.js';
import { CONTENT_VERSION } from '../../src/domain/state.js';
import { beginWeek } from '../../src/domain/events.js';

const origin = 'https://game.example';
const secret = 'test-only-secret-do-not-use-in-production-1234567890';
const profile = { name: '서버 테스트', character: 'boy', role: 'steady', major: 'math' };
test('day copy is one atomic server command and duplicate deliveries do not apply it twice', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const created = await f.post(await f.get(), { type: 'create', profile });
  const command = { type: 'copy_day', sourceDay: 0, days: [1, 6] };
  const key = randomUUID();
  const copied = await f.post(created, command, { key });
  assert.equal(copied.response.status, 200);
  assert.equal(copied.state.revision, created.state.revision + 1);
  assert.deepEqual(copied.state.plan.slice(18, 21), created.state.plan.slice(0, 3));
  const duplicate = await f.post(created, command, { key });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.state.revision, copied.state.revision);
  const malformed = await f.post(copied, { ...command, days: [0] });
  assert.equal(malformed.response.status, 400);
  const injected = await f.post(copied, { ...command, stats: { math: 100 } });
  assert.equal(injected.code, 'COMMAND_SHAPE');
});

test('the server commits each interview answer once and keeps pending progress on reload', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const created = await f.post(await f.get(), { type: 'create', profile });
  const staged = { ...created.state, week: 36, pending: ['interview_day'] };
  f.store.db.prepare('UPDATE players SET state=?').run(JSON.stringify(staged));
  const key = randomUUID();
  const command = { type: 'choose', event: 'interview_day', option: 'answer:1' };
  const first = await f.post(created, command, { key });
  assert.equal(first.response.status, 200);
  const duplicate = await f.post(created, command, { key });
  assert.deepEqual(duplicate.state.minigames.interview.answers, [1]);
  const reloaded = await f.get();
  assert.equal(reloaded.state.minigames.interview.phase, 'active');
  const stale = await f.post(created, { ...command, option: 'answer:0' });
  assert.equal(stale.response.status, 409);
  const second = await f.post(reloaded, { ...command, option: 'answer:2' });
  const final = await f.post(second, { ...command, option: 'answer:0' });
  assert.equal(final.state.minigames.interview.phase, 'finished');
  assert.deepEqual(final.state.minigames.interview.answers, [1, 2, 0]);
  assert.equal((await f.get()).state.interviewScore, final.state.interviewScore);
});

test('card draws are server commands; invalid cards and client supplied scores cannot change the saved game', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const created = await f.post(await f.get(), { type: 'create', profile });
  const staged = { ...created.state, week: 38, pending: [] };
  beginWeek(staged);
  f.store.db.prepare('UPDATE players SET state=?').run(JSON.stringify(staged));
  const started = await f.post(created, { type: 'choose', event: 'dorm_cards', option: 'play' });
  assert.equal(started.response.status, 200);
  assert.equal(started.state.seed, 0);
  assert.equal(started.state.minigames.cards.stock, undefined);
  const command = {
    type: 'choose',
    event: 'dorm_cards',
    option: `card:${started.state.minigames.cards.hand[0]}`,
  };
  const key = randomUUID();
  const played = await f.post(started, command, { key });
  const duplicate = await f.post(started, command, { key });
  assert.equal(played.response.status, 200);
  assert.equal(duplicate.state.minigames.cards.turn, 1);
  assert.equal(duplicate.state.revision, played.state.revision);
  assert.deepEqual((await f.get()).state.minigames.cards, played.state.minigames.cards);
  const bad = await f.post(played, { ...command, option: 'card:99' });
  assert.equal(bad.response.status, 400);
  const injected = await f.post(played, { ...command, score: 999 });
  assert.equal(injected.code, 'COMMAND_SHAPE');
  assert.equal((await f.get()).state.revision, played.state.revision);
});
test('an outdated client receives an update prompt before reading new course IDs or mutating state', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const response = await f.api(
    new Request(`${origin}/api/game`, {
      headers: { Authorization: 'Bearer player-a', 'X-Game-Version': 'outdated' },
    }),
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'CLIENT_UPDATE_REQUIRED');
  const session = await f.get();
  const outdated = await f.post(
    session,
    { type: 'create', profile },
    { headers: { 'X-Game-Version': 'outdated' } },
  );
  assert.equal(outdated.response.status, 409);
  assert.equal((await f.get()).state.created, false);
});
test('the API validates optional course IDs while accepting the original four-field profile', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const session = await f.get();
  const bad = await f.post(session, {
    type: 'create',
    profile: { ...profile, electives: ['general_physics'] },
  });
  assert.equal(bad.response.status, 400);
  const created = await f.post(session, {
    type: 'create',
    profile: { ...profile, electives: ['urban_planning'] },
  });
  assert.equal(created.response.status, 200);
  assert.ok(created.state.courses.includes('urban_planning'));
  const invalid = await f.post(created, {
    type: 'elective',
    course: 'general_physics',
    term: 1,
    enabled: true,
  });
  assert.equal(invalid.response.status, 400);
});
test('unexpected server errors expose only a trace while internal logs retain code locations', async (t) => {
  const store = new SqliteStore(':memory:');
  t.after(() => store.close());
  const logs = [];
  store.get = () => {
    throw new Error('private-message-must-not-leak');
  };
  const api = createApi({
    store,
    origin,
    secret,
    authenticate: async () => 'player',
    logger: (value) => logs.push(JSON.parse(value)),
  });
  const response = await api(
    new Request(`${origin}/api/game`, { headers: { 'X-Game-Version': CONTENT_VERSION } }),
  );
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.code, 'INTERNAL_ERROR');
  assert.equal(body.trace, response.headers.get('X-Request-ID'));
  assert.ok(!JSON.stringify(body).includes('private-message'));
  assert.ok(logs[0].frames.length > 0);
  assert.ok(logs[0].contentVersion);
  assert.ok(!JSON.stringify(logs).includes('private-message'));
});
function fixture({ nextSeed } = {}) {
  const store = new SqliteStore(':memory:');
  const api = createApi({
    store,
    secret,
    origin,
    logger: () => {},
    nextSeed,
    authenticate: async (request) => {
      const user = request.headers.get('authorization');
      if (!['Bearer player-a', 'Bearer player-b'].includes(user))
        throw new ApiError(401, 'AUTH_INVALID', '인증 필요');
      return user;
    },
  });
  async function get(user = 'player-a') {
    const response = await api(
      new Request(`${origin}/api/game`, {
        headers: { Authorization: `Bearer ${user}`, 'X-Game-Version': CONTENT_VERSION },
      }),
    );
    return { response, ...(await response.json()) };
  }
  async function post(
    session,
    command,
    {
      path = '/api/action',
      key = randomUUID(),
      revision = session.state.revision,
      user = 'player-a',
      extra = {},
      headers = {},
    } = {},
  ) {
    const body =
      path === '/api/reset'
        ? { expectedRevision: revision, idempotencyKey: key, confirmation: '새로 시작', ...extra }
        : { expectedRevision: revision, idempotencyKey: key, command, ...extra };
    const response = await api(
      new Request(`${origin}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user}`,
          'X-Game-Version': CONTENT_VERSION,
          Origin: origin,
          'X-CSRF-Token': session.csrf,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      }),
    );
    return { response, ...(await response.json()) };
  }
  return { api, store, get, post };
}
test('accepted commands refresh server entropy while duplicate and stale requests cannot reroll results', async (t) => {
  let draws = 0;
  const f = fixture({ nextSeed: () => 1000 + draws++ });
  t.after(() => f.store.close());
  const session = await f.get();
  const created = await f.post(session, { type: 'create', profile });
  assert.equal(JSON.parse(f.store.db.prepare('SELECT state FROM players').get().state).seed, 1000);
  const key = randomUUID();
  const command = { type: 'plan', index: 0, activity: 'sleep', target: null };
  const planned = await f.post(created, command, { key });
  assert.equal(planned.state.seed, 0);
  assert.equal(JSON.parse(f.store.db.prepare('SELECT state FROM players').get().state).seed, 1001);
  assert.equal((await f.post(created, command, { key })).replayed, true);
  assert.equal((await f.post(created, command)).response.status, 409);
  assert.equal(draws, 2);
});
test('authenticated server creates and advances state without accepting client-computed scores', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const start = await f.get();
  assert.equal(start.response.status, 200);
  assert.equal(start.state.seed, 0);
  const created = await f.post(start, { type: 'create', profile });
  assert.equal(created.state.revision, 1);
  const chosen = await f.post(created, {
    type: 'choose',
    event: 'winter_study',
    option: 'friends',
  });
  const after = await f.post(chosen, { type: 'advance' });
  assert.equal(after.state.week, 1);
  assert.equal(after.state.history[0].seedAfter, undefined);
  const tamper = await f.post(after, { type: 'advance', stats: { math: 100 } });
  assert.equal(tamper.response.status, 400);
  assert.equal(tamper.code, 'COMMAND_SHAPE');
});
test('unauthenticated callers cannot read a game', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const response = await f.api(new Request(`${origin}/api/game`));
  assert.equal(response.status, 401);
});
test('different users are isolated and a client uid parameter is rejected', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const a = await f.post(await f.get(), { type: 'create', profile });
  const b = await f.get('player-b');
  assert.equal(b.state.created, false);
  const response = await f.post(a, { type: 'buy', item: 'milk' }, { extra: { uid: 'player-b' } });
  assert.equal(response.response.status, 400);
});
test('cross-site POST and missing CSRF fail before a state mutation', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const s = await f.get();
  for (const headers of [
    { Origin: 'https://evil.example' },
    { 'X-CSRF-Token': '' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ]) {
    const result = await f.post(s, { type: 'create', profile }, { headers });
    assert.equal(result.response.status, 403);
  }
  assert.equal((await f.get()).state.revision, 0);
});
test('duplicate requests apply exactly once and a reused key with a different command is rejected', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const s = await f.get();
  const key = randomUUID();
  const a = await f.post(s, { type: 'create', profile }, { key });
  const b = await f.post(s, { type: 'create', profile }, { key });
  assert.equal(a.state.revision, 1);
  assert.equal(b.state.revision, 1);
  assert.equal(b.replayed, true);
  const wrong = await f.post(a, { type: 'buy', item: 'milk' }, { key });
  assert.equal(wrong.response.status, 409);
  assert.equal(wrong.code, 'IDEMPOTENCY_REUSE');
});
test('a stale tab cannot overwrite an accepted command', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const s = await f.get();
  await f.post(s, { type: 'create', profile });
  const second = await f.post(s, { type: 'create', profile });
  assert.equal(second.response.status, 409);
  assert.equal(second.code, 'REVISION_CONFLICT');
});
test('concurrent commands compare revisions atomically', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const s = await f.get();
  const results = await Promise.all([
    f.post(s, { type: 'create', profile }),
    f.post(s, { type: 'create', profile }),
  ]);
  assert.deepEqual(results.map((r) => r.response.status).sort(), [200, 409]);
  assert.equal((await f.get()).state.revision, 1);
});
test('oversized bodies, invalid JSON, wrong content types and unsupported methods fail closed', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const s = await f.get();
  for (const [body, contentType, expected] of [
    ['x'.repeat(9000), 'application/json', 413],
    ['{', 'application/json', 400],
    ['{}', 'text/plain', 415],
  ]) {
    const result = await f.api(
      new Request(`${origin}/api/action`, {
        method: 'POST',
        headers: {
          Origin: origin,
          Authorization: 'Bearer player-a',
          'X-CSRF-Token': s.csrf,
          'X-Game-Version': CONTENT_VERSION,
          'Content-Type': contentType,
        },
        body,
      }),
    );
    assert.equal(result.status, expected);
  }
  assert.equal((await f.api(new Request(`${origin}/api/game`, { method: 'DELETE' }))).status, 405);
});
test('rate limits reject request floods and responses prohibit shared caching', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  let last;
  for (let i = 0; i < 122; i++) last = await f.get();
  assert.equal(last.response.status, 429);
  assert.equal(last.response.headers.get('cache-control'), 'no-store');
  assert.equal(last.response.headers.get('x-content-type-options'), 'nosniff');
});
test('server reset requires confirmation, is idempotent and advances the revision', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  const s = await f.post(await f.get(), { type: 'create', profile });
  const wrong = await f.post(s, null, { path: '/api/reset', extra: { confirmation: 'no' } });
  assert.equal(wrong.response.status, 400);
  const key = randomUUID();
  const reset = await f.post(s, null, { path: '/api/reset', key });
  assert.equal(reset.state.created, false);
  assert.equal(reset.state.revision, 2);
  assert.equal((await f.post(s, null, { path: '/api/reset', key })).replayed, true);
});
test('unknown API routes and malformed idempotency keys are rejected', async (t) => {
  const f = fixture();
  t.after(() => f.store.close());
  assert.equal((await f.api(new Request(`${origin}/api/admin`))).status, 404);
  const s = await f.get();
  assert.equal((await f.post(s, { type: 'create', profile }, { key: 'bad' })).response.status, 400);
});
