import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { validateState } from '../../src/domain/state.js';
import {
  answerPoints,
  bestInterviewAnswers,
  interviewScore,
  interviewSpec,
  validInterview,
} from '../../src/domain/interview.js';
import { solveActiveTaskGames } from '../helpers/task-games.js';
import { addTask } from '../../src/domain/tasks.js';
import { assignments } from '../../src/domain/catalog.js';

function atInterview(seed = 5) {
  const state = solveActiveTaskGames(
    transition(
      createGame({ name: '면접', character: 'boy', role: 'steady', major: 'chemistry' }, seed),
      {
        type: 'choose',
        event: 'winter_study',
        option: 'friends',
      },
    ),
  );
  state.week = 33;
  state.pending = ['interview_day'];
  addTask(state, 'done', {
    ...assignments['project-30-general_chemistry'],
    week: 30,
    deadline: 32,
  });
  Object.assign(state.tasks.done, {
    status: 'completed',
    progress: state.tasks.done.target,
    result: { module: 'report_v1', score: 90, note: '', quality: 95 },
  });
  return state;
}

test('the best record answer depends on how well that work was actually done', () => {
  const strong = interviewSpec(atInterview());
  assert.equal(strong[0].name, '아바화 탐구 보고서');
  assert.equal(bestInterviewAnswers(strong)[0], 0, 'explain solid work in detail');
  const weak = atInterview();
  weak.tasks.done.result.quality = 60;
  const weakSpec = interviewSpec(weak);
  assert.equal(bestInterviewAnswers(weakSpec)[0], 2, 'own the gaps in thin work');
  assert.ok(answerPoints(weakSpec[0], 0) < answerPoints(weakSpec[0], 2));
});

test('a story the record does not support costs points', () => {
  const state = atInterview();
  state.choices.chat_incident = 'mute';
  state.group = null;
  const spec = interviewSpec(state);
  assert.ok(answerPoints(spec[2], 0) < 0.5, 'claiming to have led the chat cleanup');
  assert.ok(answerPoints(spec[2], 2) < 0.5, 'claiming study teamwork without a group');
  assert.ok(answerPoints(spec[2], 1) >= 0.8);
});

test('questions are fixed when the interview starts and the score follows the record', () => {
  let state = atInterview();
  state = transition(state, { type: 'choose', event: 'interview_day', option: 'answer:0' });
  const frozen = structuredClone(state.minigames.interview.questions);
  state.tasks.done.result.quality = 10;
  state.choices.chat_incident = 'help';
  state = transition(state, { type: 'choose', event: 'interview_day', option: 'answer:1' });
  assert.deepEqual(state.minigames.interview.questions, frozen);
  const speech = state.stats.speech;
  state = transition(state, { type: 'choose', event: 'interview_day', option: 'answer:1' });
  const game = state.minigames.interview;
  assert.equal(game.phase, 'finished');
  assert.equal(game.score, interviewScore(frozen, [0, 1, 1], speech));
  assert.ok(validateState(state));
});

test('interviews answered with the old fixed questions remain valid saves', () => {
  assert.ok(validInterview({ answers: [1, 2, 0], phase: 'finished', score: 80 }));
  assert.ok(validInterview({ answers: [1], phase: 'active', score: null }));
  assert.equal(
    validInterview({ answers: [1], phase: 'active', score: null, questions: [{ kind: 'record' }] }),
    false,
  );
});

test('the record question asks about major coursework before a later elective project', () => {
  const state = atInterview();
  addTask(state, 'later', { ...assignments['urban-project-32'], week: 32, deadline: 33 });
  Object.assign(state.tasks.later, {
    status: 'completed',
    progress: state.tasks.later.target,
    result: { module: 'order_v2', score: 95, note: '', quality: 100 },
  });
  assert.equal(interviewSpec(state)[0].task, 'done');
});

test('an empty or thin record cannot be talked into a strong interview', () => {
  const state = atInterview();
  delete state.tasks.done;
  state.stats.math = state.stats.science = 10;
  const spec = interviewSpec(state);
  assert.equal(spec[0].task, null);
  const best = bestInterviewAnswers(spec);
  assert.ok(answerPoints(spec[0], best[0]) <= 0.4);
  assert.ok(answerPoints(spec[1], best[1]) <= 0.5);
  assert.ok(interviewScore(spec, best, 30) < 60);
});
