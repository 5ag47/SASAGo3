import { runPlannedWeek as resolveWeek } from '../helpers/task-games.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition, endingAvailable, planPreset } from '../../src/domain/engine.js';
import { baseState, validateState } from '../../src/domain/state.js';
import { activities, courses, events, MAJORS, REQUIRED, roles } from '../../src/domain/catalog.js';
import { choiceOptions, INTERVIEW_QUESTIONS } from '../../src/domain/choices.js';
import { beginWeek } from '../../src/domain/events.js';
import { courseGrades, gpa, assess } from '../../src/domain/grades.js';
import { effectivePlan } from '../../src/domain/week.js';
import { solveActiveTaskGames } from '../helpers/task-games.js';
const profile = { name: '테스트', character: 'boy', role: 'steady', major: 'math' };
const fresh = (seed = 123) => createGame(profile, seed);
function ready(state = fresh()) {
  return solveActiveTaskGames(
    transition(state, { type: 'choose', event: 'winter_study', option: 'friends' }),
  );
}
function fill(state, activity, target = null) {
  return { ...state, plan: Array.from({ length: 21 }, () => ({ activity, target })) };
}
function decide(state) {
  while (state.pending.length) {
    const event = state.pending[0];
    if (event === 'interview_day')
      state = transition(state, {
        type: 'choose',
        event,
        answers: INTERVIEW_QUESTIONS.map((q) => q.correct),
      });
    else {
      const option = choiceOptions(state, event).find((o) => !(o.cost > 0));
      state = transition(state, { type: 'choose', event, option: option.id });
    }
  }
  return state;
}
test('five separate majors contain exactly their major courses and four required courses', () => {
  for (const major of Object.keys(MAJORS)) {
    const state = createGame({ ...profile, major });
    assert.deepEqual(state.courses, [...MAJORS[major].courses, ...REQUIRED]);
    assert.equal(state.plan.length, 21);
    assert.ok(validateState(state));
  }
});
test('roles change starting stats without accepting arbitrary stat allocation', () => {
  assert.equal(createGame({ ...profile, role: 'social' }).stats.reputation, 50);
  assert.equal(fresh().stats.math, 36);
});
test('the initial sample schedule contains only available activities and real task targets', () => {
  const state = fresh();
  assert.ok(
    state.plan.every((slot) => slot.activity !== 'research' && slot.activity !== 'study_group'),
  );
  assert.ok(
    state.plan
      .filter((slot) => slot.activity === 'task')
      .every((slot) => state.tasks[slot.target]?.status === 'active'),
  );
});
test('invalid commands and a closed game cannot mutate a source state', () => {
  const state = ready();
  const before = structuredClone(state);
  for (const command of [
    { type: 'plan', index: -1, activity: 'study' },
    { type: 'plan', index: 21, activity: 'sleep' },
    { type: 'plan', index: 1, activity: 'study', target: 'fake' },
    { type: 'buy', item: '__proto__' },
    { type: 'choose', event: 'thesis', option: 'skip' },
    { type: 'create', profile },
    { type: 'award', amount: 999 },
  ])
    assert.throws(() => transition(state, command));
  assert.deepEqual(state, before);
  assert.throws(() => resolveWeek(baseState()));
});
test('a player can study or advance before responding to optional events', () => {
  const s = fresh();
  const edited = transition(s, {
    type: 'plan',
    index: 0,
    activity: 'study',
    target: 'linear_algebra',
  });
  const after = resolveWeek(edited);
  assert.equal(after.week, 1);
  assert.ok(after.pending.includes('winter_study'));
  assert.equal(after.group, null);
});
test('expired choices are recorded as skipped without making a choice for the player', () => {
  const s = fresh();
  s.week = 4;
  const after = resolveWeek(s);
  assert.equal(after.choices.winter_study, 'skipped');
  assert.equal(after.group, null);
  assert.ok(!after.pending.includes('winter_study'));
});
test('failed study applications exclude only that team and preserve another choice', () => {
  let state = transition(fresh(1500), {
    type: 'choose',
    event: 'winter_study',
    option: 'focused',
  });
  assert.equal(state.group, null);
  assert.equal(state.studyApplication.group, 'focused');
  state = resolveWeek(state);
  if (state.group === null) {
    assert.ok(state.rejectedGroups.includes('focused'));
    assert.ok(state.pending.includes('winter_study'));
    assert.ok(choiceOptions(state, 'winter_study').some((o) => o.id === 'friends'));
  } else assert.equal(state.group, 'focused');
});
test('a math study slot automatically checks off the first tutorial task', () => {
  const state = fill(ready(), 'sleep');
  state.plan[0] = { activity: 'study', target: 'linear_algebra' };
  const after = resolveWeek(state);
  assert.equal(after.tasks['first-study'].status, 'completed');
  assert.ok(after.stats.math > state.stats.math);
  assert.equal(after.week, 1);
  assert.equal(after.history[0].actions.length, 21);
});
test('completing a task grants no extra money', () => {
  const s = fill(ready(), 'sleep');
  s.plan[0] = { activity: 'study', target: 'linear_algebra' };
  const completed = resolveWeek(s);
  const baseline = resolveWeek(fill(ready(), 'sleep'));
  assert.equal(completed.money, baseline.money);
});
test('recovery restores health and reduces stress but weekly baseline is still logged', () => {
  const state = fill(ready(), 'sleep');
  state.stats.hp = 10;
  state.stats.stress = 90;
  const after = resolveWeek(state);
  assert.ok(after.stats.hp > state.stats.hp);
  assert.ok(after.stats.stress < state.stats.stress);
  assert.ok(after.history[0].messages.some((m) => m.includes('기본 6')));
});
test('a finished task is not silently reassigned to a new task next week', () => {
  const state = fill(ready(), 'task', 'practice-report');
  const after = resolveWeek(state);
  assert.equal(after.tasks['practice-report'].status, 'completed');
  assert.equal(after.tasks.thesis.status, 'active');
  assert.ok(after.plan.every((slot) => slot.activity === 'sleep'));
});
test('workload adds stress and a fatigue debuff applies to the following week', () => {
  const state = fill(ready(), 'study', 'linear_algebra');
  state.stats.hp = 40;
  state.stats.stress = 75;
  const after = resolveWeek(state);
  assert.equal(after.fatigue, 1);
  assert.ok(
    after.history[0].messages.some((m) => m.includes('만성피로') || m.includes('과로 누적')),
  );
  const normal = fill(ready(), 'study', 'linear_algebra');
  normal.stats.math = 0;
  const tired = { ...structuredClone(normal), fatigue: 1 };
  assert.ok(resolveWeek(normal).stats.math > resolveWeek(tired).stats.math);
});
test('same seed and same commands produce identical outcomes and deltas', () => {
  const source = ready(fresh(454));
  const a = resolveWeek(source);
  const b = resolveWeek(source);
  assert.deepEqual(a, b);
  for (const key of Object.keys(source.stats))
    assert.equal(a.history[0].delta[key], Math.round((a.stats[key] - source.stats[key]) * 10) / 10);
});
test('task progress rewards once, and a finished target becomes rest', () => {
  const state = ready();
  state.week = 1;
  state.pending = [];
  beginWeek(state);
  state.pending = [];
  const after = resolveWeek(fill(solveActiveTaskGames(state), 'research'));
  assert.equal(after.tasks.thesis.progress, 12);
  assert.equal(after.tasks.thesis.status, 'completed');
  assert.equal(
    after.history[0].messages.filter((m) => m === `완료 · ${state.tasks.thesis.name}`).length,
    1,
  );
  assert.ok(after.history[0].actions.slice(12).every((a) => a.activity === 'sleep'));
});
test('overdue assignments expire once and create an incomplete project mark', () => {
  const state = ready();
  state.week = 2;
  beginWeek(state);
  state.pending = [];
  state.week = 4;
  const after = resolveWeek(fill(state, 'sleep'));
  assert.equal(after.tasks['project-2-general_physics'].status, 'expired');
  assert.ok(
    after.assessments.some(
      (a) => a.course === 'general_physics' && a.kind === 'project' && a.score === 0,
    ),
  );
  const later = resolveWeek({ ...after, pending: [] });
  assert.equal(later.assessments.filter((a) => a.id === 'project-2-general_physics').length, 1);
});
test('completing room cleaning prevents inspection penalties', () => {
  const state = ready();
  state.week = 4;
  beginWeek(state);
  state.pending = [];
  const clean = fill(solveActiveTaskGames(state), 'sleep');
  clean.plan[0] = { activity: 'clean', target: null };
  assert.equal(resolveWeek(clean).discipline, 0);
  assert.equal(resolveWeek(fill(state, 'sleep')).discipline, 1);
});
test('shop costs cannot underflow and unknown items are rejected', () => {
  const state = ready();
  state.money = 0;
  assert.throws(
    () => transition(state, { type: 'buy', item: 'milk' }),
    (e) => e.code === 'MONEY_LOW',
  );
  assert.equal(transition(ready(), { type: 'buy', item: 'milk' }).money, 28200);
});
test('an unaffordable activity substitutes rest instead of negative money', () => {
  const state = fill(ready(), 'academy');
  state.money = 0;
  const after = resolveWeek(state);
  assert.ok(after.money >= 0);
  assert.ok(after.history[0].actions.some((a) => a.note.includes('잔액 부족')));
});
test('course grades use assessment weights and credit weighted GPA', () => {
  const state = ready();
  state.assessments = [
    { course: 'linear_algebra', term: 1, kind: 'quiz', score: 80 },
    { course: 'linear_algebra', term: 1, kind: 'midterm', score: 100 },
    { course: 'linear_algebra', term: 1, kind: 'final', score: 90 },
    { course: 'linear_algebra', term: 1, kind: 'project', score: 100 },
  ];
  assert.equal(courseGrades(state)[0].score, 93);
  assert.equal(gpa(state), 4);
  assert.equal(courseGrades(state)[0].provisional, false);
});
test('exam randomness is bounded and persists in marks', () => {
  const state = ready();
  state.week = 7;
  assess(state, 'midterm');
  assert.equal(state.assessments.length, state.courses.length);
  assert.ok(
    state.assessments.every((a) => a.score >= 0 && a.score <= 100 && Number.isFinite(a.difficulty)),
  );
});
test('second semester registration preserves first semester marks', () => {
  const state = ready();
  state.week = 25;
  state.nextMajor = 'biology';
  state.assessments = [{ course: 'general_physics', term: 1, kind: 'quiz', score: 85 }];
  beginWeek(state);
  assert.equal(state.major, 'biology');
  assert.ok(state.courses.includes('general_biology'));
  assert.equal(state.assessments[0].course, 'general_physics');
});
test('summer fixed classes reduce editable slots', () => {
  const state = ready();
  state.week = 18;
  state.flags.camp = 'heavy';
  assert.equal(effectivePlan(state).filter((s) => s.activity === 'academy').length, 3);
  assert.throws(() => transition(state, { type: 'plan', index: 1, activity: 'sleep' }));
});
test('reputation speeds up essay progress, not all ordinary assignments', () => {
  const state = ready();
  state.week = 25;
  state.pending = [];
  state.stats.reputation = 70;
  beginWeek(state);
  state.pending = [];
  const plan = fill(solveActiveTaskGames(state), 'sleep');
  plan.plan[0] = { activity: 'essay', target: null };
  const high = resolveWeek(plan).tasks.essay.progress;
  const ordinary = structuredClone(plan);
  ordinary.stats.reputation = 35;
  assert.ok(high > resolveWeek(ordinary).tasks.essay.progress);
  assert.ok(high > 1 && high <= 1.75);
});
test('task preset plans deadlines in order and keeps recovery slots', () => {
  const state = ready();
  const plan = planPreset(state, 'tasks');
  assert.equal(plan[0].activity, 'study');
  assert.equal(courses[plan[0].target].ability, 'math');
  assert.equal(plan[2].activity, 'sleep');
  assert.equal(plan.length, 21);
});
test('all five majors can complete the full year with valid, bounded states', () => {
  for (const major of Object.keys(MAJORS)) {
    let state = createGame({ ...profile, major }, 721);
    while (state.week <= 40) {
      state = decide(state);
      state = solveActiveTaskGames(state);
      state = transition(state, {
        type: 'preset',
        preset: state.week % 3 === 0 ? 'balanced' : 'tasks',
      });
      state = resolveWeek(state);
      assert.ok(validateState(state));
    }
    assert.equal(state.history.length, 41);
    assert.equal(
      state.admissions.length,
      Object.values(events).filter((event) => ['admission', 'creative'].includes(event.kind))
        .length,
    );
    assert.ok(endingAvailable(state, 'work'));
    state = transition(state, { type: 'ending', ending: 'work' });
    assert.equal(state.ending.id, 'work');
    assert.throws(() => resolveWeek(state));
  }
});
test('new catalog records have stable keys and valid course references', () => {
  for (const [id, event] of Object.entries(events)) {
    assert.ok(Number.isInteger(event.week), id);
    if (event.course) assert.ok(courses[event.course]);
    if (event.kind === 'task') assert.ok(event.deadline >= event.week);
  }
  for (const a of Object.values(activities)) assert.ok(a.name && a.category);
  assert.equal(Object.keys(roles).length, 4);
});
