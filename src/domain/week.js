import {
  activities,
  activeTasks,
  choiceDeadline,
  courses,
  events,
  GROUPS,
  period,
  STATS,
} from './catalog.js';
import { applyEffects, clamp, random } from './random.js';
import { assess } from './grades.js';
import { beginWeek, notice, dispatchDayEvents } from './events.js';
import { abandonMinigame } from './minigames.js';
import { expireTasks, workTask } from './tasks.js';
import { assessmentsOnDay } from './school-calendar.js';
import { dateOrdinal, weekDate } from './calendar-date.js';
import { enrollCourses, learnCourse } from './course-progress.js';
import { effectivePlan } from './schedule.js';
import { taskModule, taskGameStatus } from './task-modules/registry.js';
import { finishTaskAttempt, beginTaskAttempt, attemptLimitReached } from './task-attempts.js';
import { resolveStudyApplication } from './study-applications.js';
import { balance } from './balance.js';
import { announceChapters } from './story.js';
import { essayWorkAmount } from './school-record.js';
import { advanceRecommendation, resolveRecommendation } from './recommendation.js';
import {
  activityLock,
  focusDrift,
  monthlyAllowance,
  recoveryFactor,
  recoveryOrdinal,
  RECOVERY_ACTIVITIES,
  seasonAt,
  slotEffectParts,
  STRAIN_STAGES,
  strainMultiplier,
  strainStage,
  weeklyLoad,
  WORK_ACTIVITIES,
} from './senior-year.js';
export { effectivePlan, lockedSlots } from './schedule.js';

