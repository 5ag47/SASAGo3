import { courses, events, period } from './catalog.js';
import { addTask } from './tasks.js';
import { notice } from './notifications.js';
import { applyEffects, random } from './random.js';
import { courseGrades, examBaseScore } from './academic-grades.js';
import { courseAbility, learnCourse } from './course-progress.js';
import { assessmentsAt } from './school-calendar.js';
import { departments } from './campaign-state.js';
export function schoolRank(state) {
  const grades = courseGrades(state, 1);
  const credits = grades.reduce((sum, c) => sum + c.credits, 0);
  const score = credits
    ? grades.reduce((sum, c) => sum + c.score * c.credits, 0) / credits
    : (state.campaign.priorGpa / 4.3) * 100;
  return Math.max(1, Math.min(90, Math.round(91 - score * 0.9)));
}
export function queueStory(state, id) {
  if (!events[id] || state.pending.includes(id) || Object.hasOwn(state.choices, id)) return;
  state.pending.push(id);
  notice(state, events[id].name, events[id].description, 'choice');
}
const timeTask = (state, id, name, target = 1, reward = {}, extra = {}) =>
  addTask(state, id, {
    name,
    description: `자습 ${target}칸을 배정해 진행하세요.`,
    target,
    deadline: state.week,
    module: { id: 'time_v1', params: {} },
    reward,
    penalty: { reputation: -2, stress: 3 },
    ...extra,
  });
