import { puzzleModule, drawUnique, quality, validMistakes } from './puzzle-base.js';
import { requireAction } from './action-error.js';
const game = {
  view: 'order',
  instructions: '네 숫자를 작은 순서대로 고릅니다.',
  create({ roll }) {
    return {
      kind: 'order',
      cards: drawUnique(roll, 9, 4).map((value) => value + 1),
      index: 0,
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
        current.cards.includes(action.card),
    );
    const data = structuredClone(current);
    const order = [...data.cards].sort((a, b) => a - b);
    requireAction(!order.slice(0, data.index).includes(action.card), '이미 고른 숫자입니다.');
    if (action.card === order[data.index]) data.index++;
    else {
      data.index = 0;
      data.mistakes = Math.min(1000, data.mistakes + 1);
    }
    if (data.index === data.cards.length) {
      data.phase = 'passed';
      data.passed = true;
      data.quality = quality(data.mistakes);
    }
    return data;
  },
  valid(data) {
    return Boolean(
      data &&
      data.kind === 'order' &&
      Array.isArray(data.cards) &&
      data.cards.length === 4 &&
      new Set(data.cards).size === 4 &&
      data.cards.every((value) => Number.isInteger(value) && value >= 1 && value <= 9) &&
      Number.isInteger(data.index) &&
      data.index >= 0 &&
      data.index <= 4 &&
      validMistakes(data.mistakes) &&
      (data.phase === 'passed'
        ? data.passed === true && data.index === 4 && data.quality === quality(data.mistakes)
        : data.phase === 'play' &&
          data.passed === false &&
          data.index < 4 &&
          data.quality === null),
    );
  },
  public(data) {
    return structuredClone(data);
  },
};
export default puzzleModule({ id: 'order_v1', name: '순서 정리', game });
