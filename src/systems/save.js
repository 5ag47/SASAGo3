import { SAVE_KEY, initialGame, migrateSave, validSave } from '../game.js';

export function loadGame(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
    const game = migrateSave(JSON.parse(raw));
    return validSave(game) ? game : initialGame();
  } catch {
    return initialGame();
  }
}

export function saveGame(game, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}
