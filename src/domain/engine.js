import { CONTENT_VERSION, validateState } from './state.js';
import { syncCondition } from './state/condition.js';
import { COMMANDS } from './commands/index.js';
import { requireRule, GameError } from './errors.js';
import { copyForTaskInput } from './state-copy.js';
export { GameError } from './errors.js';
export { createGame } from './commands/profile.js';
export { planPreset } from './commands/planning.js';
export { ENDINGS, endingAvailable } from './endings.js';
export { effectivePlan } from './schedule.js';

export function transition(source, command) {
  requireRule(
    validateState(source),
    'STATE_INVALID',
    '저장 상태를 확인할 수 없어요. 백업을 복원해 주세요.',
  );
  requireRule(
    command && typeof command.type === 'string',
    'COMMAND_INVALID',
    '알 수 없는 요청이에요.',
  );
  const definition = COMMANDS[command.type];
  if (!Object.hasOwn(COMMANDS, command.type))
    throw new GameError('COMMAND_UNKNOWN', '지원하지 않는 요청이에요.');
  if (!definition.startsGame)
    requireRule(
      source.created && (!source.ending || definition.allowEnded),
      'GAME_CLOSED',
      '진행 중인 게임에서만 할 수 있어요.',
    );
  let state =
    command.type === 'task_game' && Object.hasOwn(source.tasks, command.task)
      ? copyForTaskInput(source, command.task)
      : structuredClone(source);
  syncCondition(state);
  state.contentVersion = CONTENT_VERSION;
  try {
    state = definition.apply(state, command);
  } catch (error) {
    const failure =
      error instanceof Error ? error : new Error('COMMAND_HANDLER_FAILURE', { cause: error });
    failure.commandType = command.type;
    failure.phase = 'apply';
    throw failure;
  }
  syncCondition(state);
  state.revision = source.revision + 1;
  if (state.weekRun) {
    state.weekRun.minHealth = Math.min(state.weekRun.minHealth, state.stats.hp);
    state.weekRun.peakStress = Math.max(state.weekRun.peakStress, state.stats.stress);
  }
  requireRule(
    validateState(state),
    'INVARIANT_FAILED',
    '변경 결과가 규칙에 맞지 않아 적용하지 않았어요.',
  );
  return state;
}
