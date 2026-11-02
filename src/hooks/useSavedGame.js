import { useEffect, useState } from 'react';
import { initialGame, migrateSave, validSave } from '../game.js';
import { accountSaveKey } from '../systems/accounts.js';
export function useSavedGame(accountId) {
  const key = accountSaveKey(accountId);
  const [loaded] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {
        game: initialGame(),
        error: ''
      };
      const data = migrateSave(JSON.parse(raw));
      if (!validSave(data)) throw new Error('저장 형식 오류');
      return {
        game: data,
        error: ''
      };
    } catch {
      return {
        game: initialGame(),
        error: '저장 데이터를 읽을 수 없어요. 기존 저장은 덮어쓰지 않았어요.'
      };
    }
  });
  const [game, setGame] = useState(loaded.game);
  const [loadError, setLoadError] = useState(loaded.error);
  const [saveStatus, setSaveStatus] = useState('저장됨');
  function saveNow() {
    if (loadError) return false;
    try {
      localStorage.setItem(key, JSON.stringify(game));
      setSaveStatus('저장됨');
      return true;
    } catch {
      setSaveStatus('저장 실패');
      return false;
    }
  }
  useEffect(() => {
    if (game.created && !loadError) saveNow();
  }, [game, loadError, key]);
  function restore(data) {
    const migrated = migrateSave(data);
    if (!validSave(migrated)) throw new Error('올바른 SASAGo3 저장 파일이 아니에요.');
    localStorage.setItem(key, JSON.stringify(migrated));
    setLoadError('');
    setGame(migrated);
  }
  return {
    game,
    setGame,
    saveStatus,
    saveNow,
    loadError,
    restore
  };
}
