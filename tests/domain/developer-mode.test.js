import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCommand } from '../../server/security.js';
import { DEVELOPER_LAST_DATE } from '../../src/domain/developer.js';
import { createGame, transition } from '../../src/domain/engine.js';
import { developerTime } from '../../src/domain/game-time.js';
import { SAVE_KEY } from '../../src/domain/state.js';
import { commitLocal, DEVELOPER_SAVE_KEY, loadLocal } from '../../src/platform/local-save.js';

const profile = { name: '테스트', character: 'boy', role: 'steady', major: 'math' };
function testGame(state = createGame(profile)) {
  const records = new Map([
    [SAVE_KEY, JSON.stringify(createGame({ ...profile, name: '일반 저장' }))],
    [DEVELOPER_SAVE_KEY, JSON.stringify(state)],
  ]);
  const storage = {
    getItem: (key) => records.get(key),
    setItem: (key, value) => records.set(key, value),
  };
  return {
    storage,
    send: (command) => (state = commitLocal(state, command, storage, DEVELOPER_SAVE_KEY)),
  };
}

test('developer actions update only test saves and are unavailable to the normal engine and API', () => {
  const { storage, send } = testGame();
  const command = { type: 'developer_stats', values: { hp: 25, stress: 70, money: 500 } };
  const normal = loadLocal(storage).state;
  const edited = send(command);
  assert.equal(edited.stats.focus, -45);
  assert.equal(edited.money, 500);
  assert.equal(loadLocal(storage, DEVELOPER_SAVE_KEY).state.revision, 1);
  assert.deepEqual(loadLocal(storage).state, normal);
  assert.throws(() => transition(normal, command), { code: 'COMMAND_UNKNOWN' });
  assert.throws(() => validateCommand(command), { code: 'COMMAND_SHAPE' });
  assert.throws(() => send({ ...command, values: { focus: 100 } }), { code: 'DEVELOPER_STAT' });
  assert.equal(loadLocal(storage, DEVELOPER_SAVE_KEY).state.revision, 1);
});

test('automatic progress stops at the chosen slots, runs night activities once and replays earlier dates', () => {
  const { send, storage } = testGame();
  const go = (at, replay = false) => send({ type: 'developer_advance', at, replay });
  const start = go('2026-02-23T07:29');
  assert.equal(start.weekRun, null);
  assert.equal(developerTime(start), '2026-02-23T07:29');
  const morning = go('2026-02-23T07:30');
  assert.equal(morning.weekRun.cursor, 1);
  const evening = go('2026-02-23T22:59');
  assert.equal(evening.weekRun.cursor, 3);
  assert.equal(evening.weekRun.closedDay, -1);
  assert.equal(developerTime(evening), '2026-02-23T22:59');
  const night = go('2026-02-23T23:00');
  assert.equal(night.weekRun.closedDay, 0);
  assert.equal(night.weekRun.nightActions.length, 1);
  const next = go('2026-02-24T06:00');
  assert.equal(next.weekRun.lastDay, 1);
  assert.equal(next.weekRun.nightActions.length, 1);
  assert.equal(developerTime(loadLocal(storage, DEVELOPER_SAVE_KEY).state), '2026-02-24T06:00');
  const override = send({ type: 'developer_clock', time: '12:34' });
  assert.deepEqual(override.weekRun, next.weekRun);
  assert.equal(developerTime(override), '2026-02-24T12:34');
  assert.throws(() => go('2026-02-23T00:00'), { code: 'DEVELOPER_PAST' });
  assert.throws(() => go('2026-03-30T07:30'), { code: 'DEVELOPER_DATE' });
  const restarted = go('2026-02-23T07:30', true);
  assert.deepEqual(restarted.weekRun, morning.weekRun);
  assert.equal(restarted.campaign.playerId, morning.campaign.playerId);
  assert.equal(restarted.flags.runRevision, restarted.revision);
});

test('skipping applications resumes a task without credit and can run a full year to real results', () => {
  const fresh = createGame(profile);
  const planned = transition(fresh, {
    type: 'plan',
    index: 1,
    activity: 'task',
    target: 'practice-report',
  });
  let running = transition(planned, { type: 'advance' });
  while (running.weekRun.waiting?.kind !== 'task')
    running = transition(running, { type: 'advance' });
  const { send } = testGame(running);
  const nextWeek = send({ type: 'developer_skip_week' });
  assert.equal(nextWeek.week, 1);
  assert.equal(nextWeek.tasks['practice-report'].progress, 0);
  assert.ok(!nextWeek.tasks['practice-report'].attempts?.open);
  assert.equal(nextWeek.tasks['practice-report'].moduleData, undefined);
  assert.match(nextWeek.history[0].actions[1].note, /작업 중단/);
  const year = send({ type: 'developer_advance', at: `${DEVELOPER_LAST_DATE}T00:00` });
  assert.equal(year.week, 41);
  assert.equal(year.history.length, 41);
  assert.ok(year.assessments.length > 0);
  assert.ok(year.admissions.some((result) => result.profile === 'top_interview'));
  assert.equal(transition(year, { type: 'ending', ending: 'retry' }).ending.id, 'retry');
});
