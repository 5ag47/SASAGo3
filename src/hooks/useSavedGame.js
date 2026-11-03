import { useEffect, useReducer, useState } from 'react';
import { gameReducer } from '../systems/game-reducer.js';
import { loadGame, saveGame } from '../systems/save.js';

export function useSavedGame() {
  const [game, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const [saveStatus, setSaveStatus] = useState('저장됨');

  function saveNow() {
    const saved = saveGame(game);
    setSaveStatus(saved ? '저장됨' : '저장 실패');
    return saved;
  }

  useEffect(() => {
    if (game.created) saveNow();
  }, [game]);

  return { game, dispatch, saveStatus, saveNow };
}
