import test from 'node:test';
import assert from 'node:assert/strict';
import { baseState, SAVE_KEY } from '../../src/domain/state.js';
import { createGame } from '../../src/domain/engine.js';
import {
  BACKUP_KEY,
  commitLocal,
  loadLocal,
  parseSave,
  replaceLocal,
  resetLocal,
} from '../../src/platform/local-save.js';
function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const profile = { name: '저장', character: 'girl', role: 'creative', major: 'information' };
test('reset keeps revisions increasing and a stale tab cannot reset a newer save', () => {
  const storage = memory();
  const state = commitLocal(baseState(), { type: 'create', profile }, storage);
  assert.throws(
    () => resetLocal(baseState(), {}, storage),
    (error) => error.code === 'SAVE_CONFLICT',
  );
  const next = resetLocal(state, {}, storage);
  assert.equal(next.revision, state.revision + 1);
  assert.equal(next.created, false);
  assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).name, state.name);
});
test('explicitly resetting a damaged save preserves both the damaged file and valid backup', () => {
  const storage = memory();
  const backup = JSON.stringify(createGame(profile));
  storage.setItem(SAVE_KEY, '{broken');
  storage.setItem(BACKUP_KEY, backup);
  resetLocal(baseState(), { allowDamaged: true }, storage);
  assert.equal(storage.getItem(BACKUP_KEY), backup);
  assert.equal(storage.getItem(`${SAVE_KEY}-damaged`), '{broken');
});
test('a validated save round-trips and does not touch the legacy key', () => {
  const storage = memory();
  storage.setItem('sasago3-save-v1', 'old');
  const state = commitLocal(baseState(), { type: 'create', profile }, storage);
  assert.deepEqual(loadLocal(storage).state, state);
  assert.equal(storage.getItem('sasago3-save-v1'), 'old');
});
test('stale revisions cannot overwrite another tab', () => {
  const storage = memory();
  const source = baseState();
  commitLocal(source, { type: 'create', profile }, storage);
  assert.throws(
    () => commitLocal(source, { type: 'create', profile }, storage),
    (e) => e.code === 'SAVE_CONFLICT',
  );
});
test('broken saves preserve the original and report recovery state', () => {
  const storage = memory();
  storage.setItem(SAVE_KEY, 'broken');
  storage.setItem(BACKUP_KEY, JSON.stringify(createGame(profile)));
  const result = loadLocal(storage);
  assert.equal(result.state.name, '저장');
  assert.equal(result.blocked, true);
  assert.equal(storage.getItem(SAVE_KEY), 'broken');
});
test('invalid imports reject infinities, negative values, oversized files and malformed nested fields', () => {
  const state = createGame(profile);
  for (const value of [
    { ...state, money: -1 },
    { ...state, week: 100 },
    { ...state, plan: [] },
    { ...state, stats: { ...state.stats, hp: 101 } },
    { ...state, tasks: { bad: null } },
    { ...state, teachers: null },
  ])
    assert.throws(() => parseSave(JSON.stringify(value)));
  assert.throws(() => parseSave(' '.repeat(1500001)));
});
test('restoring a save keeps the previous record as a backup', () => {
  const storage = memory();
  const source = createGame(profile);
  storage.setItem(SAVE_KEY, JSON.stringify(source));
  const next = { ...source, money: 123 };
  replaceLocal(JSON.stringify(next), storage);
  assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).money, 30000);
  assert.equal(loadLocal(storage).state.money, 123);
});
test('legacy combined math-physics selection migrates without losing course or progress records', () => {
  const original = { ...createGame(profile), major: 'math_physics', nextMajor: 'math_physics' };
  const migrated = parseSave(JSON.stringify(original));
  assert.equal(migrated.major, 'physics');
  assert.equal(migrated.nextMajor, 'physics');
  assert.deepEqual(migrated.courses, original.courses);
});
