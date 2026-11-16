import test from 'node:test';
import assert from 'node:assert/strict';
import { worldClock } from '../../src/features/year-game/useWorldClock.js';
test('room changes automatically at 07:00 and 19:00 Korean time', () => {
  assert.equal(worldClock(new Date('2026-10-27T06:59:00+09:00')).night, true);
  assert.equal(worldClock(new Date('2026-10-27T07:00:00+09:00')).night, false);
  assert.equal(worldClock(new Date('2026-10-27T18:59:00+09:00')).night, false);
  assert.equal(worldClock(new Date('2026-10-27T19:00:00+09:00')).night, true);
  assert.equal(worldClock(new Date('2026-10-27T10:30:00+09:00')).time, '10:30');
});
