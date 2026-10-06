import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, validSave, weekDate, dateLabel } from './game.js';

test('입력한 프로필과 주간 일정의 저장 데이터를 다시 읽을 수 있다', () => {
  const game = initialGame();
  game.created = true;
  game.name = '오은';
  game.character = 'girl';
  game.plan[3] = 'rest';
  game.tasks[0] = true;
  const restored = JSON.parse(JSON.stringify(game));
  assert.equal(validSave(restored), true);
  assert.deepEqual(restored, game);
});

test('잘못된 저장 데이터는 메인 화면을 깨뜨리지 않도록 거부한다', () => {
  for (const value of [null, {}, { ...initialGame(), plan: ['math'] },
    { ...initialGame(), plan: ['constructor', 'math', 'math', 'math', 'math', 'math'] },
    { ...initialGame(), stats: null }, { ...initialGame(), stats: { ...initialGame().stats, hp: 101 } },
    { ...initialGame(), created: 'true' }, { ...initialGame(), name: '   ' },
    { ...initialGame(), tasks: ['false', true] }, { ...initialGame(), week: -1 },
    { ...initialGame(), character: 'unknown' }]) {
    assert.equal(validSave(value), false);
  }
});

test('예시 주간 일정은 월요일에 시작하며 월 경계를 올바르게 넘는다', () => {
  assert.equal(weekDate(0).toISOString().slice(0, 10), '2026-09-07');
  assert.equal(weekDate(0).getUTCDay(), 1);
  assert.equal(dateLabel(0), '2026년 9월 1주차');
  assert.equal(weekDate(4).toISOString().slice(0, 10), '2026-10-05');
  assert.equal(dateLabel(4), '2026년 10월 1주차');
});
