import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendar,
  calendarIssues,
  calendarTiming,
  monthCells,
  weekDate,
} from '../../src/domain/calendar-date.js';
import { calendarEntries, CALENDAR_SOURCE_IDS } from '../../src/domain/calendar-entries.js';
import { createGame, transition } from '../../src/domain/engine.js';
import { beginWeek } from '../../src/domain/events.js';
import { courses, events, choiceDeadline } from '../../src/domain/catalog.js';
const fresh = () =>
  createGame({ name: '달력 검사', character: 'girl', role: 'steady', major: 'math' });
const schema = {
  eventIds: Object.keys(events),
  courseIds: Object.keys(courses),
  sourceIds: CALENDAR_SOURCE_IDS,
};
test('month cells use Gregorian dates, Monday columns, adjoining months and leap days', () => {
  const feb = monthCells(2026, 2);
  assert.equal(feb.length, 42);
  assert.equal(feb.filter((cell) => cell.inMonth).length, 28);
  assert.equal(feb.findIndex((cell) => cell.inMonth && cell.number === 1) % 7, 6);
  assert.equal(monthCells(2028, 2).filter((cell) => cell.inMonth).length, 29);
  assert.equal(new Date(feb[0].date + 'T00:00:00Z').getUTCDay(), 1);
});
test('a week has daily plans while dates not supplied for school events remain week-wide', () => {
  const items = calendarEntries(fresh()),
    plans = items.filter((item) => item.type === 'plan');
  assert.equal(plans.length, 28);
  assert.equal(plans.filter((item) => item.date === weekDate(0, 6)).length, 4);
  const exam = items.find((item) => item.id === 'exam:midterm:7');
  assert.equal(exam.date, undefined);
  assert.ok(exam.start && exam.end);
  assert.equal(items.find((item) => item.id === 'deadline:thesis').date, weekDate(16, 6));
});
test('authors can add daily notes or override a known source without duplicating it', () => {
  const records = {
    ...calendar,
    custom_note: { kind: 'entry', name: '사용자 일정', type: 'note', date: '2026-04-14' },
    exam_date: {
      kind: 'entry',
      name: '중간고사',
      type: 'event',
      source: 'exam:midterm:7',
      week: 7,
      day: 3,
    },
  };
  assert.deepEqual(calendarIssues(records, schema), []);
  assert.deepEqual(calendarTiming('exam:midterm:7', 7, null, records), { week: 7, day: 3 });
  const items = calendarEntries(fresh(), records);
  assert.equal(items.filter((item) => item.id === 'exam:midterm:7').length, 1);
  assert.equal(items.find((item) => item.id === 'exam:midterm:7').date, weekDate(7, 3));
  assert.equal(items.find((item) => item.id === 'custom_note').date, '2026-04-14');
  assert.ok(
    calendarIssues(
      { ...records, bad: { kind: 'entry', name: '오류', type: 'event', date: '2026-02-30' } },
      schema,
    ).length,
  );
  assert.ok(calendarIssues({ ...records, duplicate: { ...records.exam_date } }, schema).length);
  assert.deepEqual(
    calendarIssues({ ...records, old: { ...records.exam_date, deleted: true } }, schema),
    [],
  );
});
test('a source bound to a weekday is announced on that day in the same calendar', () => {
  calendar.test_binding = {
    kind: 'entry',
    name: '학원 모집',
    type: 'event',
    source: 'event:academy_offer',
    week: 1,
    day: 2,
  };
  try {
    let state = fresh();
    state.week = 1;
    state.pending = [];
    beginWeek(state);
    state.plan = Array.from({ length: 21 }, () => ({ activity: 'sleep', target: null }));
    assert.ok(!state.pending.includes('academy_offer'));
    state = transition(state, { type: 'advance' });
    assert.equal(state.weekRun.cursor, 6);
    assert.ok(state.pending.includes('academy_offer'));
    assert.equal(
      calendarEntries(state).find((item) => item.id === 'event:academy_offer').date,
      weekDate(1, 2),
    );
  } finally {
    delete calendar.test_binding;
  }
});
test('moving a choice announcement preserves its original response window', () => {
  calendar.test_later = {
    kind: 'entry',
    name: '학원 모집',
    type: 'event',
    source: 'event:academy_offer',
    week: 5,
    day: 1,
  };
  try {
    assert.equal(choiceDeadline('academy_offer'), 8);
  } finally {
    delete calendar.test_later;
  }
});
test('an existing task keeps its saved deadline when future authoring changes', () => {
  const state = fresh(),
    task = state.tasks['practice-report'];
  calendar.test_deadline = {
    kind: 'entry',
    name: '연습 보고서 마감',
    type: 'deadline',
    source: 'deadline:practice-report',
    week: 1,
    day: 1,
  };
  try {
    const entry = calendarEntries(state).find((item) => item.id === 'deadline:practice-report');
    assert.equal(entry.date, weekDate(task.deadline, task.deadlineDay));
  } finally {
    delete calendar.test_deadline;
  }
});
