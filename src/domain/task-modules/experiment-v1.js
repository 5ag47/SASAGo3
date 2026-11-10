// Controlled experiment: change one condition at a time to find the one that matters.
// Changing two at once still runs but cannot tell them apart, and counts as a mistake.
import { puzzleModule, drawUnique, validMistakes } from './puzzle-base.js';
import { requireAction } from './action-error.js';

export const DEFAULT_VARIABLES = Object.freeze(['온도', '농도', '시간', '양']);
const MAX_TESTS = 8;
export const experimentQuality = (mistakes, tests) =>
  Math.max(60, 100 - mistakes * 10 - Math.max(0, tests - 3) * 5);
const variableIndex = (value) => Number.isInteger(value) && value >= 0 && value < 4;
const game = {
  view: 'experiment',
  instructions: '조건을 하나씩 바꿔 결과가 달라지는 원인을 찾습니다.',
  create({ roll, ability = 0, params = {} }) {
    const variables = Array.isArray(params.variables)
      ? [...params.variables]
      : [...DEFAULT_VARIABLES];
    const cause = drawUnique(roll, 4, 1)[0];
    // A strong grasp of the course rules one condition out before the first run.
    const others = [0, 1, 2, 3].filter((index) => index !== cause);
    const ruledOut = ability >= 60 ? [others[drawUnique(roll, 3, 1)[0]]] : [];
    return {
      kind: 'experiment',
      variables,
      cause,
      ruledOut,
      tests: [],
      mistakes: 0,
      phase: 'play',
      passed: false,
      quality: null,
    };
  },
  act(context, current, action) {
    requireAction(current.phase === 'play' && action && typeof action === 'object');
    const data = structuredClone(current);
    if (action.type === 'test') {
      requireAction(
        Object.keys(action).every((key) => ['type', 'vars'].includes(key)) &&
          Array.isArray(action.vars) &&
          [1, 2].includes(action.vars.length) &&
          new Set(action.vars).size === action.vars.length &&
          action.vars.every(variableIndex),
        '바꿀 조건을 한두 개 고르세요.',
      );
      requireAction(data.tests.length < MAX_TESTS, '실험 횟수를 모두 썼습니다. 원인을 고르세요.');
      data.tests.push({ vars: [...action.vars], changed: action.vars.includes(data.cause) });
      if (action.vars.length > 1) data.mistakes = Math.min(1000, data.mistakes + 1);
    } else if (action.type === 'answer') {
      requireAction(
        Object.keys(action).every((key) => ['type', 'variable'].includes(key)) &&
          variableIndex(action.variable),
      );
      if (action.variable === data.cause) {
        data.phase = 'passed';
        data.passed = true;
        data.quality = experimentQuality(data.mistakes, data.tests.length);
      } else {
        data.mistakes = Math.min(1000, data.mistakes + 1);
        if (!data.ruledOut.includes(action.variable)) data.ruledOut.push(action.variable);
      }
    } else requireAction(false);
    return data;
  },
  valid(data) {
    return Boolean(
      data &&
      data.kind === 'experiment' &&
      Array.isArray(data.variables) &&
      data.variables.length === 4 &&
      data.variables.every(
        (label) => typeof label === 'string' && label.length > 0 && label.length <= 12,
      ) &&
      variableIndex(data.cause) &&
      Array.isArray(data.ruledOut) &&
      data.ruledOut.length <= 3 &&
      new Set(data.ruledOut).size === data.ruledOut.length &&
      data.ruledOut.every((index) => variableIndex(index) && index !== data.cause) &&
      Array.isArray(data.tests) &&
      data.tests.length <= MAX_TESTS &&
      data.tests.every(
        (test) =>
          test &&
          Array.isArray(test.vars) &&
          [1, 2].includes(test.vars.length) &&
          test.vars.every(variableIndex) &&
          test.changed === test.vars.includes(data.cause),
      ) &&
      validMistakes(data.mistakes) &&
      (data.phase === 'passed'
        ? data.passed === true &&
          data.quality === experimentQuality(data.mistakes, data.tests.length)
        : data.phase === 'play' && data.passed === false && data.quality === null),
    );
  },
  // The cause stays on the server until it is found; test results are what a student sees.
  public(data) {
    return { ...structuredClone(data), cause: data.passed ? data.cause : null };
  },
};
export default puzzleModule({ id: 'experiment_base', name: '변인 통제 실험', game });
export const experimentParams = {
  variables: (value) =>
    Array.isArray(value) &&
    value.length === 4 &&
    new Set(value).size === 4 &&
    value.every((label) => typeof label === 'string' && label.trim() && label.length <= 12)
      ? ''
      : '서로 다른 조건 이름 4개(각 12자 이하)',
};
