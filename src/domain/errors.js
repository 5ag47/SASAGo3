export class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}
export const requireRule = (condition, code, message) => {
  if (!condition) throw new GameError(code, message);
};
