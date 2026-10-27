import { effectText, events, GROUPS, MAJORS, quizzes, REQUIRED, TEACHERS } from './catalog.js';
import { addTask, academyTasks } from './tasks.js';
import { notice } from './events.js';
import { applyEffects, clamp, random } from './random.js';
import { reserveActivities } from './schedule.js';
import { gpa, admissionScore } from './grades.js';

export const INTERVIEW_QUESTIONS = [
  {
    text: '처음 보는 수학 문제예요. 풀이가 바로 떠오르지 않는다면?',
    options: [
      '아는 척하며 답을 단정한다',
      '조건을 정리하고 작은 예부터 살펴본다',
      '답만 찍고 넘어간다',
    ],
    correct: 1,
    explanation: '조건과 작은 예를 통해 사고 과정을 설명하는 태도를 봤어요.',
  },
  {
    text: '실험 결과가 가설과 달랐어요. 발표에서 어떻게 설명할까요?',
    options: [
      '원하는 결과로 숫자를 바꾼다',
      '결과를 숨기고 성공 사례만 말한다',
      '오차와 가설을 다시 점검하고 후속 실험을 제안한다',
    ],
    correct: 2,
    explanation: '예상과 다른 결과도 정직하게 해석하는 것이 탐구예요.',
  },
  {
    text: '팀 프로젝트에서 역할이 충돌했다면?',
    options: [
      '각자의 근거를 듣고 역할·일정을 합의한다',
      '혼자 전부 처리한다',
      '문제를 덮어두고 마감까지 기다린다',
    ],
    correct: 0,
    explanation: '역할과 합의를 분명히 하는 협업을 평가했어요.',
  },
];
export function choiceOptions(state, id) {
  const event = events[id];
  if (!event) return [];
  if (event.kind === 'quiz')
    return quizzes[event.quiz].options.map((label, index) => ({
      id: String(index),
      label,
      detail: '',
    }));
  if (event.kind === 'study')
    return Object.entries(GROUPS)
      .filter(([key]) => !state.rejectedGroups.includes(key))
      .map(([key, group]) => ({
        id: key,
        label: group.name,
        detail: `참여 한 칸: ${effectText(group.effect)} · 합류 ${Math.round(group.chance * 100)}%`,
      }));
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
  return event.options ?? [];
}
export function applyChoice(state, id, selected, answers) {
  const event = events[id];
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
    const correct = answers.filter((answer, i) => answer === INTERVIEW_QUESTIONS[i].correct).length;
    state.interviewScore = Math.round((correct / 3) * 70 + state.stats.speech * 0.3);
    applyEffects(state, { speech: correct * 2, stress: correct >= 2 ? -8 : 5 });
    notice(
      state,
      '실전 면접 기록',
      `${correct}/3개 질문에서 좋은 답변 · 면접 점수 ${state.interviewScore}점`,
      'event',
    );
  } else if (event.kind === 'study') {
    const group = GROUPS[selected];
    if (random(state) >= group.chance) {
      state.rejectedGroups.push(selected);
      applyEffects(state, { stress: 2 });
      notice(
        state,
        '이번 팀과는 인연이 닿지 않았어요',
        '다른 스터디에 지원해 보세요. 찐친 스터디는 언제나 환영이에요.',
      );
      return;
    }
    state.group = selected;
    notice(
      state,
      '새로운 스터디에 합류했어요',
      `${group.name} · 일정에 스터디를 넣어 참여하세요. 한 주 불참 시 500원 벌금이에요.`,
    );
  } else if (event.kind === 'registration') state.nextMajor = selected;
  else if (event.kind === 'recommendation') {
    state.flags.recommender = selected;
    applyEffects(state, { reputation: 2 });
  } else {
    const option = event.options.find((o) => o.id === selected);
    state.money += (option.income ?? 0) - (option.cost ?? 0);
    applyEffects(state, option.effect);
    Object.assign(state.flags, option.flags);
    state.discipline += option.discipline ?? 0;
    if (option.reserve) reserveActivities(state, option.reserve, id);
    if (id === 'summer_counseling' && selected === 'review') {
      state.teachers.homeroom = clamp(state.teachers.homeroom + 5);
      notice(
        state,
        '진학 상담 기록',
        `1학기 학점 ${gpa(state).toFixed(2)} / 4.30 · 현재 종합 준비도 ${admissionScore(state)}점. 게임 속 종합 기준은 상향 78점·균형 62점·안정 48점이며 서류 제출이 필요합니다.`,
        'event',
      );
    }
    if (id === 'dorm_cards' && selected === 'play') {
      const won = random(state) < 0.5;
      state.flags.cardWins = (state.flags.cardWins ?? 0) + Number(won);
      notice(
        state,
        '기숙사 고스톱 결과',
        won
          ? '이번 판 승리 · 누적 승리 ' + state.flags.cardWins + '회'
          : '이번 판 패배 · 용돈 변동 없음',
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
  state.choices[id] = event.kind === 'interview' ? [...answers] : selected;
  state.pending = state.pending.filter((key) => key !== id);
}
