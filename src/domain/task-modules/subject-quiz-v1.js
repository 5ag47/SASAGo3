import { puzzleModule } from './puzzle-base.js';
import { requireAction } from './action-error.js';
import bank from '../../../data/subject-questions.json' with { type: 'json' };
const game = {
  view: 'subject_quiz',
  instructions: '세 문제를 풉니다. 과목 이해도가 높으면 오답 선택지가 줄어듭니다.',
  create({ roll, ability, params }) {
    const pool = bank[params.subject ?? 'math'];
    const start = Math.floor(roll() * pool.length);
    return {
      kind: 'subject_quiz',
      index: 0,
      mistakes: 0,
      passed: false,
      phase: 'play',
      quality: null,
      questions: Array.from({ length: 3 }, (_, i) => {
        const q = structuredClone(pool[(start + i) % pool.length]);
        q.hidden = q.options
          .map((_, j) => j)
          .filter((j) => j !== q.correct)
          .slice(0, Math.min(3, Math.floor(ability / 30)));
        return q;
      }),
    };
  },
  act(context, current, action) {
    requireAction(
      current.phase === 'play' &&
        action?.type === 'answer' &&
        Object.keys(action).every((k) => ['type', 'answer'].includes(k)) &&
        Number.isInteger(action.answer) &&
        action.answer >= 0 &&
        action.answer < 5 &&
        !current.questions[current.index].hidden.includes(action.answer),
    );
    const data = structuredClone(current);
    if (action.answer !== data.questions[data.index].correct) data.mistakes++;
    data.index++;
    if (data.index === 3) {
      data.phase = 'passed';
      data.passed = true;
      data.quality = Math.round(((3 - data.mistakes) / 3) * 100);
    }
    return data;
  },
  valid(d) {
    return Boolean(
      d &&
      d.kind === 'subject_quiz' &&
      Number.isInteger(d.index) &&
      d.index >= 0 &&
      d.index <= 3 &&
      Number.isInteger(d.mistakes) &&
      d.mistakes >= 0 &&
      d.mistakes <= d.index &&
      Array.isArray(d.questions) &&
      d.questions.length === 3 &&
      d.questions.every(
        (q) =>
          typeof q.prompt === 'string' &&
          q.options?.length === 5 &&
          q.options.every((o) => typeof o === 'string') &&
          Number.isInteger(q.correct) &&
          q.correct >= 0 &&
          q.correct < 5 &&
          Array.isArray(q.hidden) &&
          q.hidden.every((i) => Number.isInteger(i) && i >= 0 && i < 5 && i !== q.correct),
      ) &&
      (d.index === 3
        ? d.passed === true &&
          d.phase === 'passed' &&
          d.quality === Math.round(((3 - d.mistakes) / 3) * 100)
        : d.passed === false && d.phase === 'play' && d.quality === null),
    );
  },
  public(data) {
    return {
      ...structuredClone(data),
      questions: data.questions.map(({ correct, ...q }) => ({ ...q })),
    };
  },
};
export const subjectRules = {
  subject: (value) => (Object.hasOwn(bank, value) ? null : '등록된 과목 유형이 필요합니다.'),
};
export default puzzleModule({ id: 'subject_quiz_base', name: '과목별 5지선다', game });