export function learningEfficiency(state) {
  const config = balance.learning;
  return (
    (config.base + state.stats.focus / config.focusScale) *
    (state.stats.stress >= config.stressThreshold ? config.conditionMultiplier : 1) *
    (state.stats.hp < config.lowHealth ? config.conditionMultiplier : 1) *
    strainMultiplier(state.fatigue)
  );
}
export function startWeek(state) {
  enrollCourses(state);
  const beforeCourses = { ...state.courseMastery };
  const before = { ...state.stats };
  const moneyBefore = state.money;
  const messages = [];
  const actions = [];
  const plan = structuredClone(effectivePlan(state));
  const counts = {};
  let environment = 1;
  let workCount = 0;
  const allowance = monthlyAllowance(state.week);
  if (allowance) {
    state.money += allowance;
    messages.push(`이번 달 용돈 +${allowance.toLocaleString()}원`);
  }
  const living = balance.weekly.livingCost;
  if (state.money >= living) {
    state.money -= living;
    messages.push(`생활비·매점 -${living.toLocaleString()}원`);
  } else {
    state.money = 0;
    applyEffects(state, { stress: 3 });
    messages.push('생활비가 모자람 · 스트레스 +3');
  }
  if (state.week >= 17 && state.week <= 24) {
    const fee = { home: 0, cafe: 4000, managed: 9000 }[state.flags.environment];
    if (state.money >= fee) {
      state.money -= fee;
      environment = { home: 0.9, cafe: 1.15, managed: 1.4 }[state.flags.environment];
      if (state.flags.environment === 'home') state.money += 2000;
      if (state.flags.environment === 'managed') applyEffects(state, { stress: 3 });
      messages.push(
        `방학 학습 환경 · ${state.flags.environment === 'home' ? '집 (+2,000원)' : `${state.flags.environment === 'cafe' ? '스터디카페' : '관리형'} (-${fee.toLocaleString()}원)`}`,
      );
    } else {
      environment = 0.9;
      messages.push('환경 비용이 부족해 이번 주는 집에서 공부했어요.');
    }
  }
  state.weekRun = {
    week: state.week,
    minHealth: state.stats.hp,
    peakStress: state.stats.stress,
    cursor: 0,
    lastDay: -1,
    closedDay: -1,
    alerts: [],
    plan,
    counts,
    workCount,
    environment,
    messages,
    actions,
    before,
    beforeCourses,
    moneyBefore,
    seedBefore: state.seed,
    waiting: null,
    slot: null,
  };
}
function finishRunSlot(state, slot) {
  const run = state.weekRun;
  run.minHealth = Math.min(run.minHealth, state.stats.hp);
  run.peakStress = Math.max(run.peakStress, state.stats.stress);
  run.actions.push({
    index: slot.index,
    activity: slot.activity,
    target: slot.target,
    note: slot.note,
    delta: Object.fromEntries(
      Object.keys(STATS).map((key) => [
        key,
        Math.round((state.stats[key] - slot.before[key]) * 10) / 10,
      ]),
    ),
    courseDelta: Object.fromEntries(
      Object.entries(state.courseMastery)
        .map(([id, value]) => [
          id,
          Math.round((value - (slot.beforeCourses[id] ?? value)) * 10) / 10,
        ])
        .filter(([, value]) => value !== 0),
    ),
  });
  run.cursor++;
  run.slot = null;
}
function executeSlot(state) {
  const run = state.weekRun,
    index = run.cursor,
    slot = run.plan[index];
  const { messages, counts, environment } = run;

  let id = slot.activity;
  let definition = activities[id];
  const slotBefore = { ...state.stats };
  const courseBefore = { ...state.courseMastery };
  let note = '';
  const scheduledTask =
    state.tasks[
      id === 'task'
        ? slot.target
        : id === 'research'
          ? 'thesis'
          : id === 'essay'
            ? 'essay'
            : id === 'clean'
              ? activeTasks(state).find((t) => t.special === 'clean')?.id
              : ''
    ];
  if (scheduledTask && !scheduledTask.attempts?.open && attemptLimitReached(state, scheduledTask)) {
    id = 'sleep';
    definition = activities.sleep;
    note = '주간 도전 횟수 상한 · 호실 휴식';
  }
  const lock = activityLock(state, id);
  if (lock) {
    id = 'sleep';
    definition = activities.sleep;
    note = lock + ' → 호실 휴식';
  }
  if ((definition.cost ?? 0) > state.money) {
    id = 'sleep';
    definition = activities.sleep;
    note = '잔액 부족 → 호실 휴식';
  }
  if (
    (id === 'task' && state.tasks[slot.target]?.status !== 'active') ||
    (id === 'research' && state.tasks.thesis?.status !== 'active') ||
    (id === 'essay' && state.tasks.essay?.status !== 'active') ||
    (id === 'study_group' && !state.group)
  ) {
    id = 'sleep';
    definition = activities.sleep;
    note = '진행할 대상 없음 → 호실 휴식';
  }
  state.money = Math.max(0, state.money - (definition.cost ?? 0) + (definition.income ?? 0));
  const study = WORK_ACTIVITIES.includes(id);
  if (study) run.workCount++;
  counts[id] = (counts[id] ?? 0) + 1;
  const config = balance.learning;
  const repetition = study
    ? Math.max(
        config.repetitionFloor,
        1 - Math.max(0, counts[id] - config.repetitionStart) * config.repetitionLoss,
      )
    : 1;
  const efficiency = learningEfficiency(state) * environment * repetition;
  const recovery = RECOVERY_ACTIVITIES.includes(id) ? recoveryFactor(recoveryOrdinal(counts)) : 1;
  for (const [key, value, multiplier] of slotEffectParts(id, definition.effect, {
    efficiency,
    recovery,
    pressure: seasonAt(state.week).pressure,
  }))
    applyEffects(state, { [key]: value }, multiplier);
  if (recovery < 1) note = `회복 효과 ×${Math.round(recovery * 100) / 100}`;
  if (id === 'csat_study') {
    const config = balance.admissions;
    state.flags.csatPrep =
      Math.round(
        Math.min(
          config.csatPrepCap,
          (state.flags.csatPrep ?? 0) + config.csatPrepGain * efficiency,
        ) * 10,
      ) / 10;
    note = `수능 대비 ${state.flags.csatPrep}/${config.csatPrepCap}`;
  }
  if (id === 'study') {
    const courseId = state.courses.includes(slot.target) ? slot.target : state.courses[0];
    const ability = courses[courseId].ability;
    applyEffects(state, { [ability]: definition.gain * efficiency });
    learnCourse(state, courseId, efficiency);
    if (ability === 'math') workTask(state, 'first-study', messages);
    note = courses[courseId].name;
  }
  const target =
    id === 'task'
      ? slot.target
      : id === 'research'
        ? 'thesis'
        : id === 'essay'
          ? 'essay'
          : id === 'clean'
            ? activeTasks(state).find((t) => t.special === 'clean')?.id
            : null;
  const task = target ? state.tasks[target] : null;
  if (task?.status === 'active') {
    note = task.name;
    const amount = task.special === 'essay' ? essayWorkAmount(state) : 1;
    if (taskModule(task).game && !task.moduleData?.passed) {
      if (task.moduleData && !task.attempts?.open) beginTaskAttempt(state, task);
      run.slot = {
        index,
        activity: id,
        target: slot.target,
        note,
        before: slotBefore,
        beforeCourses: courseBefore,
        amount,
      };
      run.waiting = { kind: 'task', task: task.id, index };
      return;
    }
    workTask(state, task.id, messages, amount);
  }
  if (id === 'study_group')
    applyEffects(
      state,
      GROUPS[state.group].effect,
      ['focused'].includes(state.group) ? efficiency : 1,
    );
  if (id === 'teacher') {
    const teacher = ['math', 'science', 'homeroom'].includes(slot.target)
      ? slot.target
      : 'homeroom';
    state.teachers[teacher] =
      Math.round(
        clamp(
          state.teachers[teacher] +
            balance.relationships.visitGain *
              (1 - state.teachers[teacher] / balance.relationships.softScale),
        ) * 10,
      ) / 10;
  }
  if (id === 'teacher') {
    const review = advanceRecommendation(
      state,
      ['math', 'science', 'homeroom'].includes(slot.target) ? slot.target : 'homeroom',
    );
    if (review) note = review;
  }
  if (id === 'club' && state.flags.club)
    applyEffects(state, state.flags.club === 'lab' ? { science: 2 } : { writing: 1.5, charm: 1 });

  finishRunSlot(state, {
    index,
    activity: id,
    target: slot.target,
    note,
    before: slotBefore,
    beforeCourses: courseBefore,
  });
}
export function finishRunTask(state, task) {
  const run = state.weekRun;
  if (
    !run ||
    run.waiting?.kind !== 'task' ||
    run.waiting.task !== task.id ||
    taskGameStatus(task) !== 'success'
  )
    throw new Error('TASK_SESSION_MISMATCH');
  const result = finishTaskAttempt(state, task);
  workTask(state, task.id, run.messages, run.slot.amount);
  const completed = task.status === 'completed';
  run.slot.note =
    task.name + ' · 작업 ' + task.progress + '/' + task.target + ' · 품질 ' + result.quality;
  finishRunSlot(state, run.slot);
  run.waiting = {
    kind: 'task_result',
    task: task.id,
    completed,
    quality: result.quality,
    progress: task.progress,
    target: task.target,
  };
  if (!completed) delete task.moduleData;
}
export function skipRunTask(state) {
  const run = state.weekRun;
  if (run?.waiting?.kind !== 'task') return false;
  const task = state.tasks[run.waiting.task];
  if (task.attempts) task.attempts.open = false;
  delete task.moduleData;
  run.slot.note = task.name + ' · 작업 중단';
  finishRunSlot(state, run.slot);
  run.waiting = null;
  return true;
}
export function resolveWeek(source) {
  const state = structuredClone(source);
  if (!state.weekRun) startWeek(state);
  const run = state.weekRun;
  if (run.waiting?.kind === 'task') return state;
  run.waiting = null;
  if (run.alerts.length) {
    run.waiting = run.alerts.shift();
    return state;
  }
  while (run.cursor < 21) {
    const day = Math.floor(run.cursor / 3);
    if (day !== run.lastDay) {
      if (run.lastDay >= 0) closeRunDay(state, run.lastDay);
      run.lastDay = day;
      const beforePending = new Set(state.pending),
        beforeTasks = new Set(Object.keys(state.tasks));
      dispatchDayEvents(state, day);
      const result = resolveStudyApplication(state, dateOrdinal(weekDate(state.week, day)));
      if (result) run.alerts.push(result);
      const letter = resolveRecommendation(state, dateOrdinal(weekDate(state.week, day)));
      if (letter) run.alerts.push(letter);
      for (const event of state.pending.filter((id) => !beforePending.has(id)))
        run.alerts.push({
          kind: 'notice',
          title: events[event].name,
          text: events[event].description,
          event,
        });
      for (const task of Object.keys(state.tasks).filter((id) => !beforeTasks.has(id)))
        run.alerts.push({ kind: 'notice', title: '새 할 일', text: state.tasks[task].name, task });
      if (run.alerts.length) {
        run.waiting = run.alerts.shift();
        return state;
      }
    }
    executeSlot(state);
    if (run.waiting) return state;
  }
  closeRunDay(state, 6);
  const { messages, actions, plan, workCount, before, beforeCourses, moneyBefore } = run;
  const load = weeklyLoad(run.week, workCount);
  applyEffects(state, { stress: load.stress, hp: load.hp, focus: load.focus });
  messages.push(
    `${load.season.label} · 정규수업·생활 부담 · 체력 ${load.hp} · 스트레스 +${load.stress}` +
      (load.season.pressure > 1 ? ` (시기 부담 ×${load.season.pressure})` : ''),
  );
  if (state.group === 'friends') applyEffects(state, { stress: -2 });
  if (state.group && !plan.some((s) => s.activity === 'study_group')) {
    const fine = Math.min(state.money, 500);
    state.money -= fine;
    messages.push(`스터디 불참 벌금 -${fine}원`);
  }
  if (random(state) < 0.24 && state.week > 0) {
    const good = random(state) > 0.4;
    applyEffects(state, good ? { stress: -3, reputation: 1 } : { stress: 3, hp: -2 });
    messages.push(
      good ? '생활 이벤트 · 스트레스 -3 · 평판 +1' : '생활 이벤트 · 스트레스 +3 · 체력 -2',
    );
  }
  const previousStage = state.fatigue;
  state.fatigue = strainStage(state.stats, run, previousStage);
  const drift = focusDrift(state.stats, state.fatigue);
  if (drift) applyEffects(state, { focus: drift });
  if (state.fatigue)
    messages.push(
      `${STRAIN_STAGES[state.fatigue].name} · 다음 주 학습 효율 ×${strainMultiplier(state.fatigue)}` +
        (state.fatigue > previousStage
          ? ''
          : previousStage > state.fatigue
            ? ' · 조금 회복됨'
            : ' · 그대로'),
    );
  else if (previousStage) messages.push('컨디션 회복 · 학습 효율 정상');
  for (const id of [...state.pending])
    if (choiceDeadline(id) <= state.week) {
      abandonMinigame(state, id);
      state.choices[id] = 'skipped';
      state.pending = state.pending.filter((key) => key !== id);
      messages.push(`선택 마감 · ${events[id].name} (미참여)`);
    }
  const entry = {
    week: run.week,
    label: period(run.week).label,
    plan,
    actions,
    messages,
    beforeStats: before,
    afterStats: { ...state.stats },
    delta: Object.fromEntries(
      Object.keys(STATS).map((k) => [k, Math.round((state.stats[k] - before[k]) * 10) / 10]),
    ),
    moneyDelta: state.money - moneyBefore,
    beforeCourses,
    afterCourses: { ...state.courseMastery },
    courseDelta: Object.fromEntries(
      Object.entries(state.courseMastery)
        .map(([id, value]) => [id, Math.round((value - (beforeCourses[id] ?? value)) * 10) / 10])
        .filter(([, delta]) => delta !== 0),
    ),
    seedBefore: run.seedBefore,
    seedAfter: state.seed,
  };
  state.history.push(entry);
  state.weekRun = null;
  state.week++;
  if (state.week <= 40) beginWeek(state);
  else {
    notice(
      state,
      '한 해의 마지막 페이지',
      '진학실에서 결과를 보고 나의 다음 길을 선택하세요.',
      'event',
    );
    announceChapters(state);
  }

  return state;
}

function closeRunDay(state, day) {
  const run = state.weekRun;
  if (day <= run.closedDay) return;
  for (const task of activeTasks(state))
    if (task.special === 'clean' && task.deadline <= state.week && (task.deadlineDay ?? 6) <= day) {
      state.discipline++;
      run.messages.push('호실 점검 미완료 · 벌점 +1');
    }
  expireTasks(state, run.messages, day);
  for (const exam of assessmentsOnDay(state.week, day))
    run.messages.push(exam.name + ' · ' + assess(state, exam.kind, exam.sourceId).join(' / '));
  run.closedDay = day;
}
