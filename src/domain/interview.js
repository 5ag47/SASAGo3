import { courses } from './catalog.js';
import { courseAbility } from './course-progress.js';
// Fixed questions from 2026.10 saves. Kept only to review interviews answered before 2026.11.
export const INTERVIEW_QUESTIONS = [
  {
    text: '처음 보는 수학 문제예요. 풀이가 바로 떠오르지 않는다면?',
    options: [
      '아는 척하며 답을 단정한다',
      '조건을 정리하고 작은 예부터 살펴본다',
      '답만 찍고 넘어간다',
    ],
    correct: 1,
    explanation: '조건을 정리하고 작은 예를 살펴보면 풀이의 근거를 설명할 수 있습니다.',
  },
  {
    text: '실험 결과가 가설과 달랐어요. 발표에서 어떻게 설명할까요?',
    options: [
      '원하는 결과로 숫자를 바꾼다',
      '결과를 숨기고 성공 사례만 말한다',
      '오차와 가설을 다시 점검하고 후속 실험을 제안한다',
    ],
    correct: 2,
    explanation: '관찰한 결과를 바탕으로 오차와 가설을 검토하고 후속 실험을 제안합니다.',
  },
  {
    text: '팀 프로젝트에서 역할이 충돌했다면?',
    options: [
      '각자의 근거를 듣고 역할·일정을 합의한다',
      '혼자 전부 처리한다',
      '문제를 덮어두고 마감까지 기다린다',
    ],
    correct: 0,
    explanation: '서로의 근거를 듣고 역할과 일정을 합의하면 충돌을 풀 수 있습니다.',
  },
];
// 2026.11: a 서류 확인 interview built from the student's own record. The best answer depends on
// what the student actually did, so it cannot be memorised: overselling thin work or telling a story
// the record does not support costs points, and honest framing of weaker work keeps them.
export const INTERVIEW_LENGTH = 3;
const RECORD_OPTIONS = [
  '실제 과정과 시행착오를 구체적으로 설명한다',
  '결과와 의미를 중심으로 짧게 정리한다',
  '부족했던 부분과 다음에 바꿀 점을 솔직히 말한다',
];
const MAJOR_OPTIONS = [
  '아는 공식을 바로 적용해 답을 낸다',
  '조건을 정리하고 작은 경우부터 확인한다',
  '막힌 지점을 밝히고 접근 방향을 함께 묻는다',
];
const LIFE_OPTIONS = [
  '단체방 문제를 나서서 정리했던 경험',
  '거리를 두고 내 할 일을 지켰던 경험',
  '스터디에서 역할을 나눠 맡았던 경험',
];
const short = (text, max) => typeof text === 'string' && text.length > 0 && text.length <= max;
const score = (value) => Number.isInteger(value) && value >= 0 && value <= 100;

// Interviewers ask about major coursework first; among those, the most recent work.
const majorWork = (task) => (courses[task.course]?.category === '전공' ? 1 : 0);
function latestCourseWork(state) {
  return Object.entries(state.tasks)
    .filter(([, task]) => task.status === 'completed' && task.course && task.special !== 'tutorial')
    .sort(
      ([a, x], [b, y]) =>
        majorWork(y) - majorWork(x) || y.deadline - x.deadline || b.localeCompare(a),
    )[0];
}
// Every interview-practice slot actually run this year (mock interviews reserve the same activity).
export const practiceCount = (state) =>
  Math.min(
    40,
    state.history.reduce(
      (sum, week) => sum + week.actions.filter((action) => action.activity === 'interview').length,
      0,
    ),
  );
