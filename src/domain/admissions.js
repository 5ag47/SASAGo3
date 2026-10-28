import { clamp, random } from './random.js';
import { balance } from './balance.js';
import { gpa } from './academic-grades.js';
import { admissionDefinitions, ADMISSION_DIRECTIONS } from './school-record.js';
import { currentDocumentFactors } from './admission-documents.js';

export const ADMISSION_FACTORS = Object.freeze({
  gpa: '학점',
  record: '학교생활기록',
  fit: '전공 연계',
  essay: '자기소개서',
  recommendation: '추천서',
  interview: '면접',
});
export function admissionThreshold(event) {
  const config = balance.admissions;
  return event.track === '종합'
    ? (config.thresholds[event.profile] ?? config.comprehensiveDefault)
    : event.track === '논술'
      ? config.essayThreshold
      : config.csatThreshold;
}
export function admissionProjection(state, profile = 'korea_university') {
  const route = admissionDefinitions[profile] ?? admissionDefinitions.korea_university;
  const factors = {
    ...(state.documents?.factors ?? currentDocumentFactors(state)),
    interview: state.interviewScore,
  };
  const contributions = Object.entries(route.weights).map(([id, weight]) => ({
    id,
    name: ADMISSION_FACTORS[id],
    value: Math.round(factors[id] * 10) / 10,
    weight,
    points: factors[id] * weight,
  }));
  const baseScore = contributions.reduce((sum, part) => sum + part.points, 0);
  const awardBonus = route.externalAwards ? Math.min(state.awards, 2) * 2 : 0;
  const direction = state.documents?.direction ?? state.flags.target;
  return {
    profile,
    score: Math.round(clamp(baseScore + awardBonus)),
    baseScore,
    awardBonus,
    contributions,
    applied: ADMISSION_DIRECTIONS[direction].routes.includes(profile),
    submitted: Boolean(state.documents),
  };
}
export const admissionScore = (state, profile) => admissionProjection(state, profile).score;
export function resolveAdmission(state, event) {
  if (event.kind === 'creative') {
    const chance = clamp((gpa(state) / 4.3) * 0.8, 0.05, 0.9);
    const accepted = gpa(state) >= 4.3 || random(state) < chance;
    state.admissions.push({
      name: event.name,
      score: Math.round((gpa(state) / 4.3) * 100),
      accepted,
      week: state.week,
      reason: `1학기 학점 ${gpa(state).toFixed(2)} · 합격 확률 ${gpa(state) >= 4.3 ? 100 : Math.round(chance * 100)}%`,
    });
    return accepted;
  }
  const threshold = admissionThreshold(event);
  if (event.track === '종합') {
    const projection = admissionProjection(state, event.profile);
    const score = Math.round(
      clamp(
        projection.baseScore +
          (event.externalAwards === false ? 0 : projection.awardBonus) +
          (projection.applied && projection.submitted ? (random(state) - 0.5) * 12 : 0),
      ),
    );
    const accepted = projection.applied && projection.submitted && score >= threshold;
    state.admissions.push({
      name: event.name,
      profile: event.profile,
      score,
      accepted,
      applied: projection.applied,
      week: state.week,
      evaluation: projection.contributions,
      reason: !projection.applied
        ? '지원하지 않은 전형입니다.'
        : !projection.submitted
          ? '서류 준비 또는 지원 방향 선택 미완료 · 원서 미제출'
          : `기준 ${threshold}점 · 학점·학교생활기록 중심 평가${event.externalAwards === false ? ' · 외부 수상 미반영' : ''}`,
    });
    return accepted;
  }
  const roll = (random(state) - 0.5) * 12;
  const condition = (state.stats.hp - 50) * 0.04 - Math.max(0, state.stats.stress - 60) * 0.12;
  const ability =
    event.track === '논술'
      ? state.stats.math * 0.6 + state.stats.writing * 0.4
      : state.stats.math * 0.45 + state.stats.science * 0.35 + state.stats.writing * 0.2;
  const score = Math.round(clamp(ability + roll + condition)),
    accepted = score >= threshold;
  state.admissions.push({
    name: event.name,
    score,
    accepted,
    week: state.week,
    reason: `기준 ${threshold}점 · 실력·컨디션·난이도 반영`,
  });
  return accepted;
}
