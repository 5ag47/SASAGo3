import { buildPreset } from '../auto-plan.js';
import { activities, courses, ELECTIVES, LAST_WEEK, TUTORIAL_LAST_WEEK } from '../catalog.js';
import { lockedSlots } from '../week.js';
import { electiveWindow, changeElective } from '../enrollment.js';
import { copyDayPlan, copyDayPreview } from '../schedule.js';
import { requireRule } from '../errors.js';
import { activityLock } from '../senior-year.js';
function markScheduleEdit(state, slots) {
  state.flags.editedSchedule = true;
  // Practice evidence counts for the whole tutorial window, not only the winter week.
  if (state.week > TUTORIAL_LAST_WEEK) return;
  if (slots.some((slot) => slot.activity === 'study' && courses[slot.target]?.ability === 'math'))
    state.flags.tutorialStudy = true;
  if (slots.some((slot) => slot.activity === 'task' && slot.target === 'practice-report'))
    state.flags.tutorialTask = true;
  if (slots.some((slot) => ['sleep', 'exercise', 'game', 'out'].includes(slot.activity)))
    state.flags.tutorialRecovery = true;
}
export function planPreset(state, preset) {
  return buildPreset(state, preset);
}
function syncRunPlan(state) {
  if (!state.weekRun) return;
  const locked = lockedSlots(state);
  for (let index = state.weekRun.cursor; index < 21; index++)
    if (!locked[index]) state.weekRun.plan[index] = { ...state.plan[index] };
}
export const planningCommands = {
  plan: {
    fields: ['type', 'index', 'activity', 'target'],
    apply(state, command) {
      requireRule(state.week <= LAST_WEEK, 'YEAR_FINISHED', '한 해의 일정이 끝났어요.');

      requireRule(
        Number.isInteger(command.index) &&
          command.index >= 0 &&
          command.index < 21 &&
          !lockedSlots(state)[command.index],
        'SLOT_INVALID',
        '변경할 수 없는 시간이에요.',
      );
      requireRule(
        Object.hasOwn(activities, command.activity),
        'ACTIVITY_INVALID',
        '활동을 다시 선택해 주세요.',
      );
      requireRule(
        command.index % 3 !== 0 || ['study', 'skip'].includes(command.activity),
        'MORNING_STUDY_ONLY',
        '아침 자습은 공부 또는 불참여를 선택하세요.',
      );
      const lock = activityLock(state, command.activity);
      requireRule(!lock, 'ACTIVITY_LOCKED', lock);
      const target = command.target ?? null;
      if (command.activity === 'study')
        requireRule(
          state.courses.includes(target),
          'COURSE_INVALID',
          '수강 중인 과목을 골라 주세요.',
        );
      if (command.activity === 'task')
        requireRule(
          state.tasks[target]?.status === 'active' && state.tasks[target]?.special !== 'tutorial',
          'TASK_INVALID',
          '진행 중인 할 일을 골라 주세요.',
        );
      if (command.activity === 'teacher')
        requireRule(
          ['math', 'science', 'homeroom'].includes(target),
          'TEACHER_INVALID',
          '선생님을 골라 주세요.',
        );
      requireRule(
        target === null || (typeof target === 'string' && target.length < 100),
        'TARGET_INVALID',
        '대상을 다시 골라 주세요.',
      );
      state.plan[command.index] = { activity: command.activity, target };
      markScheduleEdit(state, [state.plan[command.index]]);

      syncRunPlan(state);
      return state;
    },
  },
  copy_day: {
    fields: ['type', 'sourceDay', 'days'],
    apply(state, command) {
      requireRule(state.week <= LAST_WEEK, 'YEAR_FINISHED', '한 해의 일정이 끝났어요.');

      requireRule(
        Number.isInteger(command.sourceDay) &&
          command.sourceDay >= 0 &&
          command.sourceDay < 7 &&
          Array.isArray(command.days) &&
          command.days.length > 0 &&
          command.days.length <= 6 &&
          new Set(command.days).size === command.days.length &&
          command.days.every(
            (day) => Number.isInteger(day) && day >= 0 && day < 7 && day !== command.sourceDay,
          ),
        'COPY_DAYS_INVALID',
        '복사할 요일과 받을 요일을 다시 선택해 주세요.',
      );
      requireRule(
        copyDayPreview(state, command.sourceDay, command.days).some(
          (day) => day.indices.length || day.night,
        ),
        'COPY_EMPTY',
        '복사할 수 있는 자습 시간이 없어요.',
      );
      state.plan = copyDayPlan(state, command.sourceDay, command.days);
      for (const row of copyDayPreview(state, command.sourceDay, command.days))
        if (row.night)
          state.campaign.nights[row.day] = { ...state.campaign.nights[command.sourceDay] };
      markScheduleEdit(
        state,
        copyDayPreview(state, command.sourceDay, command.days).flatMap((day) =>
          day.indices.map((index) => state.plan[index]),
        ),
      );

      syncRunPlan(state);
      return state;
    },
  },
  preset: {
    fields: ['type', 'preset'],
    apply(state, command) {
      requireRule(state.week <= LAST_WEEK, 'YEAR_FINISHED', '한 해의 일정이 끝났어요.');

      requireRule(
        ['balanced', 'tasks', 'rest', 'math'].includes(command.preset),
        'PRESET_INVALID',
        '일정 프리셋을 다시 골라 주세요.',
      );
      state.plan = planPreset(state, command.preset);
      markScheduleEdit(state, state.plan);

      syncRunPlan(state);
      return state;
    },
  },
  elective: {
    fields: ['type', 'course', 'term', 'enabled'],
    apply(state, command) {
      requireRule(
        ELECTIVES.includes(command.course) &&
          [1, 2].includes(command.term) &&
          typeof command.enabled === 'boolean',
        'ELECTIVE_INVALID',
        '선택과목 신청을 확인해 주세요.',
      );
      requireRule(
        electiveWindow(state, command.term),
        'REGISTRATION_CLOSED',
        '지금은 선택과목 신청 기간이 아닙니다.',
      );
      requireRule(
        command.term === 2 || command.enabled || state.week === 0,
        'COURSE_DROP_CLOSED',
        '학기가 시작된 과목은 취소할 수 없습니다.',
      );
      changeElective(state, command.course, command.term, command.enabled);

      return state;
    },
  },
};
