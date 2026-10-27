import { courses } from './catalog.js';
import { clamp, random } from './random.js';
import { courseAbility } from './course-progress.js';

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
export function assess(state, kind) {
  const term = state.week <= 16 ? 1 : 2;
  return state.courses.map((id) => {
    const ability = courseAbility(state, id);
    const roll = random(state);
    const difficulty = roll < 0.1 ? -12 : roll > 0.9 ? 6 : (roll - 0.5) * 8;
    const condition = (state.stats.hp - 50) * 0.04 - Math.max(0, state.stats.stress - 60) * 0.12;
    const score = Math.round(clamp(46.667 + (ability * 2) / 3 + difficulty + condition));
    const mark = {
      id: `${term}-${id}-${kind}-${state.week}`,
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
export function admissionScore(state) {
  const thesis =
    state.tasks.thesis?.status === 'completed'
      ? 100
      : ((state.tasks.thesis?.progress ?? 0) / 12) * 100;
  const essay = Math.min(100, ((state.tasks.essay?.progress ?? 0) / 8) * 100);
  const recommendation = state.flags.recommender ? state.teachers[state.flags.recommender] : 10;
  const academic =
    (state.stats.math + state.stats.science + state.stats.writing + state.stats.speech) / 4;
  return Math.round(
    (gpa(state) / 4.3) * 30 +
      academic * 0.3 +
      thesis * 0.1 +
      essay * 0.1 +
      recommendation * 0.08 +
      state.interviewScore * 0.12,
  );
}
export function resolveAdmission(state, event) {
  let score;
  if (event.kind === 'creative') {
    const chance = clamp((gpa(state) / 4.3) * 0.8, 0.05, 0.9);
    const accepted = gpa(state) >= 4.3 || random(state) < chance;
    score = Math.round((gpa(state) / 4.3) * 100);
    state.admissions.push({
      name: event.name,
      score,
      accepted,
      week: state.week,
      reason: `1학기 학점 ${gpa(state).toFixed(2)} · 합격 확률 ${gpa(state) >= 4.3 ? 100 : Math.round(chance * 100)}%`,
    });
    return accepted;
  }
  const roll = (random(state) - 0.5) * 12;
  const condition = (state.stats.hp - 50) * 0.04 - Math.max(0, state.stats.stress - 60) * 0.12;
  score =
    event.track === '논술'
      ? state.stats.math * 0.6 + state.stats.writing * 0.4 + roll
      : event.track === '수능'
        ? state.stats.math * 0.45 + state.stats.science * 0.35 + state.stats.writing * 0.2 + roll
        : admissionScore(state) +
          roll +
          (event.externalAwards === false ? 0 : Math.min(state.awards, 2) * 2);
  if (event.track !== '종합') score += condition;
  const threshold =
    event.track === '종합'
      ? { dream: 78, balanced: 62, safe: 48 }[state.flags.target]
      : event.track === '논술'
        ? 75
        : 70;
  const eligible = event.track !== '종합' || state.tasks.application_form?.status === 'completed';
  const accepted = eligible && score >= threshold;
  state.admissions.push({
    name: event.name,
    score: Math.round(clamp(score)),
    accepted,
    week: state.week,
    reason: `${eligible ? `기준 ${threshold}점` : '원서 미제출'} · ${event.track === '종합' ? (event.externalAwards === false ? '외부 수상 미반영(게임 규칙)' : '종합 평가 + 외부대회 가산점(게임 규칙)') : '실력·컨디션·난이도 반영'}`,
  });
  return accepted;
}
