import { calendarIssues, calendarTiming } from './calendar-date.js';
import { buildRecordPatch, applyRecordPatch } from './content-edits.js';
import { courses, events } from './catalog.js';
import { CALENDAR_SOURCE_IDS } from './calendar-entries.js';
export function validateCalendar(definitions) {
  const issues = calendarIssues(definitions, {
    eventIds: Object.keys(events),
    courseIds: Object.keys(courses),
    sourceIds: CALENDAR_SOURCE_IDS,
  });
  if (issues.length) return issues;
  for (const [id, event] of Object.entries(events)) {
    if (event.kind !== 'task') continue;
    const start = calendarTiming(`event:${id}`, event.week, event.day ?? 0, definitions);
    const end = calendarTiming(
      `deadline:${id}`,
      event.deadline,
      event.deadlineDay ?? 6,
      definitions,
    );
    if (end.week * 7 + end.day < start.week * 7 + start.day)
      issues.push(`${id}: 과제 시작 이전에 마감할 수 없습니다.`);
  }
  for (const source of CALENDAR_SOURCE_IDS.filter((id) => /^deadline:(clean|academy)-/.test(id))) {
    const match = source.match(/^deadline:(clean|academy)-(\d+)/);
    const end = calendarTiming(source, Number(match[2]), 6, definitions);
    if (end.week < Number(match[2])) issues.push(`${source}: 과제 발생 이전에 마감할 수 없습니다.`);
  }
  return issues;
}
export const buildCalendarPatch = (base, edited) => buildRecordPatch(base, edited, 'calendar');
export const applyCalendarPatch = (current, patch) =>
  applyRecordPatch(current, patch, {
    catalog: 'calendar',
    validate: validateCalendar,
  });
