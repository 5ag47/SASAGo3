import { courses } from './catalog.js';
import { clamp } from './random.js';

export function enrollCourses(state) {
  state.courseMastery ??= {};
  for (const id of state.courses) state.courseMastery[id] ??= state.stats[courses[id].ability];
}
export function courseMastery(state, id) {
  return state.courseMastery?.[id] ?? state.stats[courses[id].ability];
}
export function courseAbility(state, id) {
  return state.stats[courses[id].ability] * 0.65 + courseMastery(state, id) * 0.35;
}
export function learnCourse(state, id, efficiency = 1, amount = 5) {
  if (!state.courses.includes(id)) return 0;
  enrollCourses(state);
  const before = courseMastery(state, id);
  const growth = amount * efficiency * (0.35 + (1 - before / 100) * 0.65);
  state.courseMastery[id] = Math.round(clamp(before + growth) * 10) / 10;
  return Math.round((state.courseMastery[id] - before) * 10) / 10;
}
