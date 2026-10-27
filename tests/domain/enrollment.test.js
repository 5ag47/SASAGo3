import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { beginWeek } from '../../src/domain/events.js';
import { runPlannedWeek as resolveWeek } from '../helpers/task-games.js';
import { choiceOptions, INTERVIEW_QUESTIONS } from '../../src/domain/choices.js';
import { solveActiveTaskGames } from '../helpers/task-games.js';
const profile = { name: '선택과목', character: 'girl', role: 'steady', major: 'information' };
test('an information student with the urban elective can complete every school week', () => {
  let state = createGame({ ...profile, electives: ['urban_planning'] });
  while (state.week <= 40) {
    for (const event of [...state.pending]) {
      if (event === 'interview_day')
        state = transition(state, {
          type: 'choose',
          event,
          answers: INTERVIEW_QUESTIONS.map((question) => question.correct),
        });
      else {
        const option = choiceOptions(state, event).find((item) => !(item.cost > 0));
        if (option) state = transition(state, { type: 'choose', event, option: option.id });
      }
    }
    state = solveActiveTaskGames(state);
    state = transition(state, { type: 'preset', preset: 'tasks' });
    state = resolveWeek(state);
    assert.ok(validateState(state));
  }
  assert.equal(
    Object.values(state.tasks).filter((task) => task.course === 'urban_planning').length,
    32,
  );
  assert.equal(state.history.length, 41);
});
test('information includes AI project and the urban course stays optional', () => {
  const state = createGame(profile);
  assert.ok(state.courses.includes('ai_project'));
  assert.ok(!state.courses.includes('urban_planning'));
  assert.ok(
    createGame({ ...profile, electives: ['urban_planning'] }).courses.includes('urban_planning'),
  );
  for (const electives of [null, ['general_physics'], ['urban_planning', 'urban_planning']])
    assert.throws(
      () => createGame({ ...profile, electives }),
      (error) => error.code === 'ELECTIVES_INVALID',
    );
});
test('urban planning creates one recurring project in each school week, not during vacation', () => {
  const state = createGame({ ...profile, electives: ['urban_planning'] });
  assert.equal(state.tasks['urban-project-0'], undefined);
  state.week = 2;
  state.pending = [];
  beginWeek(state);
  beginWeek(state);
  assert.equal(
    Object.values(state.tasks).filter((task) => task.course === 'urban_planning').length,
    1,
  );
  state.plan = Array.from({ length: 21 }, (_, index) =>
    index === 0
      ? { activity: 'task', target: 'urban-project-2' }
      : { activity: 'sleep', target: null },
  );
  const after = resolveWeek(solveActiveTaskGames(state));
  assert.equal(after.tasks['urban-project-2'].status, 'completed');
  assert.equal(after.tasks['urban-project-3'].status, 'active');
  assert.equal(after.assessments.filter((mark) => mark.course === 'urban_planning').length, 1);
  after.week = 17;
  beginWeek(after);
  assert.equal(after.tasks['urban-project-17'], undefined);
});
test('an enrolled course cannot be dropped to escape an active assignment', () => {
  const state = createGame(profile);
  state.week = 1;
  const next = transition(state, {
    type: 'elective',
    course: 'urban_planning',
    term: 1,
    enabled: true,
  });
  assert.equal(next.tasks['urban-project-1'].status, 'active');
  assert.throws(
    () => transition(next, { type: 'elective', course: 'urban_planning', term: 1, enabled: false }),
    (error) => error.code === 'COURSE_DROP_CLOSED',
  );
  next.week = 5;
  assert.throws(
    () => transition(next, { type: 'elective', course: 'urban_planning', term: 1, enabled: true }),
    (error) => error.code === 'REGISTRATION_CLOSED',
  );
});
test('second semester electives take effect at the new semester and preserve old marks', () => {
  const state = createGame(profile);
  state.week = 11;
  let next = transition(state, {
    type: 'elective',
    course: 'urban_planning',
    term: 2,
    enabled: true,
  });
  assert.ok(!next.courses.includes('urban_planning'));
  next.assessments.push({
    id: 'past',
    course: 'linear_algebra',
    kind: 'quiz',
    score: 91,
    term: 1,
    week: 4,
  });
  next.week = 25;
  beginWeek(next);
  assert.ok(next.courses.includes('urban_planning'));
  assert.equal(next.assessments[0].score, 91);
  assert.ok(validateState(next));
});
test('old information saves gain AI without retroactive missing-work penalties', () => {
  const old = createGame(profile);
  old.week = 10;
  old.courses = old.courses.filter((id) => id !== 'ai_project');
  delete old.courseMastery.ai_project;
  delete old.electives;
  delete old.nextElectives;
  const originalTasks = Object.keys(old.tasks);
  const next = migrateState(old);
  assert.ok(next.courses.includes('ai_project'));
  assert.equal(next.courseMastery.ai_project, old.stats.science);
  assert.deepEqual(Object.keys(next.tasks), originalTasks);
  assert.ok(validateState(next));
});
test('mathematical problem analysis is a math seminar assignment rather than a new course', () => {
  const state = createGame(profile);
  state.week = 13;
  beginWeek(state);
  assert.equal(state.tasks.math_problem_analysis.course, 'math_seminar');
  assert.ok(!state.courses.includes('math_problem_analysis'));
});
