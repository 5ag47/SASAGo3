export class TaskActionError extends Error {
  constructor(message) {
    super(message);
    this.code = 'TASK_GAME_ACTION';
  }
}
export function requireAction(condition, message = '현재 할 수 없는 미니게임 행동입니다.') {
  if (!condition) throw new TaskActionError(message);
}
