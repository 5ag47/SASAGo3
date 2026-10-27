import calendar from '../../data/calendar.json' with { type: 'json' };
export { calendar };
export const calendarSettings = calendar.calendar_settings;
const dayMs = 86400000;
export const dateOrdinal = (iso) => Date.parse(`${iso}T00:00:00Z`) / dayMs;
export function weekDate(week, day = 0) {
  const anchor =
    calendarSettings.weeks[week] ?? (week === 41 ? addDays(calendarSettings.weeks[40], 7) : null);
  if (!anchor) throw new Error('CALENDAR_WEEK_UNKNOWN');
  return addDays(anchor, day);
}
export function addDays(iso, days) {
  return new Date((dateOrdinal(iso) + days) * dayMs).toISOString().slice(0, 10);
}
export function dateWeek(iso) {
  const ordinal = dateOrdinal(iso);
  for (let week = 0; week <= 41; week++) {
    const day = ordinal - dateOrdinal(weekDate(week));
    if (day >= 0 && day < 7) return { week, day };
  }
  return null;
}
export function monthCells(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = addDays(first.toISOString().slice(0, 10), -(first.getUTCDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index),
      d = new Date(date + 'T00:00:00Z');
    return {
      date,
      number: d.getUTCDate(),
      inMonth: d.getUTCMonth() + 1 === month,
      ...dateWeek(date),
    };
  });
}
export function calendarTiming(source, fallbackWeek, fallbackDay = null, definitions = calendar) {
  const item = Object.values(definitions).find(
    (item) =>
      item.kind === 'entry' && item.source === source && item.enabled !== false && !item.deleted,
  );
  if (!item) return { week: fallbackWeek, day: fallbackDay };
  return item.date
    ? (dateWeek(item.date) ?? { week: fallbackWeek, day: fallbackDay })
    : { week: item.week, day: item.day };
}
export function calendarIssues(records, { eventIds = [], courseIds = [], sourceIds = [] } = {}) {
  const issues = [],
    settings = records.calendar_settings;
  if (
    !settings ||
    settings.kind !== 'settings' ||
    !Number.isInteger(settings.year) ||
    settings.year < 2000 ||
    settings.year > 2200
  )
    issues.push('calendar_settings: valid school year required');
  let previous = -Infinity;
  if (Object.keys(settings?.weeks ?? {}).some((key) => !/^(?:[0-9]|[1-3][0-9]|40)$/.test(key)))
    issues.push('calendar weeks: only keys 0..40 are allowed');
  for (let week = 0; week <= 40; week++) {
    const date = settings?.weeks?.[week],
      ordinal = dateOrdinal(date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ||
      !Number.isFinite(ordinal) ||
      addDays(date, 0) !== date ||
      Number(date.slice(0, 4)) !== settings?.year ||
      new Date(date + 'T00:00:00Z').getUTCDay() !== 1 ||
      ordinal < previous + 7
    )
      issues.push(`calendar week ${week}: distinct Monday required`);
    previous = ordinal;
  }
  const sources = new Set();
  for (const [id, item] of Object.entries(records)) {
    if (id === 'calendar_settings') continue;
    if (
      !item ||
      item.kind !== 'entry' ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 100 ||
      Object.keys(item).some(
        (key) =>
          ![
            'kind',
            'name',
            'type',
            'description',
            'date',
            'week',
            'day',
            'source',
            'course',
            'enabled',
            'deleted',
          ].includes(key),
      ) ||
      ['enabled', 'deleted'].some(
        (key) => item[key] !== undefined && typeof item[key] !== 'boolean',
      ) ||
      (item.description !== undefined &&
        (typeof item.description !== 'string' || item.description.length > 1000)) ||
      !['event', 'deadline', 'class', 'note'].includes(item.type)
    ) {
      issues.push(`${id}: invalid calendar entry`);
      continue;
    }
    const exact = item.date !== undefined;
    if (
      exact
        ? !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
          !Number.isFinite(dateOrdinal(item.date)) ||
          addDays(item.date, 0) !== item.date ||
          item.week !== undefined ||
          item.day !== undefined
        : !Number.isInteger(item.week) ||
          item.week < 0 ||
          item.week > 40 ||
          !Number.isInteger(item.day) ||
          item.day < 0 ||
          item.day > 6
    )
      issues.push(`${id}: use date OR week + day`);
    if (item.course && !courseIds.includes(item.course)) issues.push(`${id}: unknown course`);
    if (item.source) {
      if (typeof item.source !== 'string') {
        issues.push(`${id}: source must be a registered ID`);
        continue;
      }
      if (item.enabled !== false && !item.deleted) {
        if (sources.has(item.source)) issues.push(`${id}: duplicate source override`);
        sources.add(item.source);
      }
      const [kind, sourceId] = item.source.split(':');
      if (
        !['event', 'deadline', 'exam'].includes(kind) ||
        (sourceIds.length
          ? !sourceIds.includes(item.source)
          : kind !== 'exam' && !eventIds.includes(sourceId)) ||
        (exact && !dateWeek(item.date))
      )
        issues.push(`${id}: invalid source binding`);
    }
  }
  return issues;
}
