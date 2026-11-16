import { calendarTiming } from './calendar-date.js';
export const ASSESSMENT_SCHEDULE = [
  { kind: 'quiz', name: '과목 퀴즈', weeks: [4, 6, 12, 14, 28, 32, 36] },
  { kind: 'midterm', name: '중간고사', weeks: [7, 31] },
  { kind: 'final', name: '기말고사', weeks: [16, 36] },
];
export const PROJECT_WEEKS = [2, 10, 26, 30];
export const CLEANING_WEEKS = [4, 8, 12, 16, 28, 32, 36, 40];
export function assessmentDates() {
  return ASSESSMENT_SCHEDULE.flatMap((item) =>
    item.weeks.map((original) => {
      const sourceId = 'exam:' + item.kind + ':' + original;
      return { ...item, sourceId, ...calendarTiming(sourceId, original, 6) };
    }),
  );
}
export const assessmentsAt = (week) => assessmentDates().filter((item) => item.week === week);
export const assessmentsOnDay = (week, day) =>
  assessmentDates().filter((item) => item.week === week && item.day === day);
export function nextAssessments(week) {
  const upcoming = assessmentDates().filter((item) => item.week >= week),
    next = Math.min(...upcoming.map((item) => item.week));
  return upcoming.filter((item) => item.week === next);
}
