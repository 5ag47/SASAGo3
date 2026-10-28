import { courses } from './catalog.js';
import { clamp, random } from './random.js';
import { courseAbility } from './course-progress.js';
import { balance } from './balance.js';
export const letterGrade = (score) =>
  score >= 97
    ? ['A+', 4.3]
    : score >= 90
      ? ['A', 4]
      : score >= 85
        ? ['B+', 3.3]
        : score >= 80
          ? ['B', 3]
          : score >= 75
            ? ['C+', 2.3]
            : score >= 70
              ? ['C', 2]
              : score >= 60
                ? ['D', 1]
                : ['F', 0];
export function courseGrades(state, term = 1) {
  const ids = [...new Set(state.assessments.filter((a) => a.term === term).map((a) => a.course))];
  return ids.map((id) => {
    const course = courses[id];
    const marks = state.assessments.filter((a) => a.course === id && a.term === term);
    let total = 0;
    let weight = 0;
    for (const [kind, w] of Object.entries(course.assessments)) {
      const scores = marks.filter((m) => m.kind === kind);
      if (scores.length) {
        total += (scores.reduce((sum, a) => sum + a.score, 0) / scores.length) * w;
        weight += w;
      }
    }
    const score = Math.round((total / (weight || 1)) * 10) / 10;
    const [letter, point] = letterGrade(score);
    return { id, ...course, marks, score, letter, point, provisional: weight < 0.99 };
  });
}
export function gpa(state, term = 1) {
  const grades = courseGrades(state, term);
  const credits = grades.reduce((sum, c) => sum + c.credits, 0);
  return credits
    ? Math.round((grades.reduce((sum, c) => sum + c.point * c.credits, 0) / credits) * 100) / 100
    : 0;
}
export function examBaseScore(ability, week = balance.exams.reliefEnds) {
  const config = balance.exams;
  const earlyCourse = config.introRelief * Math.max(0, 1 - week / config.reliefEnds);
  return config.base + earlyCourse + ability * config.abilityWeight;
}
export function assess(state, kind, sourceId) {
  const term = state.week <= 16 ? 1 : 2;
  return state.courses.map((id) => {
    const ability = courseAbility(state, id);
    const roll = random(state);
    const config = balance.exams;
    const difficulty =
      roll < config.hardChance
        ? config.hardPenalty
        : roll > 1 - config.hardChance
          ? config.easyBonus
          : (roll - 0.5) * config.normalSpread;
    const condition = (state.stats.hp - 50) * 0.04 - Math.max(0, state.stats.stress - 60) * 0.12;
    const score = Math.round(clamp(examBaseScore(ability, state.week) + difficulty + condition));
    const mark = {
      id: `${term}-${id}-${kind}-${state.week}${sourceId ? '-' + sourceId : ''}`,
      course: id,
      kind,
      score,
      term,
      week: state.week,
      difficulty: Math.round(difficulty),
    };
    state.assessments.push(mark);
    return `${courses[id].short} ${score}점${difficulty <= -10 ? ' (고난도)' : difficulty >= 5 ? ' (쉬운 출제)' : ''}`;
  });
}
