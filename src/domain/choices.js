import { departmentOptions, applyCampaignChoice, campaignChoiceEffects } from './campaign.js';
import { requireRule } from './errors.js';
import {
  effectText,
  events,
  GROUPS,
  MAJORS,
  quizzes,
  REQUIRED,
  TEACHERS,
  STATS,
  courses,
} from './catalog.js';
import { matchesCondition, conditionText } from './conditions.js';
import { addTask, academyTasks } from './tasks.js';
import { notice } from './events.js';
import { applyEffects, clamp, random } from './random.js';
import { reserveActivities } from './schedule.js';
import { gpa, admissionScore, admissionThreshold } from './grades.js';
import { ADMISSION_DIRECTIONS } from './school-record.js';
import { refreshDocuments } from './admission-documents.js';
import { startRecommendation } from './recommendation.js';
import { createCardGame, playCardGame, cardOptions, cardScore } from './card-game.js';
import {
  answerPoints,
  INTERVIEW_LENGTH,
  INTERVIEW_QUESTIONS,
  interviewScore,
  interviewSpec,
} from './interview.js';
import { submitStudyApplication } from './study-applications.js';
export { INTERVIEW_QUESTIONS, INTERVIEW_LENGTH } from './interview.js';

export function choiceOptions(state, id) {
  const event = events[id];
  if (!event) return [];
  if (id.startsWith('story_apply_')) return departmentOptions(state, id.slice(12));
  if (id === 'dorm_cards' && state.minigames.cards) return cardOptions(state.minigames.cards);
  if (event.kind === 'quiz')
    return quizzes[event.quiz].options.map((label, index) => ({
      id: String(index),
      label,
      detail: '',
    }));
  if (event.kind === 'study')
    return [
      ...Object.entries(GROUPS)
        .filter(([key]) => !state.rejectedGroups.includes(key))
        .map(([key, group]) => ({
          id: key,
          label: group.name,
          detail: `참여 한 칸: ${effectText(group.effect)} · 합류 ${Math.round(group.chance * 100)}%`,
        })),
      { id: 'solo', label: '혼자 공부한다', detail: '스터디에 가입하지 않습니다.' },
    ];
  if (event.kind === 'registration')
    return Object.entries(MAJORS).map(([key, major]) => ({
      id: key,
      label: major.name,
      detail: `${major.courses.length}개 전공 + 교양필수 ${REQUIRED.length}과목`,
    }));
  if (event.kind === 'recommendation')
    return Object.entries(TEACHERS).map(([key, name]) => ({
      id: key,
      label: name,
      detail: `현재 친밀도 ${state.teachers[key]} / 100`,
    }));
  if (id === 'applications')
    return event.options.map((option) => ({
      ...option,
      detail: ADMISSION_DIRECTIONS[option.id].routes
        .map((profile) =>
          Object.values(events)
            .find((event) => event.profile === profile)
            ?.name.replace(' 종합 평가', ''),
        )
        .join(' · '),
      locked: Boolean(state.documents),
      requirement: state.documents ? '제출한 지원 방향은 바꿀 수 없습니다.' : '',
    }));
  return (event.options ?? []).map((option) => ({
    ...option,
    locked: !matchesCondition(state, option.when),
    requirement:
      option.requirement ??
      conditionText(option.when, {
        stats: STATS,
        courses,
        majors: MAJORS,
        tasks: state.tasks,
        events,
      }),
  }));
}
export function applyChoice(state, id, selected, answers) {
  const event = events[id];
  if (applyCampaignChoice(state, id, selected)) return;
  if (id === 'dorm_cards' && selected !== 'watch') {
    if (!state.minigames.cards) {
      reserveActivities(state, event.options.find((o) => o.id === 'play').reserve, id);
      state.flags.cardGame = true;
      state.minigames.cards = createCardGame(state);
      return;
    }
    const game = state.minigames.cards;
    playCardGame(state, game, selected);
    if (game.phase !== 'finished') return;
    state.flags.cardWins = (state.flags.cardWins ?? 0) + Number(game.result === 'won');
    notice(
      state,
      '기숙사 고스톱 결과',
      `나 ${cardScore(game.mine)}점 + 고 ${game.go}점 · 친구 ${cardScore(game.friend)}점 · ${game.result === 'won' ? '승리' : game.result === 'lost' ? '패배' : '무승부'}`,
      'event',
    );
    state.choices[id] = game.result;
    state.pending = state.pending.filter((key) => key !== id);
    return;
  }
  if (event.kind === 'quiz') {
    const quiz = quizzes[event.quiz];
    const answer =
      quiz.correct === null ? Math.floor(random(state) * quiz.options.length) : quiz.correct;
    const correct = Number(selected) === answer;
    applyEffects(state, { stress: correct ? -6 : 1, reputation: correct ? 1 : 0 });
    notice(
      state,
      `${event.name} · ${correct ? '정답' : '오답'}`,
      `정답: ${quiz.options[answer]}. ${quiz.explanation}`,
      'event',
    );
  } else if (event.kind === 'interview') {
    // Questions are fixed from the record when the interview starts, so a reload cannot reshuffle them.
    const game = state.minigames.interview ?? {
      answers: [],
      phase: 'active',
      score: null,
      questions: interviewSpec(state),
    };
    game.answers.push(...answers);
    state.minigames.interview = game;
    if (game.answers.length < INTERVIEW_LENGTH) return;
    const good = game.questions
      ? game.answers.filter((answer, i) => answerPoints(game.questions[i], answer) >= 0.8).length
      : game.answers.filter((answer, i) => answer === INTERVIEW_QUESTIONS[i].correct).length;
    state.interviewScore = game.questions
      ? interviewScore(game.questions, game.answers, state.stats.speech)
      : Math.round((good / 3) * 70 + state.stats.speech * 0.3);
    game.phase = 'finished';
    game.score = state.interviewScore;
    applyEffects(state, { speech: good * 2, stress: good >= 2 ? -8 : 5 });
    notice(
      state,
      '실전 면접 기록',
      `${good}/3개 질문에서 좋은 답변 · 면접 점수 ${state.interviewScore}점`,
      'event',
    );
  } else if (event.kind === 'study') {
    if (selected === 'solo') {
      state.choices[id] = 'solo';
      state.pending = state.pending.filter((key) => key !== id);
      return;
    }
    submitStudyApplication(state, selected);
    return;
  } else if (event.kind === 'registration')
    requireRule(false, 'REGISTRATION_CLOSED', '수강신청은 이미 확정됐습니다.');
  else if (event.kind === 'recommendation') {
    state.flags.recommender = selected;
    startRecommendation(state, selected);
    applyEffects(state, { reputation: 2 });
  } else {
    const option = event.options.find((o) => o.id === selected);
    campaignChoiceEffects(state, id, option);
    state.money += (option.income ?? 0) - (option.cost ?? 0);
    applyEffects(state, option.effect);
    Object.assign(state.flags, option.flags);
    if (option.discipline) applyEffects(state, { reputation: -option.discipline * 3 });
    if (option.reserve) reserveActivities(state, option.reserve, id);
    if (id === 'summer_counseling' && selected === 'review') {
      state.teachers.homeroom = clamp(state.teachers.homeroom + 5);
      notice(
        state,
        '진학 상담 기록',
        `1학기 학점 ${gpa(state).toFixed(2)} / 4.30 · 현재 종합 준비도 ${admissionScore(state)}점. ${Object.values(
          events,
        )
          .filter((event) => event.profile)
          .map(
            (event) =>
              `${event.name.replace(' 종합 평가', '')} 기준 ${admissionThreshold(event)}점`,
          )
          .join(' · ')}. 종합 전형에는 원서 제출이 필요합니다.`,
        'event',
      );
    }
    if (option.flags?.academy) academyTasks(state);
    if (option.flags?.contest)
      addTask(state, 'external-contest', {
        name: '외부 탐구대회 준비',
        description: '준비를 마치면 실력에 따라 수상을 판정해요.',
        target: 3,
        deadline: 22,
        special: 'contest',
        reward: { science: 4, writing: 3 },
        penalty: { stress: 4 },
      });
    notice(state, event.name, `선택 · ${option.label}`, 'event');
  }
  state.choices[id] =
    event.kind === 'interview' ? [...state.minigames.interview.answers] : selected;
  state.pending = state.pending.filter((key) => key !== id);
  refreshDocuments(state);
}
