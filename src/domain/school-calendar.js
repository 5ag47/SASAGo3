export const ASSESSMENT_SCHEDULE = [
  { kind: 'quiz', name: '과목 퀴즈', weeks: [4, 6, 12, 14, 28, 32, 36] },
  { kind: 'midterm', name: '중간고사', weeks: [7, 31] },
  { kind: 'final', name: '기말고사', weeks: [16, 36] },
];
export const PROJECT_WEEKS = [2, 10, 26, 30];
export const CLEANING_WEEKS = [4, 8, 12, 16, 28, 32, 36, 40];
export const assessmentsAt = (week) =>
  ASSESSMENT_SCHEDULE.filter((item) => item.weeks.includes(week));
export function nextAssessments(week) {
  const upcoming = ASSESSMENT_SCHEDULE.flatMap((item) =>
    item.weeks.filter((w) => w >= week).map((w) => ({ ...item, week: w })),
  );
  const next = Math.min(...upcoming.map((item) => item.week));
  return upcoming.filter((item) => item.week === next);
}
