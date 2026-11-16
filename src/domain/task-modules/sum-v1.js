// Problem writing: choose sub-questions whose marks add up to the target total.
// Course ability shows fewer candidate cards, so a well-understood subject is quicker to write.
import { puzzleModule, drawUnique, quality, validMistakes } from './puzzle-base.js';
import { requireAction } from './action-error.js';

export const cardCount = (ability) => (ability >= 70 ? 5 : ability >= 40 ? 6 : 7);
const value = (item) => Number.isInteger(item) && item >= 1 && item <= 9;
const sum = (list) => list.reduce((total, item) => total + item, 0);
const game = {
  view: 'sum',
  instructions: '소문항 배점을 골라 정해진 총점에 맞는 문제를 만듭니다.',
  create({ roll, ability = 0 }) {
    const cards = drawUnique(roll, 9, cardCount(ability)).map((index) => index + 1);
    const answer = drawUnique(roll, cards.length, 3).map((index) => cards[index]);
    return {
      kind: 'sum',
      cards,
      target: sum(answer),
      selected: [],
      mistakes: 0,
      phase: 'play',
      passed: false,
      quality: null,
    };
  },
  act(context, current, action) {
    requireAction(current.phase === 'play' && action && typeof action === 'object');
    const data = structuredClone(current);
    if (action.type === 'toggle') {
      requireAction(
        Object.keys(action).every((key) => ['type', 'card'].includes(key)) &&
          data.cards.includes(action.card),
      );
      data.selected = data.selected.includes(action.card)
        ? data.selected.filter((item) => item !== action.card)
        : [...data.selected, action.card];
    } else if (action.type === 'check') {
      requireAction(
        Object.keys(action).length === 1 && data.selected.length >= 2,
        '소문항을 두 개 이상 고르세요.',
      );
      if (sum(data.selected) === data.target) {
        data.phase = 'passed';
        data.passed = true;
        data.quality = quality(data.mistakes);
      } else {
        data.mistakes = Math.min(1000, data.mistakes + 1);
        data.selected = [];
      }
    } else requireAction(false);
    return data;
  },
  valid(data) {
    return Boolean(
      data &&
      data.kind === 'sum' &&
      Array.isArray(data.cards) &&
      data.cards.length >= 5 &&
      data.cards.length <= 7 &&
      new Set(data.cards).size === data.cards.length &&
      data.cards.every(value) &&
      Number.isInteger(data.target) &&
      data.target >= 6 &&
      data.target <= 24 &&
      Array.isArray(data.selected) &&
      new Set(data.selected).size === data.selected.length &&
      data.selected.every((item) => data.cards.includes(item)) &&
      validMistakes(data.mistakes) &&
      (data.phase === 'passed'
        ? data.passed === true &&
          sum(data.selected) === data.target &&
          data.quality === quality(data.mistakes)
        : data.phase === 'play' && data.passed === false && data.quality === null),
    );
  },
  public(data) {
    return structuredClone(data);
  },
};
export default puzzleModule({ id: 'sum_base', name: '배점 맞추기', game });
