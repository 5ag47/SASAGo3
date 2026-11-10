import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, validSave } from '../game.js';
import { gameReducer } from './game-reducer.js';

test('새 게임부터 한 주 진행까지 모든 행동이 유효한 저장 상태를 유지한다', () => {
  const initial = initialGame();
  const created = gameReducer(initial, { type: 'create', name: ' 하나 ', character: 'girl' });
  const planned = gameReducer(created, { type: 'set-plan', day: 3, activity: 'rest' });
  const withTask = gameReducer(planned, { type: 'toggle-task', index: 0 });
  const withNight = gameReducer(withTask, { type: 'toggle-night' });
  const next = gameReducer(withNight, { type: 'advance-week' });

  assert.equal(created.name, '하나');
  assert.equal(planned.plan[3], 'rest');
  assert.equal(withTask.tasks[0], true);
  assert.equal(withNight.night, true);
  assert.equal(next.week, 1);
  assert.deepEqual(next.tasks, [false, false]);
  assert.equal(next.history.length, 1);
  for (const state of [initial, created, planned, withTask, withNight, next]) {
    assert.equal(validSave(state), true);
  }
  assert.equal(initial.created, false);
});

test('잘못된 행동과 시작 전 게임 진행은 상태를 바꾸지 않는다', () => {
  const initial = initialGame();
  for (const action of [
    { type: 'advance-week' },
    { type: 'set-plan', day: 0, activity: 'math' },
    { type: 'toggle-task', index: 0 },
    { type: 'create', name: ' ', character: 'boy' },
    { type: 'create', name: '가'.repeat(13), character: 'boy' },
    { type: 'create', name: '하나', character: 'other' },
  ]) assert.strictEqual(gameReducer(initial, action), initial);

  const game = gameReducer(initial, { type: 'create', name: '하나', character: 'boy' });
  for (const action of [
    { type: 'create', name: '둘', character: 'girl' },
    { type: 'profile', name: '', character: 'girl' },
    { type: 'set-plan', day: -1, activity: 'math' },
    { type: 'set-plan', day: 6, activity: 'math' },
    { type: 'set-plan', day: 0, activity: 'constructor' },
    { type: 'toggle-task', index: 2 },
    { type: 'unrecognized' },
  ]) assert.strictEqual(gameReducer(game, action), game);
});

test('프로필 변경은 진행 기록을 보존한다', () => {
  const started = gameReducer(initialGame(), { type: 'create', name: '하나', character: 'boy' });
  const progressed = gameReducer(started, { type: 'advance-week' });
  const renamed = gameReducer(progressed, { type: 'profile', name: ' 둘 ', character: 'girl' });
  assert.equal(renamed.name, '둘');
  assert.equal(renamed.character, 'girl');
  assert.strictEqual(renamed.history, progressed.history);
  assert.equal(renamed.week, 1);
});
