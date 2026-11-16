import test from 'node:test';
import assert from 'node:assert/strict';
import { TASK_MODULES } from '../../src/domain/task-modules/registry.js';
import { trapCount } from '../../src/domain/task-modules/report-v1.js';
import { cardCount } from '../../src/domain/task-modules/sum-v1.js';
import { createGame, transition } from '../../src/domain/engine.js';
import { runPlannedWeek, solveActiveTaskGames } from '../helpers/task-games.js';

function seeded(seed = 7) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
const play = (id, data, actions) =>
  actions.reduce((current, action) => TASK_MODULES[id].game.act({}, current, action), data);
const create = (id, ability, params = {}, seed = 7) =>
  TASK_MODULES[id].game.create({ roll: seeded(seed), ability, params });

test('report composition rewards the right order and penalises traps', () => {
  const data = create('report_v1', 20, { layout: 'presentation' });
  assert.ok(TASK_MODULES.report_v1.game.valid(data));
  assert.equal(data.deck.length, 5 + trapCount(20));
  const clean = play(
    'report_v1',
    data,
    [0, 1, 2, 3, 4].map((i) => ({ type: 'pick', card: `s${i}` })),
  );
  assert.equal(clean.passed, true);
  assert.equal(clean.quality, 100);
  const trap = data.deck.find((code) => code.startsWith('t'));
  const messy = play('report_v1', data, [
    { type: 'pick', card: trap },
    { type: 'pick', card: 's1' },
    ...[0, 1, 2, 3, 4].map((i) => ({ type: 'pick', card: `s${i}` })),
  ]);
  assert.equal(messy.mistakes, 2);
  assert.ok(messy.quality < clean.quality);
  assert.ok(TASK_MODULES.report_v1.game.valid(messy));
  assert.ok(create('report_v1', 80).deck.length < create('report_v1', 10).deck.length);
});

test('the experiment hides its cause and treats changing two conditions as uncontrolled', () => {
  const low = create('experiment_v1', 10, { variables: ['온도', '빛', '물의 양', '영양분'] });
  assert.deepEqual(low.ruledOut, []);
  assert.equal(TASK_MODULES.experiment_v1.game.public(low).cause, null);
  assert.equal(create('experiment_v1', 80).ruledOut.length, 1, 'course ability rules one out');
  const other = [0, 1, 2, 3].find((i) => i !== low.cause);
  const run = play('experiment_v1', low, [
    { type: 'test', vars: [other] },
    { type: 'test', vars: [low.cause, other].sort() },
    { type: 'answer', variable: other },
    { type: 'answer', variable: low.cause },
  ]);
  assert.equal(run.tests[0].changed, false);
  assert.equal(run.tests[1].changed, true);
  assert.equal(run.mistakes, 2, 'one uncontrolled run and one wrong answer');
  assert.equal(run.passed, true);
  assert.ok(run.quality < 100);
  assert.equal(TASK_MODULES.experiment_v1.game.public(run).cause, low.cause);
  assert.ok(TASK_MODULES.experiment_v1.game.valid(run));
});

test('problem writing accepts any selection that adds up to the target', () => {
  const data = create('sum_v1', 10);
  assert.equal(data.cards.length, cardCount(10));
  assert.ok(create('sum_v1', 90).cards.length < data.cards.length);
  let answer = null;
  for (let mask = 1; mask < 1 << data.cards.length && !answer; mask++) {
    const pick = data.cards.filter((_, i) => mask & (1 << i));
    if (pick.length >= 2 && pick.reduce((a, b) => a + b, 0) === data.target) answer = pick;
  }
  const wrong = data.cards.slice(0, 2);
  const wrongSum = wrong[0] + wrong[1];
  const run = play('sum_v1', data, [
    ...(wrongSum === data.target
      ? []
      : [...wrong.map((card) => ({ type: 'toggle', card })), { type: 'check' }]),
    ...answer.map((card) => ({ type: 'toggle', card })),
    { type: 'check' },
  ]);
  assert.equal(run.passed, true);
  assert.equal(run.mistakes, wrongSum === data.target ? 0 : 1);
  assert.ok(TASK_MODULES.sum_v1.game.valid(run));
});

test('game settings are validated by the game that reads them', () => {
  assert.deepEqual(TASK_MODULES.report_v1.validate({ layout: 'report' }), []);
  assert.ok(TASK_MODULES.report_v1.validate({ layout: 'poster' }).length);
  assert.ok(TASK_MODULES.experiment_v1.validate({ variables: ['a', 'a', 'b', 'c'] }).length);
  assert.ok(TASK_MODULES.sum_v1.validate({ layout: 'report' }).length);
  assert.throws(() => play('report_v1', create('report_v1', 50), [{ type: 'pick', card: 's9' }]));
});

test('course tasks now open their format game and finish through the real week', () => {
  let state = createGame({ name: '실험', character: 'boy', role: 'steady', major: 'math' }, 41);
  state = solveActiveTaskGames(
    transition(state, { type: 'choose', event: 'winter_study', option: 'friends' }),
  );
  while (state.week < 2) state = runPlannedWeek({ ...state, pending: [] });
  const report = Object.values(state.tasks).find((task) => task.name === '일반물리 실험 보고서');
  const problem = Object.values(state.tasks).find((task) => task.name === '선형대수 문제풀이');
  assert.equal(report.module.id, 'report_v1');
  assert.equal(problem.module.id, 'sum_v1');
  const planned = {
    ...state,
    pending: [],
    plan: Array.from({ length: 21 }, (_, i) =>
      i < 3 ? { activity: 'task', target: report.id } : { activity: 'sleep', target: null },
    ),
  };
  const after = runPlannedWeek(planned);
  assert.ok(after.tasks[report.id].progress > report.progress);
});
