import { secondSemesterCourses } from '../../src/domain/enrollment.js';
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
        const option = choiceOptions(state, event).find((item) => !item.locked && !(item.cost > 0));
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
    0,
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
test('elective courses remain enrolled without weekly extra assignments', () => {
  const state = createGame({ ...profile, electives: ['urban_planning'] });
  for (let week = 1; week <= 40; week++) {
    state.week = week;
    beginWeek(state);
  }
  assert.ok(state.courses.includes('urban_planning'));
  assert.equal(Object.values(state.tasks).filter((t) => t.course === 'urban_planning').length, 0);
});
test('registration is final for both terms and active assignments cannot be avoided', () => {
  for (const week of [0, 1, 11, 25]) {
    const state = createGame({ ...profile, electives: ['urban_planning'] });
    state.week = week;
    beginWeek(state);
    const before = structuredClone(state);
    for (const term of [1, 2])
      for (const enabled of [true, false]) {
        assert.throws(
          () => transition(state, { type: 'elective', course: 'urban_planning', term, enabled }),
          (error) => error.code === 'REGISTRATION_CLOSED',
        );
        assert.deepEqual(state, before);
      }
  }
});
test('second semester keeps initial enrollment and past marks despite legacy queued changes', () => {
  const next = createGame(profile);
  next.nextMajor = 'biology';
  next.nextElectives = ['urban_planning'];
  const initial = [...next.courses];
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
  assert.deepEqual(next.courses, secondSemesterCourses(profile.major, next.electives));
  assert.ok(initial.includes('cs_project'));
  assert.equal(next.major, profile.major);
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
test('common math seminar stays enrolled without an extra assignment', () => {
  const state = createGame(profile);
  state.week = 13;
  beginWeek(state);
  assert.equal(state.tasks.math_problem_analysis, undefined);
  assert.ok(state.courses.includes('math_seminar'));
  assert.ok(!state.courses.includes('math_problem_analysis'));
});
