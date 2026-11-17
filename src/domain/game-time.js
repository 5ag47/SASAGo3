import { weekDate } from './calendar-date.js';

export const SESSION_TIMES = ['07:30', '19:00', '21:00'];
export const EXTENSION_TIME = '23:00';
export const validTime = (value) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function gameClockPosition(state) {
  const run = state.weekRun;
  const day = Math.max(0, run?.lastDay ?? 0);
  const completed = (run?.cursor ?? 0) - day * SESSION_TIMES.length;
  const at = run?.waiting?.kind === 'task' ? completed : completed - 1;
  const time = run?.closedDay === day ? EXTENSION_TIME : (SESSION_TIMES[at] ?? '00:00');
  return `${weekDate(state.week, day)}T${time}`;
}

export function developerTime(state) {
  const position = gameClockPosition(state);
  const saved = state.flags.developerClock;
  return saved?.position === position && validTime(saved.time)
    ? `${position.slice(0, 11)}${saved.time}`
    : position;
}