export const practiceBonus = (practice) => Math.min(10, practice * 0.5);
export function interviewSpec(state) {
  const latest = latestCourseWork(state);
  const thesis = state.tasks.thesis?.status === 'completed' ? state.tasks.thesis : null;
  const work = latest?.[1] ?? thesis;
  const majorCourse =
    state.courses.find((id) => courses[id]?.category === '전공') ?? state.courses[0];
  const chat = state.choices.chat_incident;
  return [
    {
      kind: 'record',
      task: latest?.[0] ?? (thesis ? 'thesis' : null),
      name: (work?.name ?? '학교 과제').slice(0, 60),
      quality: Math.round(work?.result?.quality ?? work?.result?.score ?? 40),
    },
    {
      kind: 'major',
      course: majorCourse,
      ability: Math.round(majorCourse ? courseAbility(state, majorCourse) : 0),
    },
    {
      kind: 'life',
      practice: practiceCount(state),
      story: chat === 'help' ? 'help' : 'calm',
      team:
        Boolean(state.group) ||
        state.choices.may_union_study === 'join' ||
        state.choices.mock_interview !== undefined,
    },
  ];
}
export function validInterviewSpec(spec) {
  return (
    Array.isArray(spec) &&
    spec.length === INTERVIEW_LENGTH &&
    spec[0]?.kind === 'record' &&
    (spec[0].task === null || short(spec[0].task, 100)) &&
    short(spec[0].name, 60) &&
    score(spec[0].quality) &&
    spec[1]?.kind === 'major' &&
    (spec[1].course === undefined || spec[1].course === null || short(spec[1].course, 60)) &&
    score(spec[1].ability) &&
    spec[2]?.kind === 'life' &&
    ['help', 'calm'].includes(spec[2].story) &&
    (spec[2].practice === undefined ||
      (Number.isInteger(spec[2].practice) && spec[2].practice >= 0 && spec[2].practice <= 40)) &&
    typeof spec[2].team === 'boolean'
  );
}
export function interviewView(spec) {
  const major = courses[spec[1].course]?.name ?? '전공';
  return [
    {
      text: `서류에 있는 ‘${spec[0].name}’ 이야기를 해 볼까요. 어떤 과정이었나요?`,
      options: RECORD_OPTIONS,
    },
    {
      text: `${major} 제시문 문제입니다. 처음 보는 조건이 섞여 있어요. 어떻게 풀어 갈까요?`,
      options: MAJOR_OPTIONS,
    },
    { text: '학교생활에서 친구들과 부딪혔던 일을 하나 이야기해 주세요.', options: LIFE_OPTIONS },
  ];
}
// Points for one answer, 0~1.
export function answerPoints(question, answer) {
  if (question.kind === 'record') {
    // Honesty limits the damage of thin work; it does not turn thin work into a strong answer.
    const q = question.quality;
    if (question.task === null) return [0.1, 0.2, 0.4][answer];
    return (q >= 85 ? [1, 0.6, 0.5] : q >= 70 ? [0.7, 0.7, 0.8] : [0.2, 0.4, 0.6])[answer];
  }
  if (question.kind === 'major') {
    const a = question.ability;
    return (a >= 75 ? [0.8, 1, 0.6] : a >= 50 ? [0.3, 0.8, 0.7] : [0.1, 0.3, 0.5])[answer];
  }
  return [
    question.story === 'help' ? 1 : 0.2,
    question.story === 'help' ? 0.5 : 0.8,
    question.team ? 0.9 : 0.2,
  ][answer];
}
export function answerFeedback(question, answer) {
  const points = answerPoints(question, answer);
  if (question.kind === 'record') {
    if (question.task === null) return '서류에 이야기할 완성된 과제가 없어 답변이 짧았어요.';
    const base = `서류의 작업 품질 ${question.quality}점.`;
    if (answer === 0 && question.quality < 70)
      return `${base} 구체적인 후속 질문에서 답이 막혔어요.`;
    if (answer === 2 && question.quality >= 85)
      return `${base} 잘 해낸 과정을 충분히 보여 주지 못했어요.`;
    return points >= 0.8
      ? `${base} 기록과 맞는 답변이었어요.`
      : `${base} 무난했지만 인상이 약했어요.`;
  }
  if (question.kind === 'major') {
    const base = `전공 실력 ${question.ability}.`;
    if (answer === 0 && question.ability < 75) return `${base} 공식을 적용하다 조건을 놓쳤어요.`;
    return points >= 0.8
      ? `${base} 실력에 맞는 풀이 방식이었어요.`
      : `${base} 방향은 맞았지만 끝까지 가지 못했어요.`;
  }
  if (points <= 0.2) return '생활기록·추천서와 다른 이야기라 확인 질문에 흔들렸어요.';
  return points >= 0.8
    ? '기록과 맞는 구체적인 경험이었어요.'
    : '사실이지만 강점이 잘 드러나지 않았어요.';
}
export const bestInterviewAnswers = (spec) =>
  spec.map((question) =>
    [0, 1, 2].reduce(
      (best, i) => (answerPoints(question, i) > answerPoints(question, best) ? i : best),
      0,
    ),
  );
export function interviewScore(spec, answers, speech) {
  const points = answers.reduce((sum, answer, i) => sum + answerPoints(spec[i], answer), 0);
  // Answers carry most of the score; speaking skill and rehearsal add a bounded amount on top.
  return Math.round(
    Math.min(
      100,
      (points / INTERVIEW_LENGTH) * 65 + speech * 0.25 + practiceBonus(spec[2].practice ?? 0),
    ),
  );
}

export function validInterview(game) {
  if (game === null) return true;
  if (game?.questions !== undefined && !validInterviewSpec(game.questions)) return false;
  return Boolean(
    game &&
    Array.isArray(game.answers) &&
    game.answers.length > 0 &&
    game.answers.length <= INTERVIEW_LENGTH &&
    game.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 3) &&
    (game.phase === 'finished'
      ? game.answers.length === INTERVIEW_LENGTH &&
        Number.isInteger(game.score) &&
        game.score >= 0 &&
        game.score <= 100
      : ['active', 'abandoned'].includes(game.phase) &&
        game.answers.length < INTERVIEW_LENGTH &&
        game.score === null),
  );
}
