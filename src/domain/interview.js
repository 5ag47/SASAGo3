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
export function validInterview(game) {
  if (game === null) return true;
  return Boolean(
    game &&
    Array.isArray(game.answers) &&
    game.answers.length > 0 &&
    game.answers.length <= INTERVIEW_QUESTIONS.length &&
    game.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 3) &&
    (game.phase === 'finished'
      ? game.answers.length === INTERVIEW_QUESTIONS.length &&
        Number.isInteger(game.score) &&
        game.score >= 0 &&
        game.score <= 100
      : ['active', 'abandoned'].includes(game.phase) &&
        game.answers.length < INTERVIEW_QUESTIONS.length &&
        game.score === null),
  );
}
