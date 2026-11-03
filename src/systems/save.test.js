import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, initialGame } from '../game.js';
import { loadGame, saveGame } from './save.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('저장한 게임을 복원하고 버전 1 데이터도 이전한다', () => {
  const storage = memoryStorage();
  const game = { ...initialGame(), created: true, name: '하나' };
  assert.equal(saveGame(game, storage), true);
  assert.deepEqual(loadGame(storage), game);

  const { history, ...legacy } = game;
  storage.setItem(SAVE_KEY, JSON.stringify({ ...legacy, version: 1 }));
  assert.deepEqual(loadGame(storage), game);
});

test('손상된 데이터나 저장소 오류가 있어도 새 게임으로 복구한다', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, '{broken');
  assert.deepEqual(loadGame(storage), initialGame());
  storage.setItem(SAVE_KEY, JSON.stringify({ ...initialGame(), plan: [] }));
  assert.deepEqual(loadGame(storage), initialGame());

  const brokenStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.deepEqual(loadGame(brokenStorage), initialGame());
  assert.equal(saveGame(initialGame(), brokenStorage), false);
});
