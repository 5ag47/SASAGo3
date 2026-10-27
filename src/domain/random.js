import { positiveGrowth } from './balance.js';
// Seed lives in the save. No Math.random inside game rules: reports can replay the same run.
export function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export function applyEffects(state, effects = {}, multiplier = 1, { growth = true } = {}) {
  for (const [key, value] of Object.entries(effects)) {
    if (Object.hasOwn(state.stats, key))
      state.stats[key] =
        Math.round(
          clamp(
            state.stats[key] +
              value *
                multiplier *
                (growth && value > 0 ? positiveGrowth(key, state.stats[key]) : 1),
          ) * 10,
        ) / 10;
  }
  if (state.weekRun?.minHealth !== undefined) {
    state.weekRun.minHealth = Math.min(state.weekRun.minHealth, state.stats.hp);
    state.weekRun.peakStress = Math.max(state.weekRun.peakStress, state.stats.stress);
  }
}
