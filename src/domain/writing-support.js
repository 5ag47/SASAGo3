import definitions from '../../data/admissions.json' with { type: 'json' };
export const teacherSupport = (state) => Math.max(...Object.values(state.teachers));
export function essayWorkAmount(state) {
  const config = definitions.essay_support;
  const reputation = Math.max(
    0,
    Math.min(1, (state.stats.reputation - config.reputationStart) / config.reputationSpan),
  );
  return Math.min(
    config.progressCap,
    1 +
      config.reputationBonus * reputation +
      (config.teacherProgressBonus * teacherSupport(state)) / 100,
  );
}
