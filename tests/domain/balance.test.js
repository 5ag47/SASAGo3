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
    (c) => delete c.admissions.targetBonuses.safe,
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
  assert.equal(next.plan[0].target, 'urgent_task');
  assert.equal(next.plan[6].target, 'urgent_task');
  assert.equal(lockedSlots(next)[3].activity, 'lecture');
  const work = next.plan.filter(
    (slot, index) => lockedSlots(next)[index] || ['study', 'task'].includes(slot.activity),
  );
  assert.equal(work.length, 9);
  assert.deepEqual(state, before);
  state.fatigue = 1;
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
  assert.equal(perfect.money, 40000);
  assert.equal(mistaken.money, 40000);
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
test('application focus trades preparation between tracks instead of lowering every threshold', () => {
  function score(target, event) {
    const s = fresh();
    s.flags.target = target;
    resolveAdmission(s, event);
    return s.admissions[0].score;
  }
  assert.ok(score('dream', events.top_interview) > score('balanced', events.top_interview));
  assert.ok(score('dream', events.korea_university) < score('balanced', events.korea_university));
  assert.ok(score('safe', events.korea_university) > score('balanced', events.korea_university));
  assert.ok(score('safe', events.top_interview) < score('balanced', events.top_interview));
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
test('full-year strategies retain distinct benefits and costs within standard raising difficulty', () => {
  const runs = Object.fromEntries(
    ['tasks', 'balanced', 'essay', 'portfolio', 'academy', 'rest', 'overwork'].map((strategy) => [
      strategy,
      simulateYear({ strategy }).result,
    ]),
  );
  const { tasks, balanced, essay, portfolio, academy, rest, overwork } = runs;
  assert.equal(tasks.expired, 0);
  assert.ok(tasks.endings.includes('university'));
  assert.ok(tasks.fatigueWeeks <= 4);
  assert.ok(tasks.gpa2 >= 3 && tasks.gpa2 < 4.3);
  assert.ok(ACADEMIC_STATS.every((id) => tasks.stats[id] < 98));
  assert.ok(Object.values(tasks.mastery).filter((v) => v < 100).length >= 4);
  assert.ok(tasks.completed > balanced.completed);
  assert.ok(tasks.gpa2 > balanced.gpa2);
  assert.ok(essay.stats.math > balanced.stats.math + 10);
  assert.ok(essay.stats.science < balanced.stats.science - 20);
  assert.ok(essay.gpa2 < balanced.gpa2 - 0.3);
  assert.ok(essay.admissionDetails[0].score >= balanced.admissionDetails[0].score + 8);
  assert.ok(portfolio.stats.speech > tasks.stats.speech + 10);
  assert.ok(portfolio.stats.hp < tasks.stats.hp - 15);
  assert.ok(
    portfolio.admissionDetails.find((a) => a.name === events.top_interview.name).score >
      tasks.admissionDetails.find((a) => a.name === events.top_interview.name).score,
  );
  assert.ok(academy.money < tasks.money - 100000);
  assert.ok(academy.stats.math > tasks.stats.math + 8);
  assert.ok(academy.admissions < 6);
  assert.ok(tasks.admissions < 6);
  assert.ok(rest.gpa2 < tasks.gpa2);
  assert.ok(overwork.gpa2 < tasks.gpa2);
  assert.ok(rest.stats.hp > 80);
  assert.ok(overwork.fatigueWeeks >= 30);
  assert.ok(Object.values(runs).every((run) => run.minimumMoney >= 0));
});
