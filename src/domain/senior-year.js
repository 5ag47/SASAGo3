// Senior-year pressure rules shared by the weekly engine, the plan forecast and the UI.
// Pure functions over balance data: no React, DOM, network or Math.random.
import { balance, ACADEMIC_STATS } from './balance.js';

export const STRAIN_STAGES = Object.freeze([
  { id: 'none', name: '' },
  { id: 'strain', name: '지침' },
  { id: 'tired', name: '피로' },
  { id: 'burnout', name: '번아웃' },
]);
export const MAX_STRAIN = STRAIN_STAGES.length - 1;
export const RECOVERY_ACTIVITIES = Object.freeze(['sleep', 'exercise', 'game', 'out']);
export const WORK_ACTIVITIES = Object.freeze([
  'study',
  'task',
  'research',
  'academy',
  'science_academy',
  'interview',
  'essay',
  'csat_study',
]);

export function seasonAt(week) {
  const clamped = Math.max(0, Math.min(40, week));
  for (const [id, season] of Object.entries(balance.seasons))
    if (clamped >= season.from && clamped <= season.to)
      return { id, ...season, vacation: Boolean(season.vacation) };
  return { id: 'none', from: clamped, to: clamped, pressure: 1, label: '', vacation: false };
}
export const isVacation = (week) => seasonAt(week).vacation;

export function strainMultiplier(stage) {
  const config = balance.learning;
  return (
    [1, config.strainMultiplier, config.fatigueMultiplier, config.burnoutMultiplier][stage] ?? 1
  );
}

// ordinal = this slot's position (1-based) among the week's recovery slots.
export function recoveryFactor(ordinal) {
  const config = balance.recovery;
  return Math.max(config.floor, 1 - Math.max(0, ordinal - config.freeSlots) * config.loss);
}
export const recoveryOrdinal = (counts) =>
  RECOVERY_ACTIVITIES.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

// Splits one slot's effects into [stat, amount, multiplier] parts.
// Learning gains follow efficiency, recovery benefits shrink after the free slots,
// and the stress of work grows with the season's pressure.
export function slotEffectParts(
  id,
  effect = {},
  { efficiency = 1, recovery = 1, pressure = 1 } = {},
) {
  const work = WORK_ACTIVITIES.includes(id),
    rest = RECOVERY_ACTIVITIES.includes(id);
  return Object.entries(effect).map(([key, value]) => {
    let multiplier = 1;
    if (value > 0 && ACADEMIC_STATS.includes(key)) multiplier = efficiency;
    if (rest && ((key === 'stress' && value < 0) || (['hp', 'focus'].includes(key) && value > 0)))
      multiplier = recovery;
    if (work && key === 'stress' && value > 0) multiplier = pressure;
    return [key, value, multiplier];
  });
}

export function weeklyLoad(week, workCount) {
  const config = balance.weekly,
    season = seasonAt(week);
  return {
    season,
    stress: Math.round((config.baseStress + workCount * config.workStress) * season.pressure),
    hp:
      -Math.round(
        (config.healthCost + workCount * config.workHealth) * (1 + (season.pressure - 1) / 2) * 10,
      ) / 10,
    focus: -config.focusCost,
  };
}

// Stage from the end-of-week condition. Recovery lowers it by at most one stage a week,
// so a burnout lingers for a couple of weeks instead of vanishing after one quiet week.
export function strainStage(stats, extremes = null, previous = 0) {
  const config = balance.fatigue;
  let stage =
    stats.stress >= config.burnoutStress || stats.hp < config.burnoutHealth
      ? 3
      : stats.stress >= config.tiredStress || stats.hp < config.tiredHealth
        ? 2
        : stats.stress >= config.strainStress || stats.hp < config.strainHealth
          ? 1
          : 0;
  if (
    extremes &&
    (extremes.minHealth <= config.minimumHealth || extremes.peakStress >= config.peakStress)
  )
    stage = Math.max(stage, 2);
  return Math.min(MAX_STRAIN, Math.max(stage, (previous ?? 0) - 1));
}

// Compatibility helper for older callers: concentration now follows health minus stress.
export function focusDrift(stats) {
  return Math.round((stats.hp - stats.stress - stats.focus) * 10) / 10;
}

// Allowance arrives on the first game week of each month (weeks 1, 5, 9, …).
export const monthlyAllowance = (week) =>
  week >= 1 && (week - 1) % 4 === 0 ? balance.money.monthlyAllowance : 0;

export function activityLock(state, id) {
  if (id === 'work' && !isVacation(state.week)) return '아르바이트는 방학에만 할 수 있어요.';
  if (id === 'csat_study' && state.flags.csat !== 'prepare')
    return '여름 진학 상담에서 수능 준비를 정해야 열려요.';
  return '';
}

export function csatGrade(score) {
  const index = balance.admissions.csatGrades.findIndex((cut) => score >= cut);
  return index === -1 ? 9 : index + 1;
}
