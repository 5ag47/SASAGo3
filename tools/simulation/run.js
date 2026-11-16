import { createGame, transition, endingAvailable } from '../../src/domain/engine.js';
import { choiceOptions } from '../../src/domain/choices.js';
import { bestInterviewAnswers, interviewSpec } from '../../src/domain/interview.js';
import { courses, events, quizzes } from '../../src/domain/catalog.js';
import { gpa } from '../../src/domain/grades.js';
import { lockedSlots } from '../../src/domain/schedule.js';
import { solveActiveTaskGames, runPlannedWeek } from './task-games.js';

export const STRATEGIES = {
  tasks: '할 일 우선',
  balanced: '균형',
  essay: '논술 집중',
  portfolio: '종합 전형 집중',
  rest: '회복 우선',
  academy: '할 일·유료 여름 특강',
  overwork: '회복 없는 공부',
};
const normalChoices = {
  academy_offer: 'self',
  club_signup: 'lab',
  chat_incident: 'help',
  after_midterm: 'sleep',
  festival: 'audience',
  graduation_photo: 'suit',
  summer_place: 'home',
  summer_camp: 'none',
  summer_science: 'self',
  external_contest: 'enter',
  applications: 'balanced',
  mock_interview: 'answer',
  chuseok: 'rest',
  temptation: 'report',
  dorm_delivery: 'allowed',
  dorm_visit: 'rest',
  career_sessions: 'one',
  dorm_cards: 'watch',
};
function chooseWeek(state, strategy, target) {
  // Same lawful event policy across strategies; only planning and summer spending vary.
  while (state.pending.length) {
    const id = state.pending[0],
      event = events[id];
    if (event.kind === 'interview')
      state = transition(state, {
        type: 'choose',
        event: id,
        // The policy answers as a student who knows their own record.
        answers: bestInterviewAnswers(interviewSpec(state)),
      });
    else {
      let option = normalChoices[id];
      if (id === 'applications') option = target;
      if (strategy === 'academy' && id === 'summer_place') option = 'managed';
      if (strategy === 'academy' && id === 'summer_camp') option = 'heavy';
      if (strategy === 'academy' && id === 'summer_science') option = 'join';
      if (event.kind === 'study') option = 'friends';
      if (event.kind === 'registration') option = state.major;
      if (event.kind === 'recommendation')
        option = Object.keys(state.teachers).sort(
          (a, b) => state.teachers[b] - state.teachers[a],
        )[0];
      if (event.kind === 'quiz') option = String(quizzes[event.quiz].correct ?? 0);
      const available = choiceOptions(state, id);
      option =
        available.find(
          (item) => !item.locked && item.id === option && (item.cost ?? 0) <= state.money,
        )?.id ?? available.find((item) => !item.locked && !(item.cost > 0))?.id;
      if (!option) throw new Error(`SIMULATION_CHOICE:${id}`);
      state = transition(state, { type: 'choose', event: id, option });
    }
  }
  return state;
}
export function simulateYear({
  major = 'math',
  strategy = 'tasks',
  seed = 1107,
  target = strategy === 'portfolio' ? 'dream' : 'balanced',
  role = 'steady',
  electives = [],
  onWeek = () => {},
  planPolicy = null,
} = {}) {
  let state = createGame({ name: '전략 검증', character: 'boy', role, major, electives }, seed);
  let minimumMoney = state.money,
    fatigueWeeks = 0,
    strainWeeks = 0,
    peakStress = 0,
    totalTasks = 0;
  while (state.week <= 40) {
    onWeek(state);
    state = chooseWeek(state, strategy, target);
    state = solveActiveTaskGames(state);
    state = transition(state, {
      type: 'preset',
      preset: ['essay', 'overwork'].includes(strategy)
        ? 'balanced'
        : ['academy', 'portfolio'].includes(strategy)
          ? 'tasks'
          : strategy,
    });
    if (['essay', 'overwork'].includes(strategy)) {
      const math = state.courses.find((id) => courses[id].ability === 'math');
      const writing = state.courses.filter((id) => courses[id].ability === 'writing');
      let count = 0;
      for (const [index, slot] of state.plan.entries()) {
        if (!lockedSlots(state)[index] && (strategy === 'overwork' || slot.activity === 'study')) {
          const course =
            strategy === 'essay' && count++ % 3 === 2
              ? writing[Math.floor(count / 3) % writing.length]
              : math;
          state = transition(state, { type: 'plan', index, activity: 'study', target: course });
        }
      }
    }
    if (strategy === 'portfolio' && state.stats.hp >= 45 && state.stats.stress < 65) {
      const index = state.plan.findIndex(
        (slot, index) => !lockedSlots(state)[index] && slot.activity === 'sleep',
      );
      if (index >= 0)
        state = transition(state, { type: 'plan', index, activity: 'interview', target: null });
    }
    // Experimental policies receive a copy and still go through the real command boundary.
    if (planPolicy) {
      const plan = planPolicy(structuredClone(state));
      if (!Array.isArray(plan) || plan.length !== 21) throw new Error('SIMULATION_PLAN');
      for (const [index, slot] of plan.entries())
        if (
          slot.activity !== state.plan[index].activity ||
          slot.target !== state.plan[index].target
        )
          state = transition(state, {
            type: 'plan',
            index,
            activity: slot.activity,
            target: slot.target,
          });
    }
    // All strategies keep the same single cleaning slot on inspection weeks.
    if (
      Object.values(state.tasks).some(
        (task) =>
          task.special === 'clean' && task.deadline === state.week && task.status === 'active',
      )
    ) {
      const index = state.plan.findIndex(
        (slot, index) => !lockedSlots(state)[index] && slot.activity === 'sleep',
      );
      if (index >= 0)
        state = transition(state, { type: 'plan', index, activity: 'clean', target: null });
    }
    state = runPlannedWeek(state);
    minimumMoney = Math.min(minimumMoney, state.money);
    fatigueWeeks += Number(state.fatigue >= 2);
    strainWeeks += Number(state.fatigue >= 1);
    peakStress = Math.max(peakStress, state.stats.stress);
  }
  const tasks = Object.values(state.tasks).filter(
    (task) => !['tutorial', 'practice'].includes(task.special),
  );
  const result = {
    major,
    strategy,
    seed,
    target,
    role,
    electives,
    gpa1: gpa(state, 1),
    gpa2: gpa(state, 2),
    completed: tasks.filter((task) => task.status === 'completed').length,
    expired: tasks.filter((task) => task.status === 'expired').length,
    fatigueWeeks,
    strainWeeks,
    peakStress,
    csatGrade: state.flags.csatGrade ?? null,
    money: state.money,
    minimumMoney,
    admissions: state.admissions.filter((a) => a.accepted).length,
    admissionDetails: state.admissions,
    endings: ['university', 'work', 'startup', 'retry', 'prison'].filter((id) =>
      endingAvailable(state, id),
    ),
    stats: state.stats,
    mastery: state.courseMastery,
  };
  return { state, result };
}
