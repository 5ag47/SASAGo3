// Temporary balance until the project plan's sleep rules can be read.
// Eight hours preserves the previous balance; shorter sleep adds fatigue.
export const SLEEP_OPTIONS = [6, 7, 8];
export const DEFAULT_SLEEP = 8;
export function sleepEffect(hours) {
  const missed = DEFAULT_SLEEP - hours;
  return { hp: -2 * missed, focus: -missed, stress: missed };
}
