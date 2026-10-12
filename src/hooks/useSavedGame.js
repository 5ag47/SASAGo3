import { useEffect, useState } from 'react';
import { SAVE_KEY, initialGame, migrateSave, validSave } from '../game.js';

function readSave() {
  try {
    const data = migrateSave(JSON.parse(localStorage.getItem(SAVE_KEY)));
    return validSave(data) ? data : initialGame();
  } catch {
    return initialGame();
  }
}

export function useSavedGame() {
  const [game, setGame] = useState(readSave);
  const [saveStatus, setSaveStatus] = useState('저장됨');

  function saveNow() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
      setSaveStatus('저장됨');
      return true;
    } catch {
      setSaveStatus('저장 실패');
      return false;
    }
  }

  useEffect(() => {
    if (game.created) saveNow();
  }, [game]);

  return { game, setGame, saveStatus, saveNow };
}
