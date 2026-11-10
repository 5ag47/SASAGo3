import { gpa } from './academic-grades.js';
import { departments } from './campaign-state.js';
import { notice } from './notifications.js';
import { events } from './catalog.js';
export function cumulativeGpa(state) {
  return Math.round((gpa(state, 1) * 0.8 + state.campaign.priorGpa * 0.2) * 100) / 100;
}
export function lifeOutcome(state) {
  const s = state.stats;
  if (s.hp < 20 || s.stress > 80) return '병원 · 건강부터 회복하기';
  if (s.reputation < 10) return '감옥 · 위험한 선택의 결과';
  if (s.hp > 80 && s.stress < 20) return '헬창 · 운동이 남긴 체력';
  if (s.reputation > 80) return '인싸 · 함께한 친구들';
  if (s.reputation < 30 || s.stress > 60) return '방구석 · 잠시 쉬어가는 시간';
  return '무난 · 한 해를 마쳤다';
}
export function firstRoundResults(state) {
  const grade = cumulativeGpa(state),
    apps = state.campaign.applications;
  const tier = departments.snu.findIndex((names) => names.includes(apps.snu));
  const cutoff = tier <= 0 ? 4.2 : tier === 1 ? 4 : 3.8;
  state.flags.hannah_first_round_snu = Boolean(
    apps.snu && state.documents && grade >= cutoff && state.stats.reputation > 20,
  );
  state.flags.hannah_first_round_kaist = Boolean(
    apps.kaist && state.documents && grade > 4.05 && state.stats.reputation > 60,
  );
  return `이전 학점과 1학기 성적을 합산한 내신 ${grade.toFixed(2)} / 4.30 · 서울대 ${state.flags.hannah_first_round_snu ? '1차 합격' : '1차 불합격 또는 미지원'} · 카이스트 ${state.flags.hannah_first_round_kaist ? '1차 합격' : '1차 불합격 또는 미지원'}`;
}
export function finalCampaignResults(state) {
  if (state.flags.hannah_final_results) return;
  state.flags.hannah_final_results = true;
  const s = state.stats,
    grade = cumulativeGpa(state),
    apps = state.campaign.applications;
  const tier = departments.snu.findIndex((names) => names.includes(apps.snu));
  const snuCutoff = tier <= 0 ? 4.2 : tier === 1 ? 4.0 : 3.8;
  const specifications = [
    [
      'top_interview',
      '서울대',
      apps.snu,
      (state.flags.hannah_first_round_snu ?? grade >= snuCutoff) &&
        s.hp > 10 &&
        s.reputation > 20 &&
        s.math > 70 &&
        (state.flags.story_interview_snu_score ?? state.interviewScore) >= 60,
      `학점 ${snuCutoff} · 수학 70 · 건강 10 · 평판 20 · 면접 60 초과/이상`,
    ],
    [
      'kaist_postech',
      '카이스트',
      apps.kaist,
      (state.flags.hannah_first_round_kaist ?? grade > 4.05) &&
        s.hp > 20 &&
        s.reputation > 60 &&
        s.math > 60 &&
        s.science > 40 &&
        (state.flags.story_interview_kaist_score ?? state.interviewScore) >= 60,
      '학점 4.05 · 건강 20 · 평판 60 · 수학 60 · 과학 40 초과, 면접 60 이상',
    ],
    [
      'yonsei',
      '연세대',
      apps.yonsei,
      s.math > 70 && state.flags.ai_glasses_caught !== true,
      '수학 70 초과 · 부정행위 없음',
    ],
  ];
  for (const [id, school, department, passes, reason] of specifications) {
    const event = events[id];
    const previous = state.admissions.find((a) => a.profile === id || a.name === event.name);
    state.admissions = state.admissions.filter((a) => !(a.profile === id || a.name === event.name));
    state.admissions.push({
      ...previous,
      name: event.name,
      profile: id,
      school,
      department: department ?? null,
      applied: Boolean(department),
      accepted: Boolean(department && passes && state.documents),
      score: previous?.score ?? Math.round(s.math),
      week: 37,
      reason: `${department ?? '미지원'} · ${reason} · 서류 제출 ${state.documents ? '완료' : '미완료'} (게임 규칙)`,
    });
  }
  const mit =
    s.reputation > 80 &&
    s.math > 70 &&
    grade > 4.2 &&
    state.money >= state.campaign.allowanceReceived * 0.9;
  state.admissions.push({
    name: 'MIT 특별 엔딩',
    score: Math.round((grade / 4.3) * 100),
    accepted: mit,
    week: 37,
    reason: '평판 80 · 수학 70 · 학점 4.2 초과, 받은 용돈 90% 이상 보유',
  });
  const middle = s.reputation > 20 && s.math > 50 && grade > 3.4;
  state.admissions.push({
    name: '중간대학',
    score: Math.round((grade / 4.3) * 100),
    accepted: middle,
    week: 37,
    reason: '평판 20 · 수학 50 · 학점 3.4 초과',
  });
  notice(state, '수고하셨습니다', `입시 결과가 도착했습니다. ${lifeOutcome(state)}`, 'event');
}
