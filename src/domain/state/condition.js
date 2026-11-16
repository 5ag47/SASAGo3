// Concentration is derived, including negative values when stress exceeds health.
export const concentration = (stats) => Math.round((stats.hp - stats.stress) * 10) / 10;
export function syncCondition(state) {
  state.stats.focus = concentration(state.stats);
  return state;
}
