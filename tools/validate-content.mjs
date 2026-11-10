import subjectQuestions from '../data/subject-questions.json' with { type: 'json' };
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
  planStory,
  lifeEvents,
  resources,
  ELECTIVES,
  assignments,
  assignmentEvents,
} from '../src/domain/catalog.js';
import { assignmentIssues } from '../src/domain/assignments.js';
import { TASK_MODULES } from '../src/domain/task-modules/registry.js';
import { TASK_GAME_VIEW_IDS } from '../src/features/year-game/task-games/catalog.js';
import { balance } from '../src/domain/balance.js';
import { balanceIssues } from '../src/domain/balance-validation.js';
import { classmateIssues } from '../src/domain/classmates.js';
import { chapters, chapterIssues } from '../src/domain/story.js';
import { calendar, calendarIssues, calendarTiming } from '../src/domain/calendar-date.js';
import { CALENDAR_SOURCE_IDS } from '../src/domain/calendar-entries.js';
import { conditionIssues } from '../src/domain/conditions.js';
import { validateCalendar } from '../src/domain/calendar-edits.js';
import { admissionDefinitions } from '../src/domain/school-record.js';
import { admissionIssues } from '../src/domain/admission-validation.js';
for (const [subject, questions] of Object.entries(subjectQuestions)) {
  assert.ok(['math', 'physics', 'chemistry', 'biology', 'earth', 'information'].includes(subject));
  assert.ok(questions.length >= 3);
  for (const q of questions) {
    assert.ok(q.prompt && q.options.length === 5 && q.options.every((o) => typeof o === 'string'));
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 5);
  }
}
assert.deepEqual(validateCalendar(calendar), [], 'Calendar timing definitions are invalid');
assert.deepEqual(
  admissionIssues(admissionDefinitions, {
    events,
    stats: STATS,
    thresholds: balance.admissions.thresholds,
  }),
  [],
  'Admission model is invalid',
);
assert.deepEqual(
  calendarIssues(calendar, {
    eventIds: Object.keys(events),
    courseIds: Object.keys(courses),
    sourceIds: CALENDAR_SOURCE_IDS,
  }),
  [],
  'Invalid calendar definitions',
);
assert.deepEqual(chapterIssues(chapters), [], 'Invalid story chapters');
assert.deepEqual(balanceIssues(balance), [], 'Invalid balance configuration');
for (const module of Object.values(TASK_MODULES))
  if (module.game)
    assert.ok(
      TASK_GAME_VIEW_IDS.includes(module.game.view),
      `Missing task game view: ${module.game.view}`,
    );
assert.deepEqual(
  classmateIssues(undefined, { courses, stats: STATS, majors: MAJORS }),
  [],
  'data/classmates.json is invalid',
);
assert.deepEqual(
  assignmentIssues(assignments, { courses, stats: STATS }),
  [],
  'Assignment definitions are invalid',
);
assert.ok(Object.keys(assignmentEvents).length <= 400, 'Too many expanded assignments');
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
  Object.keys(storyEvents).length +
    Object.keys(lifeEvents).length +
    Object.keys(planStory).length +
    Object.keys(assignmentEvents).length,
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
  for (const key of ['health', 'stress'])
    assert.ok(
      Number.isFinite(course.workload?.[key]) &&
        course.workload[key] >= 0 &&
        course.workload[key] <= 5,
      id + ': invalid workload',
    );
  assert.ok(
    Math.abs(Object.values(course.assessments).reduce((a, b) => a + b, 0) - 1) < 0.0001,
    `${id}: weights must sum to 1`,
  );
}
for (const [id, event] of Object.entries(events)) {
  assert.deepEqual(
    conditionIssues(event.when, { stats: STATS, courses, majors: MAJORS }),
    [],
    `${id}: invalid conditions`,
  );
  if (event.chance !== undefined)
    assert.ok(
      Number.isFinite(event.chance) && event.chance >= 0 && event.chance <= 1,
      `${id}: invalid chance`,
    );
  assert.ok(kinds.includes(event.kind), `${id}: unknown event kind`);
  assert.ok(event.name && event.description);
  assert.ok(Number.isInteger(event.week) && event.week >= 0 && event.week <= 40);
  if (event.day !== undefined)
    assert.ok(
      Number.isInteger(event.day) && event.day >= 0 && event.day <= 6,
      `${id}: invalid weekday`,
    );
  if (event.course) assert.ok(Object.hasOwn(courses, event.course));
  if (event.kind === 'quiz') assert.ok(Object.hasOwn(quizzes, event.quiz));
  if (event.profile)
    assert.ok(
      event.kind === 'admission' &&
        event.track === '종합' &&
        Object.hasOwn(balance.admissions.thresholds, event.profile),
      `${id}: invalid admission profile`,
    );
  if (event.kind === 'task') {
    assert.ok(event.target > 0);
    assert.ok(event.deadline >= event.week && event.deadline <= 40);
    const start = calendarTiming(`event:${id}`, event.week, event.day ?? 0);
    const deadline = calendarTiming(`deadline:${id}`, event.deadline, event.deadlineDay ?? 6);
    assert.ok(
      deadline.week * 7 + deadline.day >= start.week * 7 + start.day,
      `${id}: calendar deadline cannot precede the task start`,
    );
    effects(event.reward);
    effects(event.penalty);
  }
  effects(event.effect);
  const ids = new Set();
  for (const option of event.options ?? []) {
    assert.deepEqual(
      conditionIssues(option.when, { stats: STATS, courses, majors: MAJORS }),
      [],
      `${id}: invalid choice conditions`,
    );
    assert.ok(option.id && !ids.has(option.id));
    ids.add(option.id);
    assert.ok(option.label && option.detail);
    assert.ok((option.cost ?? 0) >= 0);
    effects(option.effect);
    if (option.lateRisk !== undefined)
      assert.ok(Number.isFinite(option.lateRisk) && option.lateRisk >= 0 && option.lateRisk <= 1);
    if (option.chanceResult) {
      const r = option.chanceResult;
      assert.ok(Number.isFinite(r.chance) && r.chance >= 0 && r.chance <= 1);
      effects(r.success);
      effects(r.failure);
      assert.ok(Number.isInteger(r.income ?? 0) && (r.income ?? 0) >= 0);
    }
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
