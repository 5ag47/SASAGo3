import { runPlannedWeek } from '../helpers/task-games.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import {
  chapters,
  chapterIssues,
  availableChapters,
  chapterText,
  chapterProgress,
} from '../../src/domain/story.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { beginWeek } from '../../src/domain/events.js';
const fresh = () =>
  createGame({ name: '장면 검사', character: 'boy', role: 'steady', major: 'math' });
test('story content follows the school year and branches on actual completed work', () => {
  assert.deepEqual(chapterIssues(chapters), []);
  const state = fresh(),
    summer = Object.values(chapters).find((c) => c.week === 17);
  assert.equal(availableChapters(state).length, 1);
  assert.equal(chapterText(state, summer.pages[0]), summer.pages[0].otherwise);
  state.tasks.thesis = { status: 'completed' };
  assert.equal(chapterText(state, summer.pages[0]), summer.pages[0].text);
});
test('story pages persist and cannot change stats, money, tasks, schedule or time', () => {
  const source = fresh(),
    chapter = availableChapters(source)[0];
  let state = transition(source, { type: 'story', chapter: chapter.id, action: 'next' });
  state = migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(chapterProgress(state, chapter.id).page, 1);
  for (const key of ['stats', 'money', 'tasks', 'plan', 'week', 'assessments', 'seed'])
    assert.deepEqual(state[key], source[key]);
  state = transition(state, { type: 'story', chapter: chapter.id, action: 'skip' });
  assert.deepEqual(chapterProgress(state, chapter.id), {
    page: chapter.pages.length - 1,
    read: true,
  });
  assert.ok(validateState(state));
  assert.deepEqual(source.story, {});
  // Reading is optional and never a prerequisite for normal game commands.
  assert.equal(runPlannedWeek(source).week, 1);
});
test('future chapters, invalid actions and malformed saved progress are rejected', () => {
  const source = fresh(),
    ids = Object.keys(chapters);
  for (const [chapter, action] of [
    [ids[1], 'next'],
    ['__proto__', 'next'],
    [ids[0], 'complete'],
  ])
    assert.throws(() => transition(source, { type: 'story', chapter, action }), {
      code: 'STORY_INVALID',
    });
  for (const progress of [
    { page: -1, read: false },
    { page: 500, read: false },
    { page: 0, read: true },
    { page: 0, read: false, score: 100 },
  ])
    assert.equal(validateState({ ...source, story: { [ids[0]]: progress } }), false);
});
test('old saves gain empty reading progress without losing records and ending archives remain readable', () => {
  const old = fresh();
  delete old.story;
  const restored = migrateState(old);
  assert.deepEqual(restored.story, {});
  assert.equal(old.story, undefined);
  assert.deepEqual(restored.tasks, old.tasks);
  assert.ok(validateState(restored));
  restored.week = 41;
  const finished = transition(restored, { type: 'ending', ending: 'work' });
  const last = availableChapters(finished).at(-1);
  assert.ok(
    transition(finished, { type: 'story', chapter: last.id, action: 'skip' }).story[last.id].read,
  );
  assert.throws(() => transition(finished, { type: 'advance' }), { code: 'GAME_CLOSED' });
});
test('chapter notices are linked and not duplicated when the same school week is initialized again', () => {
  const state = fresh();
  state.week = 17;
  beginWeek(state);
  beginWeek(state);
  const chapter = availableChapters(state).at(-1);
  assert.equal(state.notices.filter((n) => n.chapter === chapter.id).length, 1);
});
