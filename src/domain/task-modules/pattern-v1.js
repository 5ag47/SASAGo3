import { puzzleModule, drawUnique, quality, validMistakes } from './puzzle-base.js';
import { requireAction } from './action-error.js';
const cells = (list) =>
  Array.isArray(list) &&
  list.length <= 4 &&
  new Set(list).size === list.length &&
  list.every((value) => Number.isInteger(value) && value >= 0 && value < 9);
const game = {
  view: 'pattern',
  instructions: '네 칸의 위치를 기억하고 다시 고릅니다.',
  create({ roll }) {
    return {
      kind: 'pattern',
      goal: drawUnique(roll, 9, 4),
      selected: [],
      mistakes: 0,
      phase: 'preview',
      passed: false,
      quality: null,
    };
  },
  act(context, current, action) {
    const data = structuredClone(current);
    requireAction(action && typeof action === 'object' && !Array.isArray(action));
    if (action.type === 'ready') {
      requireAction(current.phase === 'preview' && Object.keys(action).length === 1);
      data.phase = 'input';
      data.selected = [];
    } else if (action.type === 'toggle') {
      requireAction(
        current.phase === 'input' &&
          Object.keys(action).every((key) => ['type', 'cell'].includes(key)) &&
          Number.isInteger(action.cell) &&
          action.cell >= 0 &&
          action.cell < 9,
      );
      if (data.selected.includes(action.cell))
        data.selected = data.selected.filter((value) => value !== action.cell);
      else {
        requireAction(data.selected.length < 4, '네 칸까지만 선택할 수 있습니다.');
        data.selected.push(action.cell);
      }
    } else if (action.type === 'check') {
      requireAction(
        current.phase === 'input' && Object.keys(action).length === 1 && data.selected.length === 4,
      );
      if (data.goal.every((cell) => data.selected.includes(cell))) {
        data.phase = 'passed';
        data.passed = true;
        data.quality = quality(data.mistakes);
      } else {
        data.phase = 'preview';
        data.selected = [];
        data.mistakes = Math.min(1000, data.mistakes + 1);
      }
    } else requireAction(false);
    return data;
  },
  valid(data) {
    if (
      !data ||
      data.kind !== 'pattern' ||
      !cells(data.selected) ||
      !validMistakes(data.mistakes) ||
      !(data.goal === null || (cells(data.goal) && data.goal.length === 4))
    )
      return false;
    if (data.phase === 'passed')
      return data.passed === true && data.quality === quality(data.mistakes);
    return (
      ['preview', 'input'].includes(data.phase) &&
      data.passed === false &&
      data.quality === null &&
      (data.phase !== 'preview' || (data.goal !== null && data.selected.length === 0))
    );
  },
  public(data) {
    return { ...structuredClone(data), goal: data.phase === 'preview' ? [...data.goal] : null };
  },
};
export default puzzleModule({ id: 'pattern_v1', name: '패턴 기억', game });
