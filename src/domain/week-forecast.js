// Display estimate of the weekend condition for the current plan. It runs no random roll,
// task mini-game, event or exam; only the server's weekly run commits results.
import { activities, GROUPS } from './catalog.js';
import { applyEffects } from './random.js';
import { learningEfficiency, effectivePlan } from './week.js';
import {
  activityLock,
  focusDrift,
  recoveryFactor,
  recoveryOrdinal,
  RECOVERY_ACTIVITIES,
  seasonAt,
  slotEffectParts,
  strainStage,
  weeklyLoad,
  WORK_ACTIVITIES,
} from './senior-year.js';

export function weekForecast(state) {
  const next = { stats: { ...state.stats }, fatigue: state.fatigue };
  const season = seasonAt(state.week),
    efficiency = learningEfficiency(state);
  const counts = {};
  let workCount = 0,
    minHealth = next.stats.hp,
    peakStress = next.stats.stress,
    money = state.money;
  for (const slot of effectivePlan(state)) {
    let id = slot.activity;
    if (activityLock(state, id) || (activities[id].cost ?? 0) > money) id = 'sleep';
    money -= activities[id].cost ?? 0;
    counts[id] = (counts[id] ?? 0) + 1;
    if (WORK_ACTIVITIES.includes(id)) workCount++;
    const recovery = RECOVERY_ACTIVITIES.includes(id) ? recoveryFactor(recoveryOrdinal(counts)) : 1;
    for (const [key, value, multiplier] of slotEffectParts(id, activities[id].effect, {
      efficiency,
      recovery,
      pressure: season.pressure,
    }))
      applyEffects(next, { [key]: value }, multiplier);
    if (id === 'study_group' && state.group) applyEffects(next, GROUPS[state.group].effect);
    minHealth = Math.min(minHealth, next.stats.hp);
    peakStress = Math.max(peakStress, next.stats.stress);
  }
  const load = weeklyLoad(state.week, workCount);
  applyEffects(next, { stress: load.stress, hp: load.hp, focus: load.focus });
  const stage = strainStage(next.stats, { minHealth, peakStress }, state.fatigue);
  applyEffects(next, { focus: focusDrift(next.stats, stage) });
  return {
    season,
    workCount,
    stage,
    hp: Math.round(next.stats.hp),
    stress: Math.round(next.stats.stress),
    focus: Math.round(next.stats.focus),
  };
}
