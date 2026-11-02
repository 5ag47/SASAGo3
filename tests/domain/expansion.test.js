import { runPlannedWeek as resolveWeek } from '../helpers/task-games.js';
import test from 'node:test';
import { solveActiveTaskGames } from '../helpers/task-games.js';
import assert from 'node:assert/strict';
import { createGame, transition, planPreset, ENDINGS } from '../../src/domain/engine.js';
import { baseState, migrateState, validateState } from '../../src/domain/state.js';
import { beginWeek } from '../../src/domain/events.js';
import { courseAbility } from '../../src/domain/course-progress.js';
import { assess, resolveAdmission } from '../../src/domain/grades.js';
import { effectivePlan, lockedSlots } from '../../src/domain/week.js';
import { reviewPlan, taskAllocation } from '../../src/domain/planning.js';
import { assessmentsAt, nextAssessments } from '../../src/domain/school-calendar.js';
import { events, courses, quizzes, period, TUTORIAL_LAST_WEEK } from '../../src/domain/catalog.js';
const profile = { name: '확장 테스트', character: 'girl', role: 'steady', major: 'math' };
test('the finished year shows graduation rather than wrapping back to December week one', () => {
  assert.equal(period(40).weekOfMonth, 4);
  assert.equal(period(41).label, '졸업 · 최종 결과');
});
const fresh = () => createGame(profile, 123);
const rest = (state) => {
  state.plan = Array.from({ length: 21 }, () => ({ activity: 'sleep', target: null }));
  return state;
};

