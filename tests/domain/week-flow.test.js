import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { addTask } from '../../src/domain/tasks.js';
import { assignments, events } from '../../src/domain/catalog.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { dispatchDayEvents } from '../../src/domain/events.js';
import { attemptCost } from '../../src/domain/task-attempts.js';
import { TASK_MODULES } from '../../src/domain/task-modules/registry.js';
import { solveTaskGame, runPlannedWeek } from '../helpers/task-games.js';
const fresh = () =>
  createGame({ name: '시간 진행 검사', character: 'girl', role: 'steady', major: 'math' }, 1107);
const act = (state, task, action) => transition(state, { type: 'task_game', task, action });
function onlyTask(state, task, amount) {
  state.plan = Array.from({ length: 21 }, (_, index) =>
    index < amount ? { activity: 'task', target: task } : { activity: 'sleep', target: null },
  );
  return state;
}
test('work can only start at planned time and a finished assignment is complete immediately', () => {
  let state = fresh();
  assert.throws(() => act(state, 'practice-report', { type: 'start' }), {
    code: 'TASK_TIME_REQUIRED',
  });
  state = onlyTask(state, 'practice-report', 2);
  state = transition(state, { type: 'advance' });
  assert.equal(state.weekRun.waiting.task, 'practice-report');
  state = solveTaskGame(state, 'practice-report');
  assert.equal(state.tasks['practice-report'].progress, 1);
  assert.equal(state.tasks['practice-report'].status, 'active');
  assert.equal(state.weekRun.waiting.kind, 'task_result');
  state = transition(state, { type: 'advance' });
  state = solveTaskGame(state, 'practice-report');
  assert.equal(state.week, 0);
  assert.equal(state.tasks['practice-report'].status, 'completed');
  assert.equal(state.tasks['practice-report'].attempts.successful, 2);
  const before = structuredClone(state);
  assert.throws(() => act(state, 'practice-report', { type: 'start' }), { code: 'TASK_INVALID' });
  assert.deepEqual(state, before);
});
test('attempt cost is charged once, predictable input is batched, and replayed input cannot reward twice', () => {
  let state = fresh();
  state.tasks['practice-report'].module = { id: 'order_v2', params: {} };
  state = transition(onlyTask(state, 'practice-report', 1), { type: 'advance' });
  const money = state.money,
    before = state.stats.hp,
    predicted = attemptCost(state, state.tasks['practice-report']);
  state = act(state, 'practice-report', { type: 'start' });
  assert.equal(state.stats.hp, before + predicted.hp);
  assert.equal(state.money, money);
  const task = state.tasks['practice-report'],
    cards = [...task.moduleData.cards].sort((a, b) => a - b);
  const first = {
    type: 'batch',
    attempt: task.attempts.total,
    from: 0,
    actions: [{ type: 'pick', card: cards[0] }],
  };
  state = act(state, task.id, first);
  const hp = state.stats.hp;
  state = act(state, task.id, first);
  assert.equal(state.tasks[task.id].attempts.sequence, 1);
  assert.equal(state.stats.hp, hp);
  assert.throws(
    () => act(state, task.id, { ...first, actions: [{ type: 'pick', card: cards[1] }] }),
    { code: 'TASK_INPUT_CONFLICT' },
  );
  state = act(state, task.id, {
    type: 'batch',
    attempt: task.attempts.total,
    from: 1,
    actions: cards.slice(1).map((card) => ({ type: 'pick', card })),
  });
  assert.equal(state.tasks[task.id].progress, 1);
  assert.equal(state.tasks[task.id].attempts.total, 1);
});
test('study applications wait for the next game day and survive a reload while pending', () => {
  let state = transition(fresh(), { type: 'choose', event: 'winter_study', option: 'friends' });
  assert.equal(state.group, null);
  assert.ok(state.studyApplication);
  assert.equal(state.pending.includes('winter_study'), false);
  state = migrateState(JSON.parse(JSON.stringify(state)));
  state.plan = Array.from({ length: 21 }, () => ({ activity: 'sleep', target: null }));
  state = transition(state, { type: 'advance' });
  assert.equal(state.week, 0);
  assert.equal(state.weekRun.cursor, 3);
  assert.equal(state.group, 'friends');
  assert.equal(state.studyApplication, null);
  assert.match(state.weekRun.waiting.title, /합류/);
});
test('long projects allow multiple rounds per week, expose repeat costs, and support a separate cap', () => {
  let source = fresh();
  source.week = 1;
  source.tasks = {};
  source.pending = [];
  addTask(source, 'thesis', assignments.thesis);
  const cram = runPlannedWeek(onlyTask(structuredClone(source), 'thesis', 12));
  assert.equal(cram.tasks.thesis.status, 'completed');
  assert.equal(cram.tasks.thesis.attempts.successful, 12);
  assert.ok(cram.fatigue >= 2);
  assert.ok(cram.tasks.thesis.result.quality < 100);
  let spread = source;
  for (let week = 0; week < 6; week++) spread = runPlannedWeek(onlyTask(spread, 'thesis', 2));
  assert.equal(spread.tasks.thesis.status, 'completed');
  assert.ok(spread.tasks.thesis.result.quality > cram.tasks.thesis.result.quality);
  assert.ok(spread.tasks.thesis.attempts.earlyWins > 0);
  const capped = structuredClone(source);
  capped.tasks.thesis.module.params.weeklyLimit = 2;
  const after = runPlannedWeek(onlyTask(capped, 'thesis', 12));
  assert.equal(after.tasks.thesis.progress, 2);
  assert.equal(after.tasks.thesis.attempts.weekCount, 2);
  assert.ok(after.history[0].actions.some((action) => action.note.includes('상한')));
});
test('scheduled daily events are delivered on the selected day exactly once', () => {
  const event = events.academy_offer,
    previous = event.day;
  try {
    event.day = 2;
    const state = fresh();
    assert.equal(state.pending.includes('academy_offer'), false);
    dispatchDayEvents(state, 1);
    assert.equal(state.pending.includes('academy_offer'), false);
    state.week = 1;
    dispatchDayEvents(state, 1);
    assert.equal(state.pending.includes('academy_offer'), false);
    dispatchDayEvents(state, 2);
    dispatchDayEvents(state, 2);
    assert.equal(state.pending.filter((id) => id === 'academy_offer').length, 1);
  } finally {
    if (previous === undefined) delete event.day;
    else event.day = previous;
  }
});
test('unfinished work resumes at the same slot with the paid cost and board preserved', () => {
  let state = transition(onlyTask(fresh(), 'practice-report', 1), { type: 'advance' });
  state = act(state, 'practice-report', { type: 'start' });
  const before = structuredClone(state);
  state = migrateState(JSON.parse(JSON.stringify(state)));
  assert.ok(validateState(state));
  assert.deepEqual(
    state.tasks['practice-report'].moduleData,
    before.tasks['practice-report'].moduleData,
  );
  assert.equal(state.tasks['practice-report'].attempts.total, 1);
  assert.throws(() => transition(state, { type: 'plan', index: 0, activity: 'sleep' }), {
    code: 'SLOT_INVALID',
  });
  state = solveTaskGame(state, 'practice-report');
  assert.equal(state.tasks['practice-report'].attempts.total, 1);
});
test('task input can share immutable records without modifying its source on success or rejection', () => {
  let state = transition(onlyTask(fresh(), 'practice-report', 1), { type: 'advance' });
  state = act(state, 'practice-report', { type: 'start' });
  const original = structuredClone(state);
  Object.freeze(state.history);
  Object.freeze(state.assessments);
  Object.freeze(state.tasks['first-study']);
  const next = act(state, 'practice-report', { type: 'ready' });
  assert.equal(next.history, state.history);
  assert.notEqual(next.tasks[state.weekRun.waiting.task], state.tasks[state.weekRun.waiting.task]);
  assert.deepEqual(state, original);
  assert.throws(() => act(state, 'practice-report', { type: 'check', quality: 100 }));
  assert.deepEqual(state, original);
});
test('module-defined effects and seeded quality variance are loaded through the common host', () => {
  function play(seed) {
    let state = createGame(
      { name: '모듈 난수', character: 'girl', role: 'steady', major: 'math' },
      seed,
    );
    state.tasks['practice-report'].module = {
      id: 'order_v2',
      params: { cost: { hp: -3, stress: 2 }, success: { science: 2 }, variance: 10 },
    };
    state = transition(onlyTask(state, 'practice-report', 1), { type: 'advance' });
    const before = state.stats.science;
    state = solveTaskGame(state, 'practice-report');
    assert.ok(state.stats.science > before);
    return state;
  }
  assert.deepEqual(play(72), play(72));
  const qualities = new Set(
    Array.from(
      { length: 12 },
      (_, index) => play(index * 311 + 7).tasks['practice-report'].attempts.lastQuality,
    ),
  );
  assert.ok(qualities.size > 1);
});
test('a module failure consumes the attempt, applies its configured effect, and enforces the retry cap', () => {
  const game = TASK_MODULES.order_v2.game;
  try {
    game.status = (data) => (data?.index > 0 ? 'failure' : 'playing');
    let state = fresh();
    state.tasks['practice-report'].module = {
      id: 'order_v2',
      params: { weeklyLimit: 2, failure: { hp: -4 } },
    };
    state = transition(onlyTask(state, 'practice-report', 2), { type: 'advance' });
    state = act(state, 'practice-report', { type: 'start' });
    const before = state.stats.hp;
    const card = Math.min(...state.tasks['practice-report'].moduleData.cards);
    state = act(state, 'practice-report', { type: 'pick', card });
    assert.equal(state.stats.hp, before - 4);
    assert.equal(state.tasks['practice-report'].progress, 0);
    assert.equal(state.tasks['practice-report'].attempts.open, false);
    state = act(state, 'practice-report', { type: 'restart' });
    assert.equal(state.tasks['practice-report'].attempts.weekCount, 2);
    assert.throws(() => act(state, 'practice-report', { type: 'restart' }));
    state = transition(state, { type: 'advance', skipTask: true });
    assert.equal(state.tasks['practice-report'].attempts.open, false);
    assert.equal(state.tasks['practice-report'].moduleData, undefined);
    assert.ok(validateState(state));
  } finally {
    delete game.status;
  }
});
test('stopping an unfinished attempt spends its cost and the next work period starts a new attempt', () => {
  let state = transition(onlyTask(fresh(), 'practice-report', 2), { type: 'advance' });
  state = act(state, 'practice-report', { type: 'start' });
  const costPaid = state.stats.hp;
  state = transition(state, { type: 'advance', skipTask: true });
  assert.equal(state.tasks['practice-report'].progress, 0);
  assert.equal(state.tasks['practice-report'].attempts.open, false);
  assert.equal(state.tasks['practice-report'].moduleData, undefined);
  state = act(state, 'practice-report', { type: 'start' });
  assert.equal(state.tasks['practice-report'].attempts.total, 2);
  assert.ok(state.stats.hp < costPaid);
});
test('a previously verified old-flow puzzle is completed once without rescheduling it', () => {
  const old = fresh(),
    task = old.tasks['practice-report'];
  delete old.flags.taskFlowVersion;
  task.module = { id: 'order_v1', params: {} };
  task.moduleData = {
    kind: 'order',
    cards: [1, 2, 3, 4],
    index: 4,
    mistakes: 0,
    phase: 'passed',
    passed: true,
    quality: 100,
  };
  const migrated = migrateState(old);
  assert.equal(migrated.tasks['practice-report'].status, 'completed');
  assert.equal(migrated.tasks['practice-report'].progress, task.target);
  assert.deepEqual(migrateState(migrated), migrated);
  assert.equal(old.tasks['practice-report'].status, 'active');
  assert.ok(validateState(migrated));
});
test('an unfinished legacy board resumes at work time with one new attempt cost', () => {
  const old = fresh(),
    task = old.tasks['practice-report'];
  delete old.flags.taskFlowVersion;
  task.module = { id: 'order_v1', params: {} };
  task.moduleData = {
    kind: 'order',
    cards: [1, 2, 3, 4],
    index: 1,
    mistakes: 0,
    phase: 'play',
    passed: false,
    quality: null,
  };
  let migrated = migrateState(old);
  migrated = transition(onlyTask(migrated, 'practice-report', 1), { type: 'advance' });
  assert.equal(migrated.tasks['practice-report'].moduleData.index, 1);
  assert.equal(migrated.tasks['practice-report'].attempts.total, 1);
  migrated = solveTaskGame(migrated, 'practice-report');
  assert.equal(migrated.tasks['practice-report'].progress, 1);
  assert.equal(migrated.tasks['practice-report'].attempts.total, 1);
});
