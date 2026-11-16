import { activeTasks, courses, events, MAJORS, REQUIRED, TUTORIAL_TASKS } from './catalog.js';
import { finalCampaignResults, firstRoundResults } from './campaign-outcomes.js';
import { recurringCampaignTasks } from './campaign.js';
import { secondSemesterCourses } from './enrollment.js';
import { addTask, academyTasks } from './tasks.js';
import { applyEffects, random } from './random.js';
import { matchesCondition } from './conditions.js';
import { resolveAdmission } from './grades.js';
import { CLEANING_WEEKS } from './school-calendar.js';
import { enrollCourses } from './course-progress.js';
import { courseSet, addUrbanProject } from './enrollment.js';
import { notice } from './notifications.js';
import { announceChapters } from './story.js';
import { calendarTiming } from './calendar-date.js';
import { activityLock } from './senior-year.js';
import { deliverClassmateNews } from './classmates.js';
export { notice } from './notifications.js';
export function beginWeek(state) {
  announceChapters(state);
  if (state.week === 25) {
    state.courses = secondSemesterCourses(state.major, state.electives);
    state.campaign.nights = state.campaign.nights.map((s) =>
      s.activity === 'study' && !state.courses.includes(s.target)
        ? { activity: 'sleep', target: null }
        : s,
    );
    enrollCourses(state);
    notice(state, '2학기 시작', '5월에 신청한 2학기 과목으로 시작합니다. 1학기 성적은 보존됩니다.');
  }
  if (state.week === 0)
    for (const [id, task] of Object.entries(TUTORIAL_TASKS)) addTask(state, id, task);
  dispatchDayEvents(state, 0);
  deliverClassmateNews(state);
  academyTasks(state);
  addUrbanProject(state);
  recurringCampaignTasks(state);
  if (state.week === 37) finalCampaignResults(state);
  if (CLEANING_WEEKS.includes(state.week)) {
    addTask(state, `clean-${state.week}`, {
      name: '월말 호실·냉장고 점검',
      description: '방 청소 한 칸을 배정하면 자동으로 완료돼요. 미완료 시 평판 -3.',
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
    if (activityLock(state, slot.activity)) return { activity: 'sleep', target: null };
    return slot;
  });
}

export function dispatchDayEvents(state, day) {
  for (const [id, event] of Object.entries(events)) {
    const timing = calendarTiming('event:' + id, event.week, event.day ?? 0);
    if (
      event.manual ||
      timing.week !== state.week ||
      timing.day !== day ||
      state.flags.eventDeliveries?.[id] ||
      (event.course && !state.courses.includes(event.course))
    )
      continue;
    state.flags.eventDeliveries ??= {};
    state.flags.eventDeliveries[id] = true;
    if (
      !matchesCondition(state, event.when) ||
      (event.chance !== undefined &&
        event.chance < 1 &&
        (event.chance <= 0 || random(state) >= event.chance))
    )
      continue;
    if (event.kind === 'task') addTask(state, id, event);
    else if (['notice', 'birthday', 'admission', 'creative'].includes(event.kind)) {
      applyEffects(state, event.effect);
      Object.assign(state.flags, event.flags);
      state.money += event.income ?? 0;
      state.campaign.lateRisk = Math.min(1, state.campaign.lateRisk + (event.lateRisk ?? 0));
      let text = id === 'story_first_round' ? firstRoundResults(state) : event.description;
      if (event.kind === 'birthday') {
        const popular = state.stats.charm + state.stats.reputation >= 100;
        applyEffects(state, { stress: popular ? -15 : -6, reputation: popular ? 3 : 1 });
        text = popular
          ? '친구들이 작은 케이크를 준비했어요. 스트레스 -15, 평판 +3.'
          : '조용하지만 따뜻한 축하를 받았어요. 스트레스 -6, 평판 +1.';
      }
      if (['top_interview', 'kaist_postech', 'yonsei'].includes(id)) {
        notice(
          state,
          event.name,
          '전형 일정을 마쳤습니다. 최종 결과는 12월에 발표됩니다.',
          'event',
        );
        continue;
      }
      if (['admission', 'creative'].includes(event.kind)) {
        const accepted = resolveAdmission(state, event);
        const record = state.admissions.at(-1);
        const applied = record.applied !== false;
        if (record.exam && applied) {
          applyEffects(state, { stress: record.grade <= 3 ? -6 : 6 });
          text = `수능 ${record.grade}등급. 고대 최저와 정시 결과에 반영돼요.`;
        } else {
          if (applied) applyEffects(state, { stress: accepted ? -8 : 8 });
          text = applied
            ? `${accepted ? '합격 기준 통과!' : '아쉬운 결과예요.'} 결과 알림에서 점수와 평가 기준을 확인하세요.`
            : record.exam
              ? '수능에 응시하지 않았어요.'
              : '지원하지 않은 전형입니다.';
        }
      }
      notice(state, event.name, text, event.kind === 'notice' ? 'info' : 'event');
    } else if (!Object.hasOwn(state.choices, id)) {
      applyEffects(state, event.effect);
      state.pending.push(id);
      notice(state, event.name, event.description, 'choice');
    }
  }
}
