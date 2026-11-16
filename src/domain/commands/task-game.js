import { finishRunTask } from '../week.js';
import { taskGameAction } from '../task-processing.js';
import { TaskActionError } from '../task-modules/action-error.js';
import { beginTaskAttempt, failTaskAttempt } from '../task-attempts.js';
import { moduleSignature, taskGameStatus } from '../task-modules/registry.js';
import { requireRule, GameError } from '../errors.js';

export const taskGameCommands = {
  task_game: {
    fields: ['type', 'task', 'action'],
    apply(state, command) {
      requireRule(
        typeof command.task === 'string' &&
          Object.hasOwn(state.tasks, command.task) &&
          state.tasks[command.task].status === 'active',
        'TASK_INVALID',
        '진행 중인 과제를 선택해 주세요.',
      );
      requireRule(
        state.weekRun?.waiting?.kind === 'task' && state.weekRun.waiting.task === command.task,
        'TASK_TIME_REQUIRED',
        '일정에 배정한 작업 시간이 되면 과제를 진행할 수 있습니다.',
      );
      try {
        const task = state.tasks[command.task],
          action = command.action;
        if (action?.type === 'start' || action?.type === 'restart') {
          requireRule(
            Object.keys(action).length === 1 &&
              (action.type === 'restart' ? Boolean(task.moduleData) : !task.moduleData),
            'TASK_GAME_ACTION',
            '진행 중인 작업 상태를 확인해 주세요.',
          );
          if (action.type === 'restart') delete task.moduleData;
          beginTaskAttempt(state, task);
          taskGameAction(state, task, { type: 'start' });
        } else {
          let actions = action?.type === 'batch' ? action.actions : [action];
          requireRule(
            Array.isArray(actions) &&
              actions.length > 0 &&
              actions.length <= 32 &&
              (action?.type !== 'batch' || Object.keys(action).length === 4) &&
              actions.every(
                (item) =>
                  item &&
                  typeof item === 'object' &&
                  !Array.isArray(item) &&
                  !['start', 'restart', 'batch'].includes(item.type),
              ),
            'TASK_ACTION_BATCH',
            '작업 입력 형식이 올바르지 않습니다.',
          );
          requireRule(
            task.attempts?.open,
            'TASK_GAME_ACTION',
            '작업을 시작하거나 다시 도전해 주세요.',
          );
          if (action.type === 'batch') {
            const sequence = task.attempts.sequence,
              from = action.from;
            requireRule(
              action.attempt === task.attempts.total &&
                Number.isInteger(from) &&
                from >= 0 &&
                from <= sequence &&
                from >= sequence - task.attempts.receipts.length,
              'TASK_INPUT_CONFLICT',
              '저장된 작업 위치가 다릅니다. 최신 기록을 확인해 주세요.',
            );
            const repeated = Math.min(sequence - from, actions.length),
              offset = sequence - task.attempts.receipts.length;
            requireRule(
              actions
                .slice(0, repeated)
                .every(
                  (item, index) =>
                    moduleSignature(item) === task.attempts.receipts[from + index - offset],
                ),
              'TASK_INPUT_CONFLICT',
              '이미 처리한 입력과 일치하지 않습니다.',
            );
            actions = actions.slice(repeated);
          }
          for (const [index, item] of actions.entries()) {
            taskGameAction(state, task, item);
            task.attempts.sequence++;
            task.attempts.receipts = [...task.attempts.receipts, moduleSignature(item)].slice(-32);
            requireRule(
              taskGameStatus(task) === 'playing' || index === actions.length - 1,
              'TASK_ACTION_BATCH',
              '종료된 도전에 추가 입력을 보낼 수 없습니다.',
            );
          }
          if (taskGameStatus(task) === 'success') finishRunTask(state, task);
          else if (taskGameStatus(task) === 'failure') failTaskAttempt(state, task);
        }
      } catch (error) {
        if (error instanceof TaskActionError) throw new GameError(error.code, error.message);
        throw error;
      }

      return state;
    },
  },
};
