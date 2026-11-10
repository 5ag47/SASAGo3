import test from 'node:test';
import assert from 'node:assert/strict';
import { balance, ACADEMIC_STATS } from '../../src/domain/balance.js';
import { balanceIssues } from '../../src/domain/balance-validation.js';
import { createGame, transition, endingAvailable } from '../../src/domain/engine.js';
import { addTask, workTask } from '../../src/domain/tasks.js';
import { runPlannedWeek as resolveWeek } from '../helpers/task-games.js';
import { random } from '../../src/domain/random.js';
import { events } from '../../src/domain/catalog.js';
import { resolveAdmission } from '../../src/domain/grades.js';
import { lockedSlots, effectivePlan } from '../../src/domain/schedule.js';
import { migrateState } from '../../src/domain/state.js';
import { solveTaskGame } from '../helpers/task-games.js';
import { simulateYear } from '../../tools/simulation/run.js';
import { activityPreview } from '../../src/domain/activity-preview.js';

const fresh = () =>
  createGame({ name: '밸런스 검증', character: 'girl', role: 'steady', major: 'math' });
test('balance content rejects nonfinite values, misspelled fields and inconsistent budgets', () => {
  assert.deepEqual(balanceIssues(balance), []);
  for (const edit of [
    (c) => (c.learning.focusScale = 0),
    (c) => (c.growth.academicRate = Infinity),
    (c) => (c.growth.academciRate = 1),
    (c) => (c.presets.recoveryWorkSlots = 21),
    (c) => (c.projects.qualityBase = 1),
    (c) => (c.admissions.csatThreshold = NaN),
  ]) {
    const config = structuredClone(balance);
    edit(config);
    assert.ok(balanceIssues(config).length);
  }
});
test('preset planning prioritizes a near deadline over a previously created long task', () => {
  const state = fresh();
  state.week = 11;
  state.tasks = {};
  addTask(state, 'long_task', { name: '긴 과제', target: 12, deadline: 20 });
  addTask(state, 'urgent_task', { name: '마감 과제', target: 2, deadline: 11 });
  state.flags.reservations = { 11: [{ index: 3, activity: 'lecture', event: 'career_sessions' }] };
  const before = structuredClone(state);
  const next = transition(state, { type: 'preset', preset: 'tasks' });
  assert.equal(next.plan[1].target, 'urgent_task');
  assert.equal(next.plan[4].target, 'urgent_task');
  assert.equal(lockedSlots(next)[3].activity, 'lecture');
  const work = next.plan.filter(
    (slot, index) => lockedSlots(next)[index] || ['study', 'task'].includes(slot.activity),
  );
  assert.equal(work.length, 9);
  assert.deepEqual(state, before);
  state.fatigue = 1;
  assert.equal(
    effectivePlan(transition(state, { type: 'preset', preset: 'tasks' })).filter(
      (slot) => slot.activity === 'task',
    ).length,
    effectivePlan(next).filter((slot) => slot.activity === 'task').length,
    'a mild strain stage keeps the normal work budget',
  );
  state.fatigue = 2;
  const recovery = transition(state, { type: 'preset', preset: 'tasks' });
  assert.equal(effectivePlan(recovery).filter((slot) => slot.activity === 'task').length, 4);
});
test('the same study slot yields less progress near the ability and course mastery caps', () => {
  const low = fresh(),
    high = fresh();
  for (const s of [low, high]) {
    s.plan = Array.from({ length: 21 }, () => ({ activity: 'sleep', target: null }));
    s.plan[0] = { activity: 'study', target: 'linear_algebra' };
  }
  low.stats.math = low.courseMastery.linear_algebra = 20;
  high.stats.math = high.courseMastery.linear_algebra = 90;
  const a = resolveWeek(low),
    b = resolveWeek(high);
  assert.ok(a.stats.math - 20 > b.stats.math - 90);
  assert.ok(a.courseMastery.linear_algebra - 20 > b.courseMastery.linear_algebra - 90);
});
test('the activity estimate matches the first executed slot and does not mutate a public state', () => {
  const state = fresh();
  state.stats.math = 85;
  state.plan = Array.from({ length: 21 }, () => ({ activity: 'sleep', target: null }));
  state.plan[0] = { activity: 'study', target: 'linear_algebra' };
  const before = structuredClone(state),
    preview = activityPreview(state, 'study', 'linear_algebra');
  const executed = resolveWeek(state).history[0].actions[0];
  assert.equal(preview.effects.math, executed.delta.math);
  assert.equal(preview.courseGain, executed.courseDelta.linear_algebra);
  assert.deepEqual(state, before);
});
test('puzzle mistakes reduce a project mark without blocking completion or paying money', () => {
  let perfect = fresh();
  addTask(perfect, 'quality_task', {
    name: '채점 검사',
    course: 'linear_algebra',
    target: 1,
    deadline: 3,
    module: { id: 'order_v1', params: {} },
  });
  perfect.plan = Array.from({ length: 21 }, (_, index) =>
    index === 0
      ? { activity: 'task', target: 'quality_task' }
      : { activity: 'sleep', target: null },
  );
  perfect = transition(perfect, { type: 'advance' });
  perfect = transition(perfect, {
    type: 'task_game',
    task: 'quality_task',
    action: { type: 'start' },
  });
  let mistaken = transition(perfect, {
    type: 'task_game',
    task: 'quality_task',
    action: { type: 'pick', card: Math.max(...perfect.tasks.quality_task.moduleData.cards) },
  });
  perfect = solveTaskGame(perfect, 'quality_task');
  mistaken = solveTaskGame(mistaken, 'quality_task');
  for (const s of [perfect, mistaken]) workTask(s, 'quality_task', []);
  assert.equal(mistaken.tasks.quality_task.status, 'completed');
  assert.ok(mistaken.tasks.quality_task.result.score < perfect.tasks.quality_task.result.score);
  assert.ok(
    mistaken.tasks.quality_task.result.score >= perfect.tasks.quality_task.result.score * 0.9,
  );
  // Week 0 pays no monthly allowance; both runs pay the same living cost and earn nothing.
  assert.equal(perfect.money, 30000 - balance.weekly.livingCost);
  assert.equal(mistaken.money, perfect.money);
});
test('admission rounding and the displayed mark use the same pass boundary', () => {
  const state = fresh();
  state.stats.hp = 50;
  state.stats.stress = 0;
  const roll = (random(structuredClone(state)) - 0.5) * 12;
  state.stats.math = state.stats.writing = 75 - roll - 0.2;
  resolveAdmission(state, events.yonsei);
  assert.equal(state.admissions[0].score, 75);
  assert.equal(state.admissions[0].accepted, true);
});
test('application direction selects a bounded portfolio without granting free score bonuses', () => {
  function score(target, event) {
    const s = fresh();
    s.flags.target = target;
    resolveAdmission(s, event);
    return s.admissions[0];
  }
  assert.equal(score('dream', events.top_interview).applied, true);
  assert.equal(score('balanced', events.top_interview).applied, false);
  assert.equal(score('safe', events.korea_university).applied, true);
  assert.equal(score('safe', events.top_interview).applied, false);
  assert.equal(
    score('dream', events.top_interview).score,
    score('balanced', events.top_interview).score,
  );
});
test('missed housekeeping alone does not force the crime ending', () => {
  const s = fresh();
  s.week = 41;
  s.discipline = 8;
  s.choices.temptation = 'report';
  assert.ok(endingAvailable(s, 'work'));
  assert.equal(endingAvailable(s, 'prison'), false);
  s.choices.temptation = 'cheat';
  assert.ok(endingAvailable(s, 'prison'));
  assert.equal(endingAvailable(s, 'work'), false);
});
test('balance updates preserve past marks, stats and task results rather than recalculating a save', () => {
  const old = fresh();
  old.contentVersion = '2026.10.27-7';
  old.assessments = [
    { id: 'past', course: 'linear_algebra', kind: 'quiz', score: 98, term: 1, week: 6 },
  ];
  const before = structuredClone(old);
  const restored = migrateState(old);
  assert.deepEqual(restored.stats, before.stats);
  assert.deepEqual(restored.assessments, before.assessments);
  assert.deepEqual(restored.tasks, before.tasks);
  assert.deepEqual(old, before);
});
test('expanded full-year workload preserves strategic tradeoffs and bounded economies', () => {
  const runs = Object.fromEntries(
    ['tasks', 'balanced', 'essay', 'portfolio', 'academy', 'rest', 'overwork'].map((strategy) => [
      strategy,
      simulateYear({ strategy }).result,
    ]),
  );
  assert.ok(runs.tasks.completed > runs.balanced.completed);
  assert.ok(runs.tasks.completed / (runs.tasks.completed + runs.tasks.expired) > 0.85);
  assert.ok(runs.rest.stats.hp > runs.overwork.stats.hp);
  assert.ok(runs.overwork.fatigueWeeks >= 30);
  assert.ok(runs.rest.gpa2 < runs.tasks.gpa2);
  assert.ok(runs.essay.stats.math > runs.balanced.stats.math);
  assert.ok(runs.academy.money < runs.tasks.money);
  for (const result of Object.values(runs)) {
    assert.ok(result.minimumMoney >= 0);
    assert.ok(result.gpa1 >= 0 && result.gpa1 <= 4.3 && result.gpa2 >= 0 && result.gpa2 <= 4.3);
    assert.ok(result.admissions < result.admissionDetails.length);
  }
});
