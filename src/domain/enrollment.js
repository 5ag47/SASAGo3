import { courses, MAJORS, REQUIRED } from './catalog.js';
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
  const names = ['교통 동선 조사', '생활권 지도', '녹지 계획', '접근성 분석'];
  addTask(state, `urban-project-${state.week}`, {
    name: `도도: ${names[(state.week - 1) % 4]}`,
    description: `${courses.urban_planning.name} 주간 프로젝트`,
    course: 'urban_planning',
    target: 1,
    deadline: state.week,
    reward: { writing: 1, reputation: 1 },
    penalty: { reputation: -1 },
  });
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
