import { ACTIVITIES, SUNDAY_EFFECT } from '../data/activities.js';
import { SKILL_KEYS, STATS } from '../data/stats.js';
import { MAX_HISTORY, TASKS } from '../game.js';

export const STRESS_LIMIT = 70;
export const HP_LIMIT = 30;
export const HP_WARNING = 20;
export const REPEAT_FREE_DAYS = 2;
export const REPEAT_DECAY = 0.85;

const clamp = value => Math.min(100, Math.max(0, value));

// 집중력이 높을수록 효율이 오르고, 스트레스가 높거나 건강이 낮으면 20% 깎인다.
export function studyEfficiency(stats) {
  const stressed = stats.stress >= STRESS_LIMIT;
  const tired = stats.hp < HP_LIMIT;
  let value = 1 + (stats.focus - 50) / 200;
  if (stressed) value *= 0.8;
  if (tired) value *= 0.8;
  return { value, stressed, tired };
}

function isStudyGain(key, amount) {
  return SKILL_KEYS.includes(key) && amount > 0;
}

export function resolveWeek(game) {
  const stats = { ...game.stats };
  const counts = {};
  let stressedDays = 0;
  let tiredDays = 0;

  for (const id of game.plan) {
    const { effect } = ACTIVITIES[id];
    const { value, stressed, tired } = studyEfficiency(stats);
    const done = counts[id] ?? 0;
    const repeat = done >= REPEAT_FREE_DAYS ? REPEAT_DECAY ** (done - REPEAT_FREE_DAYS + 1) : 1;
    let studied = false;

    for (const [key, amount] of Object.entries(effect)) {
      const gained = isStudyGain(key, amount);
      stats[key] = clamp(stats[key] + (gained ? amount * value * repeat : amount));
      studied ||= gained;
    }
    counts[id] = done + 1;
    if (studied && stressed) stressedDays += 1;
    if (studied && tired) tiredDays += 1;
  }

  for (const [key, amount] of Object.entries(SUNDAY_EFFECT)) {
    stats[key] = clamp(stats[key] + amount);
  }

  const after = {};
  const delta = {};
  for (const { key } of STATS) {
    after[key] = Math.round(stats[key]);
    delta[key] = after[key] - game.stats[key];
  }

  const notes = [];
  if (stressedDays > 0) notes.push(`스트레스가 ${STRESS_LIMIT} 이상이어서 ${stressedDays}일 동안 학습 효율이 떨어졌습니다.`);
  if (tiredDays > 0) notes.push(`건강이 ${HP_LIMIT} 미만이어서 ${tiredDays}일 동안 학습 효율이 떨어졌습니다.`);
  for (const [id, count] of Object.entries(counts)) {
    const studies = Object.entries(ACTIVITIES[id].effect).some(([key, amount]) => isStudyGain(key, amount));
    if (studies && count > REPEAT_FREE_DAYS) notes.push(`${ACTIVITIES[id].label}을(를) ${count}일 반복해 증가량이 줄었습니다.`);
  }
  if (after.hp <= HP_WARNING) notes.push(`건강이 ${HP_WARNING} 이하입니다. 휴식이 필요합니다.`);

  return { week: game.week, plan: [...game.plan], after, delta, notes };
}

export function advanceWeek(game) {
  const { after, ...entry } = resolveWeek(game);
  return {
    ...game,
    week: game.week + 1,
    stats: after,
    tasks: TASKS.map(() => false),
    history: [...game.history, entry].slice(-MAX_HISTORY),
  };
}
