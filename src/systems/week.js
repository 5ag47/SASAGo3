import { ACTIVITIES, DAYS } from '../data/activities.js';
import { SKILL_KEYS, STATS, formatEffect } from '../data/stats.js';
import { MAX_HISTORY } from '../game.js';
import { storyForWeek, SEMESTER_WEEKS } from '../data/story.js';
import { sleepEffect } from '../data/sleep.js';
export const STRESS_LIMIT = 70;
export const HP_LIMIT = 30;
export const HP_WARNING = 20;
export const REPEAT_FREE_DAYS = 2;
export const REPEAT_DECAY = 0.85;
const clamp = value => Math.min(100, Math.max(0, value));
export function studyEfficiency(stats) {
  const stressed = stats.stress >= STRESS_LIMIT;
  const tired = stats.hp < HP_LIMIT;
  let value = 0.6 + (stats.hp + stats.focus) / 250;
  if (stressed) value *= 0.8;
  if (tired) value *= 0.8;
  return {
    value,
    stressed,
    tired
  };
}
function isStudyGain(key, amount) {
  return SKILL_KEYS.includes(key) && amount > 0;
}
export function resolveWeek(game) {
  const stats = {
      ...game.stats
    },
    counts = {},
    daily = [];
  let stressedDays = 0,
    tiredDays = 0;
  for (const [index, id] of game.plan.entries()) {
    const { effect } = ACTIVITIES[id];
    const sleepHours = game.sleepPlan[index];
    const dayBefore = { ...stats };
    // Apply fatigue before today's learning calculation.
    for (const [key, amount] of Object.entries(sleepEffect(sleepHours))) {
      stats[key] = clamp(stats[key] + amount);
    }
    const {
      value,
      stressed,
      tired
    } = studyEfficiency(stats);
    const done = counts[id] ?? 0;
    const repeat = done >= REPEAT_FREE_DAYS ? REPEAT_DECAY ** (done - REPEAT_FREE_DAYS + 1) : 1;
    let studied = false;
    const changes = {};
    for (const [key, amount] of Object.entries(effect)) {
      const gained = isStudyGain(key, amount);
      const before = stats[key];
      stats[key] = clamp(before + (gained ? amount * value * repeat : amount));
      changes[key] = Math.round(stats[key]) - Math.round(before);
      studied ||= gained;
    }
    for (const { key } of STATS) {
      changes[key] = Math.round(stats[key]) - Math.round(dayBefore[key]);
    }
    counts[id] = done + 1;
    if (studied && stressed) stressedDays++;
    if (studied && tired) tiredDays++;
    daily.push({
      day: DAYS[index],
      sleepHours,
      label: id === 'science' ? game.major : ACTIVITIES[id].label,
      summary: formatEffect(changes),
      delta: changes,
      efficiency: Math.round(value * repeat * 100)
    });
  }
  const after = {},
    delta = {};
  for (const {
    key
  } of STATS) {
    after[key] = Math.round(stats[key]);
    delta[key] = after[key] - game.stats[key];
  }
  const notes = [];
  if (stressedDays) notes.push(`스트레스가 ${STRESS_LIMIT} 이상이어서 ${stressedDays}일 동안 학습 효율이 떨어졌습니다.`);
  if (tiredDays) notes.push(`신체가 ${HP_LIMIT} 미만이어서 ${tiredDays}일 동안 학습 효율이 떨어졌습니다.`);
  for (const [id, count] of Object.entries(counts)) {
    if (Object.entries(ACTIVITIES[id].effect).some(([key, amount]) => isStudyGain(key, amount)) && count > REPEAT_FREE_DAYS) notes.push(`${id === 'science' ? game.major : ACTIVITIES[id].label}을(를) ${count}일 반복해 증가량이 줄었습니다.`);
  }
  if (after.hp <= HP_WARNING) notes.push('신체가 20 이하입니다. 휴식이 필요합니다.');
  return {
    week: game.week,
    plan: [...game.plan],
    sleepPlan: [...game.sleepPlan],
    major: game.major,
    after,
    delta,
    notes,
    daily
  };
}
export function weeklyGoals(plan) {
  return [plan.filter(id => id === 'math').length >= 2, plan.some(id => ['rest', 'exercise'].includes(id))];
}
export function advanceWeek(game, choiceIndex = 0) {
  if (game.ended) return game;
  const story = storyForWeek(game.week),
    choice = story.choices[choiceIndex];
  if (!choice) return game;
  const {
    after,
    ...entry
  } = resolveWeek(game);
  for (const [key, amount] of Object.entries(choice.effect)) after[key] = clamp(after[key] + amount);
  const reward = 0;
  const allowance = 2000;
  const bonus = Math.max(0, Math.floor((after.reputation - 40) / 10)) * 500;
  const fine = Math.min(game.money + allowance + reward + bonus, choice.fine || 0);
  const net = allowance + reward + bonus - fine;
  for (const {
    key
  } of STATS) entry.delta[key] = after[key] - game.stats[key];
  const assessment = story.assessment ? Math.round(clamp((after.math + after.science) / 2 * Math.min(1.1, studyEfficiency(after).value))) : null;
  entry.before = {
    ...game.stats
  };
  entry.after = {
    ...after
  };
  entry.economy = {
    allowance,
    reward,
    bonus,
    fine,
    net
  };
  entry.assessment = assessment;
  if (assessment !== null) entry.notes.push(`모의 평가 ${assessment}점 / 100점 (수학·주요선택·현재 능률 반영)`);
  return {
    ...game,
    week: game.week + 1,
    stats: after,
    money: game.money + net,
    tasks: [false, false],
    ended: game.week + 1 >= SEMESTER_WEEKS,
    history: [...game.history, entry].slice(-MAX_HISTORY)
  };
}
