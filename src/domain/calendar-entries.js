import { calendar, calendarTiming, weekDate } from './calendar-date.js';
import { events, courses } from './catalog.js';
import { courseSet } from './enrollment.js';
import { ASSESSMENT_SCHEDULE, CLEANING_WEEKS } from './school-calendar.js';
import { effectivePlan } from './schedule.js';
const timed = (source, name, type, week, day = null, detail = '') => {
  const time = calendarTiming(source, week, day);
  return {
    id: source,
    name,
    type,
    detail,
    ...(time.day === null
      ? { start: weekDate(time.week), end: weekDate(time.week, 6) }
      : { date: weekDate(time.week, time.day) }),
  };
};
export const CALENDAR_SOURCE_IDS = [
  'deadline:first-study',
  'deadline:practice-report',
  ...Object.keys(events).map((id) => `event:${id}`),
  ...Object.entries(events)
    .filter(([, event]) => event.kind === 'task')
    .map(([id]) => `deadline:${id}`),
  ...CLEANING_WEEKS.map((week) => `deadline:clean-${week}`),
  ...[1, 5, 9, 13].flatMap((week) => [1, 2].map((number) => `deadline:academy-${week}-${number}`)),
  'deadline:external-contest',
  ...ASSESSMENT_SCHEDULE.flatMap((exam) => exam.weeks.map((week) => `exam:${exam.kind}:${week}`)),
];
function enrolled(state, week, course) {
  if (!course) return true;
  const ids =
    week >= 25 && state.week < 25
      ? courseSet(state.nextMajor ?? state.major, state.nextElectives ?? state.electives)
      : week < 25 && state.week >= 25
        ? Object.keys(state.courseMastery)
        : state.courses;
  return ids.includes(course);
}
export const CALENDAR_PROVIDERS = Object.freeze({
  events: (state) =>
    Object.entries(events)
      .filter(([, event]) => enrolled(state, event.week, event.course))
      .map(([id, event]) =>
        timed(
          `event:${id}`,
          event.name + (event.kind === 'task' ? ' 시작' : ''),
          'event',
          event.week,
          event.day ?? null,
          event.description,
        ),
      ),
  deadlines: (state) =>
    Object.values({
      ...Object.fromEntries(
        Object.entries(events)
          .filter(([, event]) => event.kind === 'task' && enrolled(state, event.week, event.course))
          .map(([id, event]) => [id, { ...event, id }]),
      ),
      ...state.tasks,
    }).map((task) => {
      const entry = timed(
        `deadline:${task.id}`,
        task.name + ' 마감',
        'deadline',
        task.deadline,
        task.deadlineDay ?? 6,
        task.status === 'completed'
          ? '완료'
          : task.status
            ? `${task.progress}/${task.target}`
            : '예정',
      );
      if (state.tasks[task.id])
        return { ...entry, date: weekDate(task.deadline, task.deadlineDay ?? 6) };
      return entry;
    }),
  exams: () =>
    ASSESSMENT_SCHEDULE.flatMap((exam) =>
      exam.weeks.map((week) => timed(`exam:${exam.kind}:${week}`, exam.name, 'event', week)),
    ),
  inspection: () =>
    CLEANING_WEEKS.map((week) => {
      const timing = calendarTiming(`deadline:clean-${week}`, week, 6);
      return {
        id: `inspection:${week}`,
        name: '호실 점검',
        type: 'event',
        date: weekDate(timing.week, timing.day),
      };
    }),
  plan: (state) =>
    state.week > 40 || state.ending
      ? []
      : effectivePlan(state).map((slot, index) => ({
          id: `plan:${state.week}:${index}`,
          name: ['아침 자습', '1자', '2자'][index % 3],
          type: 'plan',
          date: weekDate(state.week, Math.floor(index / 3)),
          activity: slot.activity,
          target: slot.target,
          detail:
            slot.activity === 'study'
              ? courses[slot.target]?.name
              : slot.activity === 'task'
                ? state.tasks[slot.target]?.name
                : '',
        })),
});
export function calendarEntries(state, definitions = calendar) {
  const entries = Object.values(CALENDAR_PROVIDERS).flatMap((provide) => provide(state));
  for (const [id, item] of Object.entries(definitions))
    if (
      item.kind === 'entry' &&
      item.enabled !== false &&
      !item.deleted &&
      (!item.course || enrolled(state, item.week ?? 0, item.course))
    ) {
      const authored = {
        id,
        name: item.name,
        type: item.type,
        detail: item.description ?? '',
        date: item.date ?? weekDate(item.week, item.day),
      };
      if (item.source?.startsWith('deadline:')) {
        const task = state.tasks[item.source.slice('deadline:'.length)];
        if (task) authored.date = weekDate(task.deadline, task.deadlineDay ?? 6);
      }
      const index = item.source ? entries.findIndex((entry) => entry.id === item.source) : -1;
      if (index >= 0) entries[index] = { ...authored, id: item.source };
      else if (!item.source) entries.push(authored);
    }
  return entries;
}
