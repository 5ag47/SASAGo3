import {
  activities,
  activeTasks,
  courses,
  ELECTIVES,
  items,
  LAST_WEEK,
  MAJORS,
  REQUIRED,
  roles,
} from './catalog.js';
import { baseState, balancedPlan, CONTENT_VERSION, validateState } from './state.js';
import { applyEffects } from './random.js';
import { beginWeek } from './events.js';
import { applyChoice, choiceOptions, INTERVIEW_QUESTIONS } from './choices.js';
import { effectivePlan, lockedSlots, resolveWeek } from './week.js';
import { enrollCourses } from './course-progress.js';
import { courseSet, electiveWindow, changeElective } from './enrollment.js';
import { copyDayPlan, copyDayPreview } from './schedule.js';

export class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}
const requireRule = (condition, code, message) => {
  if (!condition) throw new GameError(code, message);
};
function markScheduleEdit(state, slots) {
  state.flags.editedSchedule = true;
  if (state.week !== 0) return;
  if (slots.some((slot) => slot.activity === 'study' && courses[slot.target]?.ability === 'math'))
    state.flags.tutorialStudy = true;
  if (slots.some((slot) => slot.activity === 'task' && slot.target === 'practice-report'))
    state.flags.tutorialTask = true;
  if (slots.some((slot) => ['sleep', 'exercise', 'game', 'out'].includes(slot.activity)))
    state.flags.tutorialRecovery = true;
}
export function createGame(profile, seed = 20261013) {
  requireRule(
    typeof profile?.name === 'string' &&
      profile.name.trim().length > 0 &&
      profile.name.trim().length <= 12,
    'PROFILE_NAME',
    '이름은 1~12자로 입력해 주세요.',
  );
  requireRule(
    ['boy', 'girl'].includes(profile.character) &&
      Object.hasOwn(roles, profile.role) &&
      Object.hasOwn(MAJORS, profile.major),
    'PROFILE_OPTION',
    '캐릭터·특성·전공을 다시 선택해 주세요.',
  );
  const state = baseState(seed);
  const electives = profile.electives === undefined ? [] : profile.electives;
  requireRule(
    Array.isArray(electives) &&
      electives.length <= ELECTIVES.length &&
      new Set(electives).size === electives.length &&
      electives.every((id) => ELECTIVES.includes(id)),
    'ELECTIVES_INVALID',
    '선택과목을 다시 확인해 주세요.',
  );
  Object.assign(state, {
    created: true,
    name: profile.name.trim(),
    character: profile.character,
    role: profile.role,
    major: profile.major,
    electives: [...electives],
    courses: courseSet(profile.major, electives),
  });
  applyEffects(state, roles[profile.role].stats);
  enrollCourses(state);
  beginWeek(state);
  state.plan = balancedPlan(state);
  return state;
}
export function planPreset(state, preset) {
  if (preset === 'balanced')
    return balancedPlan(state).map((slot, i) =>
      slot.activity === 'study'
        ? { ...slot, target: state.courses[Math.floor(i / 3) % state.courses.length] }
        : slot,
    );
  if (preset === 'rest')
    return Array.from({ length: 21 }, (_, i) => ({
      activity: i % 3 === 0 ? 'exercise' : i % 3 === 1 ? 'sleep' : 'game',
      target: null,
    }));
  const queue = activeTasks(state)
    .sort((a, b) => a.deadline - b.deadline)
    .flatMap((task) => Array.from({ length: Math.ceil(task.target - task.progress) }, () => task));
  return Array.from({ length: 21 }, (_, i) => {
    if (lockedSlots(state)[i]) return state.plan[i];
    if (i % 3 === 2) return { activity: 'sleep', target: null };
    const task = queue.shift();
    if (!task) return { activity: 'study', target: state.courses[i % state.courses.length] };
    if (task.special === 'tutorial')
      return {
        activity: 'study',
        target: state.courses.find((id) => courses[id].ability === 'math'),
      };
    return { activity: task.special === 'clean' ? 'clean' : 'task', target: task.id };
  });
}
export const ENDINGS = {
  university: {
    title: '대학 진학',
    subtitle: '합격',
    description: '합격 통지서가 도착했다. 다음 봄에는 새로운 학교로 간다.',
  },
  retry: {
    title: '재도전',
    subtitle: '다시 도전하는 겨울',
    description: '입시를 한 해 더 준비하기로 했다. 올해의 기록을 정리하고 새 계획을 세운다.',
  },
  work: {
    title: '아르바이트',
    subtitle: '첫 출근',
    description: '일을 시작하기로 했다. 첫 월급이 들어오면 뭘 할지 생각 중이다.',
  },
  startup: {
    title: '창업',
    subtitle: '프로젝트 출시',
    description: '학교에서 만들던 프로젝트를 출시했다. 이제 과제 마감 대신 고객의 연락을 기다린다.',
  },
  prison: {
    title: '감옥',
    subtitle: '위험한 편법의 결말',
    description: '편법이 들통났다. 게임 속 과장된 결말이지만, 이번 기록은 여기서 끝난다.',
  },
  leave: {
    title: '휴학',
    subtitle: '학업 중단',
    description: '학업을 잠시 멈추기로 했다. 지금까지의 기록은 보관한다.',
  },
};
export function endingAvailable(state, id) {
  if (id === 'leave') return true;
  if (state.week <= LAST_WEEK) return false;
  if (state.discipline >= 5) return id === 'prison';
  if (id === 'prison') return false;
  if (id === 'university') return state.admissions.some((a) => a.accepted);
  if (id === 'startup') return state.stats.science >= 55 && state.stats.reputation >= 40;
  return ['retry', 'work'].includes(id);
}
export function transition(source, command) {
  requireRule(
    validateState(source),
    'STATE_INVALID',
    '저장 상태를 확인할 수 없어요. 백업을 복원해 주세요.',
  );
  requireRule(
    command && typeof command.type === 'string',
    'COMMAND_INVALID',
    '알 수 없는 요청이에요.',
  );
  let state = structuredClone(source);
  state.contentVersion = CONTENT_VERSION;
  if (command.type === 'create') {
    requireRule(!state.created, 'ALREADY_CREATED', '이미 시작한 게임이에요.');
    state = createGame(command.profile, state.seed);
    state.flags.runRevision = source.revision + 1;
  } else {
    requireRule(
      state.created && !state.ending,
      'GAME_CLOSED',
      '진행 중인 게임에서만 할 수 있어요.',
    );
    if (['plan', 'preset', 'copy_day'].includes(command.type))
      requireRule(state.week <= LAST_WEEK, 'YEAR_FINISHED', '한 해의 일정이 끝났어요.');
    if (command.type === 'plan') {
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
    } else if (command.type === 'copy_day') {
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
        copyDayPreview(state, command.sourceDay, command.days).some((day) => day.indices.length),
        'COPY_EMPTY',
        '복사할 수 있는 자습 시간이 없어요.',
      );
      state.plan = copyDayPlan(state, command.sourceDay, command.days);
      markScheduleEdit(
        state,
        copyDayPreview(state, command.sourceDay, command.days).flatMap((day) =>
          day.indices.map((index) => state.plan[index]),
        ),
      );
    } else if (command.type === 'elective') {
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
    } else if (command.type === 'preset') {
      requireRule(
        ['balanced', 'tasks', 'rest'].includes(command.preset),
        'PRESET_INVALID',
        '일정 프리셋을 다시 골라 주세요.',
      );
      state.plan = planPreset(state, command.preset);
      markScheduleEdit(state, state.plan);
    } else if (command.type === 'advance') {
      requireRule(
        state.week <= LAST_WEEK,
        'YEAR_FINISHED',
        '한 해가 끝났어요. 진학실에서 다음 길을 선택하세요.',
      );
      state = resolveWeek(state);
    } else if (command.type === 'choose') {
      requireRule(
        state.pending.includes(command.event),
        'EVENT_INVALID',
        '이미 결정했거나 아직 발생하지 않은 이벤트예요.',
      );
      if (command.event === 'interview_day') {
        const answered = state.minigames.interview?.answers.length ?? 0;
        const single = /^answer:[0-2]$/.test(command.option ?? '') && command.answers === undefined;
        requireRule(
          single ||
            (answered === 0 &&
              Array.isArray(command.answers) &&
              command.answers.length === INTERVIEW_QUESTIONS.length &&
              command.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 3)),
          'ANSWERS_INVALID',
          '현재 질문의 답변을 선택해 주세요.',
        );
      } else {
        const option = choiceOptions(state, command.event).find((o) => o.id === command.option);
        requireRule(option, 'OPTION_INVALID', '선택지를 다시 골라 주세요.');
        requireRule(
          state.money >= (option.cost ?? 0),
          'MONEY_LOW',
          '용돈이 부족해요. 다른 선택지를 골라 주세요.',
        );
      }
      applyChoice(
        state,
        command.event,
        command.option,
        command.event === 'interview_day' && command.answers === undefined
          ? [Number(command.option.slice(7))]
          : command.answers,
      );
    } else if (command.type === 'buy') {
      requireRule(Object.hasOwn(items, command.item), 'ITEM_INVALID', '상품을 다시 선택해 주세요.');
      const item = items[command.item];
      requireRule(state.money >= item.price, 'MONEY_LOW', '용돈이 부족해요.');
      state.money -= item.price;
      applyEffects(state, item.effect);
    } else if (command.type === 'ending') {
      requireRule(
        endingAvailable(state, command.ending),
        'ENDING_LOCKED',
        '아직 선택할 수 없는 결말이에요.',
      );
      state.ending = { id: command.ending, week: state.week };
    } else throw new GameError('COMMAND_UNKNOWN', '지원하지 않는 요청이에요.');
  }
  state.revision = source.revision + 1;
  requireRule(
    validateState(state),
    'INVARIANT_FAILED',
    '변경 결과가 규칙에 맞지 않아 적용하지 않았어요.',
  );
  return state;
}
export { effectivePlan };
