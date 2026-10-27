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
import { beginWeek, notice } from './events.js';
import { expireTasks, workTask } from './tasks.js';
import { assessmentsAt } from './school-calendar.js';
import { enrollCourses, learnCourse } from './course-progress.js';
import { effectivePlan } from './schedule.js';
export { effectivePlan, lockedSlots } from './schedule.js';

export function learningEfficiency(state) {
  return (
    (0.9 + state.stats.focus / 250) *
    (state.stats.stress >= 70 ? 0.75 : 1) *
    (state.stats.hp < 30 ? 0.75 : 1) *
    (state.fatigue ? 0.65 : 1)
  );
}
export function resolveWeek(source) {
  const state = structuredClone(source);
  enrollCourses(state);
  const beforeCourses = { ...state.courseMastery };
  const before = { ...state.stats };
  const moneyBefore = state.money;
  const messages = [];
  const actions = [];
  const plan = effectivePlan(state);
  const counts = {};
  let environment = 1;
  let workCount = 0;
  state.money += 10000;
  messages.push('주간 용돈 +10,000원');
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
  for (const [index, slot] of plan.entries()) {
    let id = slot.activity;
    let definition = activities[id];
    const slotBefore = { ...state.stats };
    const courseBefore = { ...state.courseMastery };
    let note = '';
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
    const study = [
      'study',
      'task',
      'research',
      'academy',
      'science_academy',
      'interview',
      'essay',
    ].includes(id);
    if (study) workCount++;
    counts[id] = (counts[id] ?? 0) + 1;
    const repetition = study ? Math.max(0.55, 1 - Math.max(0, counts[id] - 5) * 0.07) : 1;
    const efficiency = learningEfficiency(state) * environment * repetition;
    for (const [key, value] of Object.entries(definition.effect)) {
      const mastery =
        value > 0 && ['math', 'science', 'writing', 'speech'].includes(key)
          ? 0.25 + (1 - state.stats[key] / 100) * 0.75
          : 1;
      applyEffects(state, { [key]: value }, mastery !== 1 ? efficiency * mastery : 1);
    }
    if (id === 'study') {
      const courseId = state.courses.includes(slot.target) ? slot.target : state.courses[0];
      const ability = courses[courseId].ability;
      const mastery = 0.25 + (1 - state.stats[ability] / 100) * 0.75;
      applyEffects(state, { [ability]: definition.gain * efficiency * mastery });
      learnCourse(state, courseId, efficiency);
      if (ability === 'math') workTask(state, 'first-study', messages);
      note = courses[courseId].name;
    }
    if (id === 'task') {
      workTask(state, slot.target, messages);
      note = state.tasks[slot.target].name;
    }
    if (id === 'research') {
      workTask(state, 'thesis', messages);
      note = '졸업논문 진척 +1';
    }
    if (id === 'essay') {
      const progress = state.stats.reputation >= 60 ? 1.5 : 1;
      workTask(state, 'essay', messages, progress);
      note = `자소서 진척 +${progress}`;
    }
    if (id === 'clean')
      for (const t of activeTasks(state).filter((t) => t.special === 'clean'))
        workTask(state, t.id, messages);
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
      state.teachers[teacher] = clamp(state.teachers[teacher] + 7);
    }
    if (id === 'club' && state.flags.club)
      applyEffects(state, state.flags.club === 'lab' ? { science: 2 } : { writing: 1.5, charm: 1 });
    actions.push({
      index,
      activity: id,
      target: slot.target,
      note,
      delta: Object.fromEntries(
        Object.keys(STATS).map((k) => [k, Math.round((state.stats[k] - slotBefore[k]) * 10) / 10]),
      ),
      courseDelta: Object.fromEntries(
        Object.entries(state.courseMastery)
          .map(([course, value]) => [
            course,
            Math.round((value - (courseBefore[course] ?? value)) * 10) / 10,
          ])
          .filter(([, delta]) => delta !== 0),
      ),
    });
  }
  const stress = 6 + Math.round(workCount * 0.35);
  applyEffects(state, { stress, hp: -8, focus: -3 });
  messages.push('정규수업·일상 피로 · 체력 -8 · 집중력 -3');
  messages.push(`주간 생활 부담 · 스트레스 +${stress} (기본 6 + 학습량 ${stress - 6})`);
  if (state.group === 'friends') applyEffects(state, { stress: -2 });
  if (state.group && !plan.some((s) => s.activity === 'study_group')) {
    const fine = Math.min(state.money, 500);
    state.money -= fine;
    messages.push(`스터디 불참 벌금 -${fine}원`);
  }
  const failedCleaning = activeTasks(state).some(
    (t) => t.special === 'clean' && t.deadline === state.week,
  );
  if (failedCleaning) {
    state.discipline++;
    messages.push('호실 점검 미완료 · 벌점 +1');
  }
  expireTasks(state, messages);
  for (const exam of assessmentsAt(state.week))
    messages.push(`${exam.name} · ${assess(state, exam.kind).join(' / ')}`);
  if (random(state) < 0.24 && state.week > 0) {
    const good = random(state) > 0.4;
    applyEffects(state, good ? { stress: -3, reputation: 1 } : { stress: 3, hp: -2 });
    messages.push(
      good ? '생활 이벤트 · 스트레스 -3 · 평판 +1' : '생활 이벤트 · 스트레스 +3 · 체력 -2',
    );
  }
  state.fatigue = state.stats.hp < 25 || state.stats.stress >= 80 ? 1 : 0;
  if (state.fatigue)
    messages.push(
      '만성피로 · 다음 주 학습 효율 ×0.65. 체력 25 이상·스트레스 80 미만으로 회복하세요.',
    );
  for (const id of [...state.pending])
    if (choiceDeadline(id) <= state.week) {
      state.choices[id] = 'skipped';
      state.pending = state.pending.filter((key) => key !== id);
      messages.push(`선택 마감 · ${events[id].name} (미참여)`);
    }
  const entry = {
    week: source.week,
    label: period(source.week).label,
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
    seedBefore: source.seed,
    seedAfter: state.seed,
  };
  state.history.push(entry);
  state.week++;
  if (state.week <= 40) beginWeek(state);
  else
    notice(
      state,
      '한 해의 마지막 페이지',
      '진학실에서 결과를 보고 나의 다음 길을 선택하세요.',
      'event',
    );
  return state;
}
