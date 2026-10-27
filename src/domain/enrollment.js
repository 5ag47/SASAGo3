import { assignments, MAJORS, REQUIRED } from './catalog.js';
import { enrollCourses } from './course-progress.js';
import { addTask } from './tasks.js';
export const courseSet = (major, electives = []) => [
  ...MAJORS[major].courses,
  ...REQUIRED,
  ...electives,
];
export function addUrbanProject(state) {
  if (
    !state.courses.includes('urban_planning') ||
    !((state.week >= 1 && state.week <= 16) || (state.week >= 25 && state.week <= 40))
  )
    return;
  const id = `urban-project-${state.week}`;
  const definition = assignments[id];
  if (definition && definition.enabled !== false) addTask(state, id, definition);
}
export function electiveWindow(state, term) {
  return (
    !state.ending &&
    (term === 1 ? state.week <= 4 : term === 2 && state.week >= 11 && state.week <= 24)
  );
}
export function changeElective(state, course, term, enabled) {
  const selected = term === 1 ? state.electives : (state.nextElectives ?? state.electives);
  const next = enabled
    ? [...new Set([...selected, course])]
    : selected.filter((id) => id !== course);
  if (term === 2) {
    state.nextElectives = next;
    return;
  }
  state.electives = next;
  state.courses = courseSet(state.major, next);
  enrollCourses(state);
  if (enabled) addUrbanProject(state);
  state.plan = state.plan.map((slot) =>
    slot.activity === 'study' && !state.courses.includes(slot.target)
      ? { ...slot, target: state.courses[0] }
      : slot,
  );
}
