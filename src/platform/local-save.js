import { baseState, migrateState, SAVE_KEY, validateState } from '../domain/state.js';
import { transition, GameError } from '../domain/engine.js';

export const BACKUP_KEY = `${SAVE_KEY}-backup`;
export const MAX_SAVE_BYTES = 1500000;
export function resetLocal(
  source,
  { allowDamaged = false } = {},
  storage = globalThis.localStorage,
) {
  const raw = storage.getItem(SAVE_KEY);
  if (raw) {
    let previous;
    try {
      previous = parseSave(raw);
    } catch (error) {
      if (!allowDamaged) throw error;
    }
    if (previous && previous.revision !== source.revision)
      throw new GameError(
        'SAVE_CONFLICT',
        '다른 창에서 기록이 바뀌었습니다. 최신 저장을 확인해 주세요.',
      );
    storage.setItem(previous ? BACKUP_KEY : `${SAVE_KEY}-damaged`, raw);
  }
  const fresh = baseState(crypto.getRandomValues(new Uint32Array(1))[0]);
  fresh.revision = source.revision + 1;
  storage.setItem(SAVE_KEY, JSON.stringify(fresh));
  return fresh;
}
export function parseSave(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_SAVE_BYTES)
    throw new GameError('SAVE_SIZE', '저장 파일 크기가 올바르지 않아요.');
  let state;
  try {
    state = migrateState(JSON.parse(raw));
  } catch {
    throw new GameError('SAVE_JSON', '저장 파일을 읽을 수 없어요.');
  }
  try {
    if (validateState(state)) return state;
  } catch {
    /* treat malformed nested values as invalid */
  }
  throw new GameError('SAVE_SCHEMA', '현재 버전과 맞지 않거나 손상된 저장 파일이에요.');
}
export function loadLocal(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw)
      return { state: baseState(crypto.getRandomValues(new Uint32Array(1))[0]), issue: null };
    return { state: parseSave(raw), issue: null };
  } catch (error) {
    try {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup)
        return {
          state: parseSave(backup),
          issue:
            '이전 저장을 읽지 못해 직전 백업을 열었어요. 설정에서 백업 파일을 먼저 내보내세요.',
          blocked: true,
        };
    } catch {
      /* keep original data intact for manual recovery */
    }
    return {
      state: baseState(),
      issue:
        '저장 공간을 읽을 수 없거나 파일이 손상됐어요. 기존 데이터는 덮어쓰지 않았어요. 설정에서 복원·초기화를 선택하세요.',
      blocked: true,
    };
  }
}
export function commitLocal(state, command, storage = globalThis.localStorage) {
  const raw = storage.getItem(SAVE_KEY);
  if (raw && parseSave(raw).revision !== state.revision)
    throw new GameError(
      'SAVE_CONFLICT',
      '다른 창에서 기록이 바뀌었어요. 최신 저장을 불러온 뒤 다시 시도하세요.',
    );
  if (!raw && state.revision > 0)
    throw new GameError(
      'SAVE_CONFLICT',
      '다른 창에서 저장이 초기화됐어요. 최신 저장을 확인하세요.',
    );
  const next = transition(state, command);
  if (raw) storage.setItem(BACKUP_KEY, raw);
  storage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}
export function replaceLocal(raw, storage = globalThis.localStorage) {
  const state = parseSave(raw);
  const existing = storage.getItem(SAVE_KEY);
  if (existing) storage.setItem(BACKUP_KEY, existing);
  storage.setItem(SAVE_KEY, JSON.stringify(state));
  return state;
}