export function recurringCampaignTasks(state) {
  const w = state.week;
  if (!w || w > 40) return;
  const { month, weekOfMonth } = period(w);
  if (assessmentsAt(w).some((e) => e.kind === 'quiz'))
    timeTask(state, `quiz-prep-${w}`, '과목 퀴즈 공부', 1, { math: 1 }, { special: 'quiz_prep' });
  timeTask(state, `weekly-clean-${w}`, '방 청소', 1, { stress: -2 });
  if (state.group === 'focused' || (state.group === 'friends' && weekOfMonth === 2))
    timeTask(
      state,
      `study-activity-${w}`,
      '스터디활동',
      1,
      { math: state.group === 'focused' ? 5 : 3 },
      { special: 'study_activity' },
    );
  if (
    (state.group === 'friends' && weekOfMonth === 4) ||
    (state.group === 'playful' && w % 2 === 0)
  )
    queueStory(state, `story_dinner_${w}`);
  if (month === 4 && w % 2 === 1)
    timeTask(state, `home-academy-${w}`, '귀가주 학원', 2, { math: 3 });
  if (month === 5 || (month >= 9 && month <= 11)) {
    timeTask(
      state,
      `mock-${w}`,
      weekOfMonth === 4 ? '모의면접 면접관 · 문제 만들기' : '모의면접',
      1,
      { speech: 3 },
    );
    if (w !== 27)
      for (let i = 1; i <= 3; i++)
        timeTask(state, `union-${w}-${i}`, `연합스터디 ${i}`, 1, { math: 2 });
  }
  if (state.flags.academy && month >= 9 && month <= 11)
    timeTask(
      state,
      `haenaem-autumn-${w}`,
      '해냄 수학 문제풀기',
      2,
      { math: 4 },
      { penalty: { math: -2, reputation: -2, stress: 2 } },
    );
  if (state.campaign.relationship === 'dating') {
    timeTask(state, `date-${w}`, '데이트', 1, { hp: 5, stress: -5 }, { special: 'date' });
    if (w === state.campaign.partnerSince + 14)
      timeTask(state, `anniversary-${w}`, '100일 데이트', 2, { hp: 10, reputation: 3 });
    if (w === 30) timeTask(state, `partner-birthday-${w}`, '연인의 생일', 1, { reputation: 5 });
  }
  if (w === 17) {
    state.campaign.rank = schoolRank(state);
    notice(
      state,
      '1학기 상담 · 석차',
      `90명 중 ${state.campaign.rank}등. 퀴즈·시험·수행의 학점 가중 점수로 계산한 게임 내 석차입니다. 자소서를 구상해야 합니다.`,
      'event',
    );
  }
  if (w === 25) {
    state.campaign.rank ??= schoolRank(state);
    timeTask(
      state,
      'essay-draft',
      '자소서 초안 작성하기',
      2,
      { writing: 2 },
      { deadline: 28, special: 'essay_draft' },
    );
  }
  if (weekOfMonth === 1)
    notice(
      state,
      `${month}월 일정`,
      Object.values(events)
        .filter(
          (e) =>
            e.week >= w &&
            e.week < w + 4 &&
            !e.manual &&
            (!e.course || state.courses.includes(e.course)),
        )
        .slice(0, 7)
        .map((e) => e.name)
        .join(' · ') + ' · 이번 달 목표: 수학 능력 5 높이기, 건강 40 이상 유지.',
      'info',
    );
}
export function departmentOptions(state, school) {
  const none = {
    id: 'none',
    label: '이번에는 지원하지 않는다',
    detail: '원서를 제출하지 않습니다.',
  };
  if (school !== 'snu')
    return [
      ...departments[school].map((name, i) => ({
        id: String(i),
        label: name,
        detail: '석차 제한 없음',
      })),
      none,
    ];
  const rank = state.campaign.rank ?? schoolRank(state);
  const tier = Math.max(Math.floor((rank - 1) / 20), state.campaign.snuMinimumTier);
  return [
    ...departments.snu.flatMap((names, t) =>
      names.map((name, i) => ({
        id: `${t}:${i}`,
        label: name,
        detail: `게임 내 석차 1~${(t + 1) * 20}위`,
        locked: t < tier,
        requirement: `현재 ${rank}위 · 지원 범위 밖`,
      })),
    ),
    none,
  ];
}
export function applyCampaignChoice(state, id, selected) {
  if (id.startsWith('story_apply_')) {
    const school = id.slice(12);
    if (selected === 'none') return false;
    if (school === 'snu') {
      const [tier, index] = selected.split(':').map(Number),
        rank = state.campaign.rank ?? schoolRank(state);
      const natural = Math.floor((rank - 1) / 20);
      if (tier === natural && (rank - 1) % 20 >= 15 && state.campaign.snuMinimumTier <= tier) {
        state.campaign.snuMinimumTier = Math.min(4, tier + 1);
        notice(
          state,
          '지원 학과 재선택',
          `상위권 동기들이 학과를 내려 지원하여 ${departments.snu[tier][index]}에서 밀려났습니다. 다음 단계 학과부터 다시 선택해 주세요.`,
          'event',
        );
        return true;
      }
      state.campaign.applications.snu = departments.snu[tier][index];
    } else state.campaign.applications[school] = departments[school][Number(selected)];
    notice(
      state,
      '학과 원서 접수',
      state.campaign.applications[school] + ' 지원을 기록했습니다. 자소서·원서 과제도 마쳐 주세요.',
      'event',
    );
    finishChoice(state, id, selected);
    return true;
  }
  if (id.startsWith('story_quiz_crisis_')) {
    const quiz = state.campaign.quiz;
    if (quiz)
      for (const course of quiz.courses)
        state.assessments.push({
          id: `story-quiz-${quiz.week}-${course}-${quiz.sourceId}`,
          course,
          kind: 'quiz',
          score: selected === 'honest' ? 100 : 0,
          term: quiz.week <= 16 ? 1 : 2,
          week: quiz.week,
        });
    if (selected === 'cheat') {
      applyEffects(state, { reputation: -1000000, stress: 20 });
      notice(
        state,
        '컨닝하다 걸렸습니다',
        '평판 ▼1,000,000 · 평판 하한 0 적용. 퀴즈 0점.',
        'event',
      );
    } else notice(state, '끝까지 풀어냈다', '포기하지 않고 풀어 퀴즈 100점을 받았습니다.', 'event');
    state.campaign.quiz = null;
    finishChoice(state, id, selected);
    return true;
  }
  return false;
}
function finishChoice(state, id, selected) {
  state.choices[id] = selected;
  state.pending = state.pending.filter((k) => k !== id);
}
export function campaignChoiceEffects(state, id, option) {
  if (option.chanceResult) {
    const r = option.chanceResult,
      success = random(state) < r.chance;
    applyEffects(state, success ? r.success : r.failure);
    if (id === 'story_ai_glasses') state.flags.ai_glasses_caught = !success;
    if (success) {
      state.money += r.income ?? 0;
      if (r.award) state.awards++;
    }
    if (!success && id === 'story_smile')
      state.campaign.lateRisk = Math.min(1, state.campaign.lateRisk + 0.5);
    notice(
      state,
      events[id].name,
      success
        ? '성공! 선택의 결과가 반영되었습니다.'
        : '실패. 이번 선택의 결과를 받아들이고 다음 일정을 준비합니다.',
      'event',
    );
  }
  state.campaign.lateRisk = Math.min(1, state.campaign.lateRisk + (option.lateRisk ?? 0));
  if (id === 'story_initial_test') {
    const score = Math.round(Math.min(100, examBaseScore(courseAbility(state, 'math_seminar'), 0)));
    notice(
      state,
      '학원 테스트 결과',
      `${score}점 · 수학 능력 ${Math.round(state.stats.math)}. 과목 공부 후 이해도가 오르면 시험 점수도 오릅니다.`,
      'event',
    );
  }
  if (id === 'story_confession' && option.id === 'accept') {
    Object.assign(state.campaign, {
      relationship: 'dating',
      partnerSince: state.week,
      missedDates: 0,
      dateStreak: 0,
    });
    timeTask(state, `date-${state.week}`, '데이트', 1, { hp: 5, stress: -5 }, { special: 'date' });
  }
  if (id.startsWith('story_breakup_')) {
    if (option.id === 'hold') {
      state.campaign.missedDates = 0;
      state.campaign.dateStreak = 0;
    } else {
      state.campaign.relationship = 'ended';
      state.flags.romance_open = false;
    }
  }
  if (id === 'story_apology' && option.id === 'confess')
    notice(
      state,
      '학교폭력 신고',
      '상대의 거절 의사를 무시해 신고를 받았습니다. 관계가 끝났습니다.',
      'event',
    );
  if (id.startsWith('story_interview_')) {
    const score = Math.round(
      Math.min(
        100,
        state.interviewScore * 0.5 +
          state.stats.speech * 0.3 +
          (option.id === 'explain' ? 20 : option.id === 'ask' ? 16 : 5),
      ),
    );
    state.flags[id + '_score'] = score;
    notice(state, events[id].name + ' 결과', `면접 ${score}점. 최종 결과에 반영됩니다.`, 'event');
  }
}
export function closeCampaignWeek(state, messages) {
  const c = state.campaign;
  if (c.relationship !== 'dating') return;
  if (state.tasks[`date-${state.week}`]?.status === 'completed') {
    c.missedDates = 0;
    c.dateStreak++;
    c.totalDates++;
    if (c.dateStreak === 3) queueStory(state, 'story_handhold');
    if (c.dateStreak === 6) queueStory(state, 'story_kiss');
  } else {
    c.dateStreak = 0;
    c.missedDates++;
    if (c.missedDates === 2 || c.missedDates === 3) {
      const text =
        c.missedDates === 2
          ? '연인이 삐졌다. 2주째 데이트를 못 했다.'
          : '연인이 매우 화났다. 3주째 데이트를 못 했다.';
      messages.push(text);
      notice(state, '데이트 약속', text, 'event');
    }
    if (c.missedDates >= 4) queueStory(state, `story_breakup_${state.week + 1}`);
  }
}
export function runNight(state, day, messages) {
  if (state.week === 12 && state.courses.includes('general_biology') && day >= 4) return;
  const night = state.campaign.nights[day];
  if (night.activity === 'study') {
    const efficiency = Math.max(0.15, (state.stats.hp - state.stats.stress + 100) / 200);
    learnCourse(state, night.target, efficiency, 0.9);
    applyEffects(state, { [courses[night.target].ability]: 1.1 * efficiency, hp: -2, stress: 2 });
    state.campaign.lateRisk = Math.min(1, state.campaign.lateRisk + 0.5);
    messages.push(
      `${['월', '화', '수', '목', '금', '토', '일'][day]} 연장 자습 · ${courses[night.target].short} · 다음 아침 늦잠 확률 +50%`,
    );
  }
}
