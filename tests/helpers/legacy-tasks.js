// Explicit fixtures retain the generic module/transport regression coverage.
// Live game content uses time-based assignments as of the 1117 planner revision.
export function withLegacyPractice(state) {
  state.tasks['practice-report'].module = { id: 'pattern_v2', params: {} };
  return state;
}
export const legacyThesisModule = {
  id: 'pattern_v2',
  params: {
    earlyWeeks: 4,
    earlyQuality: 90,
    earlyEffect: { science: 0.75, focus: 0.25 },
    overloadAfter: 2,
    overloadHealth: 0.75,
    overloadStress: 1.5,
  },
};
