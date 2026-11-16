import activities from '../../data/activities.json' with { type: 'json' };
import departments from '../../data/departments.json' with { type: 'json' };
export { departments };
export const emptyCampaign = () => ({
  nights: Array.from({ length: 7 }, () => ({ activity: 'sleep', target: null })),
  playerId: 'SASA-LOCAL',
  lateRisk: 0,
  relationship: 'single',
  partnerSince: null,
  missedDates: 0,
  dateStreak: 0,
  totalDates: 0,
  rank: null,
  priorGpa: 3.5,
  snuMinimumTier: 0,
  applications: {},
  quiz: null,
  presets: {},
  allowanceReceived: 0,
});
export function validCampaign(c, courseIds) {
  return Boolean(
    c &&
    typeof c.playerId === 'string' &&
    c.playerId.length <= 40 &&
    Array.isArray(c.nights) &&
    c.nights.length === 7 &&
    c.nights.every(
      (s) =>
        s &&
        ((s.activity === 'sleep' && s.target === null) ||
          (s.activity === 'study' && courseIds.includes(s.target))),
    ) &&
    Number.isFinite(c.lateRisk) &&
    c.lateRisk >= 0 &&
    c.lateRisk <= 1 &&
    ['single', 'dating', 'ended'].includes(c.relationship) &&
    (c.partnerSince === null ||
      (Number.isInteger(c.partnerSince) && c.partnerSince >= 0 && c.partnerSince <= 40)) &&
    ['missedDates', 'dateStreak', 'totalDates', 'snuMinimumTier', 'allowanceReceived'].every(
      (k) => Number.isInteger(c[k]) && c[k] >= 0,
    ) &&
    c.snuMinimumTier <= 4 &&
    c.missedDates <= 41 &&
    c.totalDates <= 41 &&
    c.dateStreak <= 41 &&
    Number.isFinite(c.priorGpa) &&
    c.priorGpa >= 0 &&
    c.priorGpa <= 4.3 &&
    (c.rank === null || (Number.isInteger(c.rank) && c.rank >= 1 && c.rank <= 90)) &&
    c.applications &&
    !Array.isArray(c.applications) &&
    Object.entries(c.applications).every(
      ([school, name]) =>
        Object.hasOwn(departments, school) && departments[school].flat().includes(name),
    ) &&
    (c.quiz === null ||
      (Array.isArray(c.quiz.courses) &&
        c.quiz.courses.every((id) => courseIds.includes(id)) &&
        Number.isInteger(c.quiz.week) &&
        c.quiz.week >= 0 &&
        c.quiz.week <= 40 &&
        typeof c.quiz.sourceId === 'string')) &&
    c.presets &&
    !Array.isArray(c.presets) &&
    Object.keys(c.presets).length <= 3 &&
    Object.keys(c.presets).every((k) => ['0', '1', '2'].includes(k)) &&
    Object.values(c.presets).every(
      (p) =>
        p &&
        typeof p.name === 'string' &&
        p.name.length > 0 &&
        p.name.length <= 16 &&
        Array.isArray(p.plan) &&
        p.plan.length === 21 &&
        Array.isArray(p.nights) &&
        p.nights.length === 7 &&
        p.plan.every(
          (s) =>
            s &&
            Object.hasOwn(activities, s.activity) &&
            (s.target === null || (typeof s.target === 'string' && s.target.length < 100)),
        ) &&
        p.nights.every(
          (s) =>
            s &&
            ((s.activity === 'sleep' && s.target === null) ||
              (s.activity === 'study' && typeof s.target === 'string' && s.target.length < 100)),
        ),
    ),
  );
}