test('studying a course grows its own mastery while another course stays unchanged', () => {
  const source = rest(fresh());
  source.plan[0] = { activity: 'study', target: 'linear_algebra' };
  const after = resolveWeek(source);
  assert.ok(after.courseMastery.linear_algebra > source.courseMastery.linear_algebra);
  assert.equal(after.courseMastery.math_seminar, source.courseMastery.math_seminar);
  assert.ok(after.history[0].courseDelta.linear_algebra > 0);
  assert.equal(after.history[0].courseDelta.math_seminar, undefined);
  assert.equal(source.history.length, 0);
});
test('course mastery changes exam results even when general ability and random seed match', () => {
  const first = fresh();
  const second = structuredClone(first);
  first.courseMastery.linear_algebra = 90;
  second.courseMastery.linear_algebra = 20;
  assert.ok(courseAbility(first, 'linear_algebra') > courseAbility(second, 'linear_algebra'));
  assess(first, 'quiz');
  assess(second, 'quiz');
  assert.ok(first.assessments[0].score > second.assessments[0].score);
  assert.equal(first.assessments[1].score, second.assessments[1].score);
});
test('legacy saves gain course mastery without changing existing marks or source data', () => {
  const old = fresh();
  assess(old, 'quiz');
  delete old.courseMastery;
  const marks = structuredClone(old.assessments);
  const next = migrateState(old);
  assert.equal(old.courseMastery, undefined);
  assert.equal(next.courseMastery.linear_algebra, old.stats.math);
  assert.deepEqual(next.assessments, marks);
  assert.ok(validateState(next));
});
test('new semester enrolls new course mastery and preserves past courses', () => {
  const state = fresh();
  state.courseMastery.general_physics = 77;
  state.week = 25;
  state.nextMajor = 'chemistry';
  beginWeek(state);
  assert.equal(state.courseMastery.general_physics, 77);
  assert.equal(state.courseMastery.general_chemistry, state.stats.science);
});
test('math practice requires math study, and automatic task planning really studies math', () => {
  const state = fresh();
  assert.throws(
    () => transition(state, { type: 'plan', index: 0, activity: 'task', target: 'first-study' }),
    (error) => error.code === 'TASK_INVALID',
  );
  const nonMath = transition(state, {
    type: 'plan',
    index: 0,
    activity: 'study',
    target: 'general_physics',
  });
  assert.equal(nonMath.flags.tutorialStudy, undefined);
  state.plan = planPreset(state, 'tasks');
  assert.equal(courses[state.plan[0].target].ability, 'math');
  const after = resolveWeek(solveActiveTaskGames(state));
  assert.equal(after.tasks['first-study'].status, 'completed');
  assert.equal(after.tasks['practice-report'].status, 'completed');
});
test('task coverage counts actual locked schedule and recognizes subject study', () => {
  const state = rest(fresh());
  state.plan[0] = { activity: 'study', target: 'linear_algebra' };
  assert.equal(taskAllocation(state, state.tasks['first-study']).covered, true);
  state.flags.reservations = { 0: [{ index: 0, activity: 'lecture', event: 'career_sessions' }] };
  assert.equal(taskAllocation(state, state.tasks['first-study']).slots, 0);
  // Practice tasks stay open through the tutorial period instead of closing with the winter week.
  assert.equal(reviewPlan(state).due.length, 0);
  assert.equal(reviewPlan({ ...state, week: TUTORIAL_LAST_WEEK }).due.length, 2);
});
test('event attendance consumes the shared work budget and keeps its fixed slots', () => {
  const state = fresh();
  state.week = 11;
  state.tasks = {};
  state.pending = [];
  beginWeek(state);
  let next = transition(state, { type: 'choose', event: 'career_sessions', option: 'both' });
  assert.equal(Object.keys(lockedSlots(next)).length, 2);
  next.tasks.custom = {
    id: 'custom',
    name: '시간 배정',
    description: '',
    start: 11,
    deadline: 11,
    target: 8,
    progress: 0,
    status: 'active',
    reward: {},
    penalty: {},
  };
  next = transition(next, { type: 'preset', preset: 'tasks' });
  assert.equal(
    effectivePlan(next).filter((slot) => slot.activity === 'task' && slot.target === 'custom')
      .length,
    7,
  );
  assert.throws(
    () => transition(next, { type: 'plan', index: 0, activity: 'sleep' }),
    (error) => error.code === 'SLOT_INVALID',
  );
});
test('summer math and science classes coexist and end after vacation', () => {
  const state = fresh();
  state.week = 18;
  state.flags.camp = 'heavy';
  state.flags.scienceCamp = true;
  assert.equal(effectivePlan(state).filter((slot) => slot.activity === 'academy').length, 3);
  assert.equal(
    effectivePlan(state).filter((slot) => slot.activity === 'science_academy').length,
    2,
  );
  state.week = 25;
  assert.equal(Object.keys(lockedSlots(state)).length, 0);
});
test('a life quiz changes no marks or cash and cannot be answered twice', () => {
  const state = fresh();
  state.week = 6;
  state.pending = [];
  beginWeek(state);
  const after = transition(state, {
    type: 'choose',
    event: 'common_knowledge',
    option: String(quizzes.common_knowledge.correct),
  });
  assert.equal(after.money, state.money);
  assert.deepEqual(after.assessments, state.assessments);
  assert.ok(after.notices.some((notice) => notice.title.includes('정답')));
  assert.throws(() =>
    transition(after, { type: 'choose', event: 'common_knowledge', option: '1' }),
  );
});
test('dorm rule decisions change discipline while the permitted choice avoids it', () => {
  const state = fresh();
  state.week = 3;
  state.pending = [];
  beginWeek(state);
  assert.equal(
    transition(state, { type: 'choose', event: 'dorm_delivery', option: 'room' }).discipline,
    1,
  );
  assert.equal(
    transition(state, { type: 'choose', event: 'dorm_delivery', option: 'allowed' }).discipline,
    0,
  );
});
test('external awards are excluded from the designated track and included in other tracks', () => {
  const score = (event, awards) => {
    const state = fresh();
    state.awards = awards;
    resolveAdmission(state, event);
    return state.admissions[0].score;
  };
  assert.equal(score(events.top_interview, 2), score(events.top_interview, 0));
  assert.equal(score(events.kaist_postech, 2) - score(events.kaist_postech, 0), 4);
});
test('calendar and week resolution share assessment dates', () => {
  assert.deepEqual(
    assessmentsAt(36).map((exam) => exam.kind),
    ['quiz', 'final'],
  );
  assert.equal(nextAssessments(5)[0].week, 6);
  assert.deepEqual(nextAssessments(41), []);
});
test('all six endings are reachable with their stated conditions', () => {
  for (const ending of Object.keys(ENDINGS)) {
    const state = fresh();
    state.week = ending === 'leave' ? 3 : 41;
    state.stats.science = 70;
    state.stats.reputation = 60;
    state.awards = 1;
    if (ending === 'university')
      state.admissions.push({
        name: '합격',
        score: 90,
        accepted: true,
        week: 35,
        reason: '테스트',
      });
    if (ending === 'prison') {
      state.discipline = 5;
      state.choices.temptation = 'cheat';
    }
    const after = transition(state, { type: 'ending', ending });
    assert.equal(after.ending.id, ending);
    assert.ok(validateState(after));
  }
});
test('new game run revision changes on restart without exposing the random seed', () => {
  const start = transition(baseState(), { type: 'create', profile });
  const reset = { ...baseState(), revision: start.revision + 10 };
  const second = transition(reset, { type: 'create', profile });
  assert.notEqual(start.flags.runRevision, second.flags.runRevision);
});
