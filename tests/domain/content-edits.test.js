import test from 'node:test';
import assert from 'node:assert/strict';
import { calendar } from '../../src/domain/calendar-date.js';
import { buildCalendarPatch, applyCalendarPatch } from '../../src/domain/calendar-edits.js';
import { buildRecordPatch, applyRecordPatch } from '../../src/domain/content-edits.js';
test('calendar collaborators merge separate dates and reject a conflict on the same record', () => {
  const base = {
    ...calendar,
    first: { kind: 'entry', name: '첫 일정', type: 'note', date: '2026-04-14' },
  };
  const edited = structuredClone(base);
  edited.first.name = '내 수정';
  const patch = buildCalendarPatch(base, edited),
    current = structuredClone(base);
  current.second = { kind: 'entry', name: '다른 사람 일정', type: 'note', date: '2026-04-15' };
  assert.equal(applyCalendarPatch(current, patch).next.second.name, '다른 사람 일정');
  current.first.name = '먼저 저장한 수정';
  assert.deepEqual(applyCalendarPatch(current, patch).conflicts, ['first']);
  assert.equal(applyCalendarPatch(current, patch).next, null);
});
test('authoring validates actual timing and the target catalog before any file can be replaced', () => {
  const edited = structuredClone(calendar);
  edited.bad = {
    kind: 'entry',
    name: '논문 마감',
    type: 'deadline',
    source: 'deadline:thesis',
    week: 0,
    day: 0,
  };
  assert.equal(applyCalendarPatch(calendar, buildCalendarPatch(calendar, edited)).next, null);
  const wrong = { ...buildCalendarPatch(calendar, calendar), catalog: 'assignments' };
  assert.equal(applyCalendarPatch(calendar, wrong).next, null);
  const unsafe = JSON.parse(
    '{"version":1,"catalog":"calendar","changes":{"__proto__":{"before":null,"after":{}}}}',
  );
  assert.equal(applyCalendarPatch(calendar, unsafe).next, null);
});
test('the shared edit contract works with a second catalog validator and never overwrites unseen changes', () => {
  const base = { a: { value: 1 } },
    edited = { a: { value: 2 } };
  const patch = buildRecordPatch(base, edited, 'example');
  const options = {
    catalog: 'example',
    validate: (rows) => (Object.values(rows).some((row) => row.value < 0) ? ['negative'] : []),
  };
  assert.equal(applyRecordPatch(base, patch, options).next.a.value, 2);
  assert.deepEqual(applyRecordPatch({ a: { value: 3 } }, patch, options).conflicts, ['a']);
  assert.deepEqual(base, { a: { value: 1 } });
});
