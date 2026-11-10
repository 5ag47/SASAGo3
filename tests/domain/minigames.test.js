import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { beginWeek } from '../../src/domain/events.js';
import { choiceDeadline, events } from '../../src/domain/catalog.js';
import { choiceOptions } from '../../src/domain/choices.js';
import { CARD_ROUNDS, cardMonth, cardScore } from '../../src/domain/card-game.js';
import {
  bestInterviewAnswers,
  INTERVIEW_QUESTIONS,
  interviewScore,
  interviewSpec,
} from '../../src/domain/interview.js';
import { migrateState, validateState } from '../../src/domain/state.js';

const choose = (state, event, option) => transition(state, { type: 'choose', event, option });
function atEvent(id, seed = 42) {
  const state = createGame(
    { name: '테스트', character: 'girl', role: 'steady', major: 'math' },
    seed,
  );
  state.pending = [];
  state.week = events[id].week;
  beginWeek(state);
  return state;
}
function bestMove(state) {
  const game = state.minigames.cards;
  const card =
    game.hand.find((id) => game.table.some((other) => cardMonth(id) === cardMonth(other))) ??
    game.hand[0];
  return `card:${card}`;
}

test('each interview answer persists through reload and is not overwritten by a batch submission', () => {
  const source = atEvent('interview_day');
  const best = bestInterviewAnswers(interviewSpec(source));
  const first = choose(source, 'interview_day', `answer:${best[0]}`);
  assert.equal(source.minigames.interview, null);
  assert.deepEqual(first.minigames.interview.answers, [best[0]]);
  assert.equal(first.interviewScore, 0);
  const restored = migrateState(JSON.parse(JSON.stringify(first)));
  assert.ok(validateState(restored));
  assert.throws(
    () => transition(restored, { type: 'choose', event: 'interview_day', answers: [0, 0, 0] }),
    { code: 'ANSWERS_INVALID' },
  );
  const second = choose(restored, 'interview_day', `answer:${best[1]}`);
  const final = choose(second, 'interview_day', `answer:${best[2]}`);
  assert.deepEqual(final.minigames.interview.answers, best);
  assert.equal(final.minigames.interview.phase, 'finished');
  assert.equal(
    final.minigames.interview.score,
    interviewScore(first.minigames.interview.questions, best, source.stats.speech),
  );
  assert.ok(final.stats.speech > source.stats.speech);
  assert.ok(final.stats.speech < source.stats.speech + 6);
  assert.equal(final.notices.filter((n) => n.title === '실전 면접 기록').length, 1);
  assert.ok(!final.pending.includes('interview_day'));
  assert.throws(() => choose(final, 'interview_day', 'answer:0'), { code: 'EVENT_INVALID' });
});

test('interview rejects malformed answers and retains an unanswered question', () => {
  const state = atEvent('interview_day');
  for (const option of ['answer:3', 'answer:-1', 'answer:1abc', 'answer:01', null])
    assert.throws(() => choose(state, 'interview_day', option), { code: 'ANSWERS_INVALID' });
  assert.equal(state.minigames.interview, null);
  const legacy = transition(state, {
    type: 'choose',
    event: 'interview_day',
    answers: INTERVIEW_QUESTIONS.map((q) => q.correct),
  });
  assert.equal(legacy.minigames.interview.phase, 'finished');
});

test('cards reserve one slot once, preserve chosen cards across reload, and reject cards outside the hand', () => {
  const source = atEvent('dorm_cards');
  const started = choose(source, 'dorm_cards', 'play');
  assert.equal(source.minigames.cards, null);
  assert.equal(started.flags.reservations[38].length, 1);
  assert.equal(started.money, source.money);
  const invalid = Array.from({ length: 48 }, (_, id) => id).find(
    (id) => !started.minigames.cards.hand.includes(id),
  );
  assert.throws(() => choose(started, 'dorm_cards', `card:${invalid}`), { code: 'OPTION_INVALID' });
  assert.throws(() => choose(started, 'dorm_cards', 'play'), { code: 'OPTION_INVALID' });
  const next = choose(started, 'dorm_cards', bestMove(started));
  assert.equal(next.minigames.cards.turn, 1);
  assert.equal(next.flags.reservations[38].length, 1);
  const restored = migrateState(JSON.parse(JSON.stringify(next)));
  assert.deepEqual(restored.minigames.cards, next.minigames.cards);
  assert.ok(validateState(restored));
});

test('card rounds, go, stop, wins and losses terminate without duplicate cards or money rewards', () => {
  const outcomes = new Set();
  let sawGo = false;
  let sawStop = false;
  for (let seed = 1; seed <= 160; seed++) {
    let state = choose(atEvent('dorm_cards', seed), 'dorm_cards', 'play');
    const money = state.money;
    let moves = 0;
    while (state.pending.includes('dorm_cards')) {
      const game = state.minigames.cards;
      let option = bestMove(state);
      if (game.phase === 'decision') {
        option = seed % 2 ? 'go' : 'stop';
        sawGo ||= option === 'go';
        sawStop ||= option === 'stop';
      }
      assert.ok(choiceOptions(state, 'dorm_cards').some((o) => o.id === option));
      state = choose(state, 'dorm_cards', option);
      assert.ok(validateState(state));
      assert.ok(++moves <= CARD_ROUNDS * 2);
      assert.equal(state.money, money);
    }
    const game = state.minigames.cards;
    outcomes.add(game.result);
    assert.equal(game.phase, 'finished');
    assert.equal(state.flags.cardWins, Number(game.result === 'won'));
    assert.equal(state.notices.filter((n) => n.title === '기숙사 고스톱 결과').length, 1);
    if (game.reason === 'stop') assert.ok(cardScore(game.mine) >= 3);
    if (game.reason === 'friend') assert.ok(cardScore(game.friend) >= 3);
    assert.throws(() => choose(state, 'dorm_cards', 'stop'), { code: 'EVENT_INVALID' });
  }
  assert.ok(sawGo && sawStop);
  assert.ok(outcomes.has('won') && outcomes.has('lost'));
});

test('unfinished mini-games expire at their deadline without blocking week progress or granting a result', () => {
  for (const [id, option, key] of [
    ['dorm_cards', 'play', 'cards'],
    ['interview_day', 'answer:1', 'interview'],
  ]) {
    let state = choose(atEvent(id), id, option);
    state.week = choiceDeadline(id);
    state = transition(state, { type: 'advance' });
    assert.equal(state.choices[id], 'skipped');
    assert.equal(state.minigames[key].phase, 'abandoned');
    assert.ok(!state.pending.includes(id));
    assert.equal(state.interviewScore, 0);
    assert.ok(validateState(state));
  }
});

test('old saves gain empty mini-game state without changing progress and malformed new saves are rejected', () => {
  const old = atEvent('dorm_cards');
  delete old.minigames;
  const migrated = migrateState(old);
  assert.deepEqual(migrated.minigames, { cards: null, interview: null });
  assert.ok(validateState(migrated));
  assert.equal(old.minigames, undefined);
  const started = choose(migrated, 'dorm_cards', 'play');
  const bad = structuredClone(started);
  bad.minigames.cards.hand[1] = bad.minigames.cards.hand[0];
  assert.equal(validateState(bad), false);
  bad.minigames = { cards: null, interview: { answers: [5], phase: 'active', score: null } };
  assert.equal(validateState(bad), false);
});
