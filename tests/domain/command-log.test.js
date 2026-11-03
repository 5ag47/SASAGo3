import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { minigameSummary, scheduleChanges } from '../../src/platform/command-log.js';
test('diagnostics retain changed schedule slots and mini-game progress without player identifiers', () => {
  const source = createGame({
    name: '비공개 이름',
    character: 'boy',
    role: 'steady',
    major: 'math',
  });
  const next = transition(source, { type: 'copy_day', sourceDay: 0, days: [6] });
  const changes = scheduleChanges(source, next);
  assert.ok(changes.length > 0 && changes.length <= 3);
  assert.ok(changes.every((change) => change.index >= 18 && change.index < 21));
  source.pending = ['interview_day'];
  const answered = transition(source, {
    type: 'choose',
    event: 'interview_day',
    option: 'answer:1',
  });
  assert.deepEqual(minigameSummary(answered).interview, {
    phase: 'active',
    answered: 1,
    score: null,
  });
  assert.ok(
    !JSON.stringify({ changes, progress: minigameSummary(answered) }).includes(source.name),
  );
});
