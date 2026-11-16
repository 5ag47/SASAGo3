// Report/presentation composition: place sections in a sensible order and skip the traps.
// Course ability removes traps, so understanding the subject makes the work cleaner.
import { puzzleModule, drawUnique, quality, validMistakes } from './puzzle-base.js';
import { requireAction } from './action-error.js';

export const REPORT_LAYOUTS = Object.freeze({
  report: {
    sections: [
      '연구 질문과 배경',
      '실험 방법과 조건',
      '결과 표와 그래프',
      '오차와 고찰',
      '참고문헌',
    ],
    traps: ['출처 없는 인터넷 그래프', '분량만 늘린 반복 문단', '다른 조 결과 그대로 쓰기'],
  },
  presentation: {
    sections: ['도입과 문제 제기', '핵심 아이디어', '방법과 과정', '결과 시연', '예상 질문 대비'],
    traps: ['글자로 꽉 찬 슬라이드', '시간을 넘기는 대본', '근거 없는 단정'],
  },
});
const SECTION_COUNT = 5;
export const trapCount = (ability) => (ability >= 70 ? 1 : ability >= 40 ? 2 : 3);
export function reportCardLabel(layout, code) {
  const set = REPORT_LAYOUTS[layout] ?? REPORT_LAYOUTS.report;
  return code[0] === 's' ? set.sections[Number(code.slice(1))] : set.traps[Number(code.slice(1))];
}
const validCode = (code) => typeof code === 'string' && /^(s[0-4]|t[0-2])$/.test(code);
const game = {
  view: 'report',
  instructions: '목차 순서대로 알맞은 부분을 고르고, 넣으면 안 되는 카드는 건너뜁니다.',
  create({ roll, ability = 0, params = {} }) {
    const layout = Object.hasOwn(REPORT_LAYOUTS, params.layout) ? params.layout : 'report';
    const traps = drawUnique(roll, 3, trapCount(ability)).map((index) => `t${index}`);
    const codes = [...Array.from({ length: SECTION_COUNT }, (_, i) => `s${i}`), ...traps];
    return {
      kind: 'report',
      layout,
      deck: drawUnique(roll, codes.length, codes.length).map((index) => codes[index]),
      placed: 0,
      mistakes: 0,
      phase: 'play',
      passed: false,
      quality: null,
    };
  },
  act(context, current, action) {
    requireAction(
      current.phase === 'play' &&
        action?.type === 'pick' &&
        Object.keys(action).every((key) => ['type', 'card'].includes(key)) &&
        current.deck.includes(action.card),
    );
    const done = Array.from({ length: current.placed }, (_, i) => `s${i}`);
    requireAction(!done.includes(action.card), '이미 넣은 부분입니다.');
    const data = structuredClone(current);
    if (action.card === `s${data.placed}`) data.placed++;
    else data.mistakes = Math.min(1000, data.mistakes + 1);
    if (data.placed === SECTION_COUNT) {
      data.phase = 'passed';
      data.passed = true;
      data.quality = quality(data.mistakes);
    }
    return data;
  },
  valid(data) {
    return Boolean(
      data &&
      data.kind === 'report' &&
      Object.hasOwn(REPORT_LAYOUTS, data.layout) &&
      Array.isArray(data.deck) &&
      data.deck.length >= SECTION_COUNT + 1 &&
      data.deck.length <= SECTION_COUNT + 3 &&
      new Set(data.deck).size === data.deck.length &&
      data.deck.every(validCode) &&
      Array.from({ length: SECTION_COUNT }, (_, i) => `s${i}`).every((code) =>
        data.deck.includes(code),
      ) &&
      Number.isInteger(data.placed) &&
      data.placed >= 0 &&
      data.placed <= SECTION_COUNT &&
      validMistakes(data.mistakes) &&
      (data.phase === 'passed'
        ? data.passed === true &&
          data.placed === SECTION_COUNT &&
          data.quality === quality(data.mistakes)
        : data.phase === 'play' &&
          data.passed === false &&
          data.placed < SECTION_COUNT &&
          data.quality === null),
    );
  },
  public(data) {
    return structuredClone(data);
  },
};
export default puzzleModule({ id: 'report_base', name: '보고서 구성', game });
export const reportParams = {
  layout: (value) =>
    Object.hasOwn(REPORT_LAYOUTS, value) ? '' : `${Object.keys(REPORT_LAYOUTS).join(' 또는 ')}`,
};
