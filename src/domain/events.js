import { activeTasks, courses, events, MAJORS, REQUIRED, TUTORIAL_TASKS } from './catalog.js';
import { addTask, academyTasks } from './tasks.js';
import { applyEffects } from './random.js';
import { resolveAdmission } from './grades.js';
import { CLEANING_WEEKS } from './school-calendar.js';
import { enrollCourses } from './course-progress.js';
import { courseSet, addUrbanProject } from './enrollment.js';
import { notice } from './notifications.js';
import { announceChapters } from './story.js';
export { notice } from './notifications.js';
export function beginWeek(state) {
  announceChapters(state);
  if (state.week === 25) {
    state.major = state.nextMajor ?? state.major;
    state.electives = state.nextElectives ?? state.electives;
    state.courses = courseSet(state.major, state.electives);
    enrollCourses(state);
    notice(
      state,
      '2학기 수강신청 적용',
      '2학기 수강 과목을 확정했습니다. 1학기 성적은 보존됩니다.',
    );
  }
  if (state.week === 0)
    for (const [id, task] of Object.entries(TUTORIAL_TASKS)) addTask(state, id, task);
  for (const [id, event] of Object.entries(events)) {
    if (event.week !== state.week || (event.course && !state.courses.includes(event.course)))
      continue;
    if (event.kind === 'task') addTask(state, id, event);
    else if (['notice', 'birthday', 'admission', 'creative'].includes(event.kind)) {
      applyEffects(state, event.effect);
      let text = event.description;
      if (event.kind === 'birthday') {
        const popular = state.stats.charm + state.stats.reputation >= 100;
        applyEffects(state, { stress: popular ? -15 : -6, reputation: popular ? 3 : 1 });
        text = popular
          ? '친구들이 작은 케이크를 준비했어요. 스트레스 -15, 평판 +3.'
          : '조용하지만 따뜻한 축하를 받았어요. 스트레스 -6, 평판 +1.';
      }
      if (['admission', 'creative'].includes(event.kind)) {
        const accepted = resolveAdmission(state, event);
        applyEffects(state, { stress: accepted ? -8 : 8 });
        text = `${accepted ? '합격 기준 통과!' : '아쉬운 결과예요.'} 진학실에서 점수와 평가 기준을 확인하세요.`;
      }
      notice(state, event.name, text, event.kind === 'notice' ? 'info' : 'event');
    } else {
      state.pending.push(id);
      notice(state, event.name, event.description, 'choice');
    }
  }
  academyTasks(state);
  addUrbanProject(state);
  if (CLEANING_WEEKS.includes(state.week)) {
    addTask(state, `clean-${state.week}`, {
      name: '월말 호실·냉장고 점검',
      description: '방 청소 한 칸을 배정하면 자동으로 완료돼요. 미완료 시 평판 -3, 벌점 +1.',
      special: 'clean',
      target: 1,
      deadline: state.week,
      reward: { reputation: 2 },
      penalty: { reputation: -3 },
    });
  }
  // Old targets may no longer be actionable after a deadline or a major change.
  state.plan = state.plan.map((slot) => {
    if (slot.activity === 'study' && !state.courses.includes(slot.target))
      return { ...slot, target: state.courses[0] };
    if (slot.activity === 'task' && state.tasks[slot.target]?.status !== 'active')
      return { activity: 'sleep', target: null };
    return slot;
  });
}
