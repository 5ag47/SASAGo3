import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  activities,
  courses,
  events,
  items,
  MAJORS,
  REQUIRED,
  roles,
  STATS,
  quizzes,
  storyEvents,
  lifeEvents,
  resources,
  ELECTIVES,
} from '../src/domain/catalog.js';
const kinds = [
  'task',
  'choice',
  'study',
  'notice',
  'birthday',
  'admission',
  'creative',
  'interview',
  'registration',
  'recommendation',
  'quiz',
];
assert.equal(new Set(ELECTIVES).size, ELECTIVES.length);
for (const id of ELECTIVES)
  assert.ok(Object.hasOwn(courses, id) && courses[id].category === '교양선택');
for (const resource of Object.values(resources)) {
  assert.ok(resource.name);
  if (resource.path !== null) {
    assert.match(resource.path, /^\/resources\/[a-zA-Z0-9_-]+\.pdf$/);
    assert.ok(
      existsSync(new URL(`../public${resource.path}`, import.meta.url)),
      'Resource PDF is missing',
    );
  }
}
assert.equal(
  Object.keys(events).length,
  Object.keys(storyEvents).length + Object.keys(lifeEvents).length,
  'Duplicate story/life event ID',
);
for (const [id, quiz] of Object.entries(quizzes)) {
  assert.ok(quiz.question && quiz.explanation && quiz.options.length >= 2, `${id}: invalid quiz`);
  assert.ok(
    quiz.correct === null ||
      (Number.isInteger(quiz.correct) && quiz.correct >= 0 && quiz.correct < quiz.options.length),
  );
}
function effects(value = {}) {
  for (const [stat, amount] of Object.entries(value)) {
    assert.ok(Object.hasOwn(STATS, stat), `Unknown stat: ${stat}`);
    assert.ok(Number.isFinite(amount), `Invalid amount: ${stat}`);
  }
}
for (const [id, course] of Object.entries(courses)) {
  assert.ok(/^[a-z][a-z0-9_-]+$/.test(id));
  assert.ok(course.name && Object.hasOwn(STATS, course.ability));
  assert.ok(course.credits > 0);
  assert.ok(
    Math.abs(Object.values(course.assessments).reduce((a, b) => a + b, 0) - 1) < 0.0001,
    `${id}: weights must sum to 1`,
  );
}
for (const [id, event] of Object.entries(events)) {
  assert.ok(kinds.includes(event.kind), `${id}: unknown event kind`);
  assert.ok(event.name && event.description);
  assert.ok(Number.isInteger(event.week) && event.week >= 0 && event.week <= 40);
  if (event.course) assert.ok(Object.hasOwn(courses, event.course));
  if (event.kind === 'quiz') assert.ok(Object.hasOwn(quizzes, event.quiz));
  if (event.kind === 'task') {
    assert.ok(event.target > 0);
    assert.ok(event.deadline >= event.week && event.deadline <= 40);
    effects(event.reward);
    effects(event.penalty);
  }
  effects(event.effect);
  const ids = new Set();
  for (const option of event.options ?? []) {
    assert.ok(option.id && !ids.has(option.id));
    ids.add(option.id);
    assert.ok(option.label && option.detail);
    assert.ok((option.cost ?? 0) >= 0);
    effects(option.effect);
    if (option.reserve) {
      assert.ok(
        Number.isInteger(option.reserve.count) &&
          option.reserve.count > 0 &&
          option.reserve.count <= 7,
      );
      assert.ok(Object.hasOwn(activities, option.reserve.activity));
    }
  }
}
for (const role of Object.values(roles)) effects(role.stats);
for (const activity of Object.values(activities)) {
  assert.ok(activity.name && activity.description && activity.category);
  effects(activity.effect);
}
for (const item of Object.values(items)) {
  assert.ok(item.price > 0);
  effects(item.effect);
}
for (const major of Object.values(MAJORS))
  for (const course of [...major.courses, ...REQUIRED]) assert.ok(Object.hasOwn(courses, course));
console.log(
  `Content valid: ${Object.keys(courses).length} courses, ${Object.keys(events).length} events, ${Object.keys(activities).length} activities, ${Object.keys(roles).length} roles, ${Object.keys(items).length} items.`,
);
