import { useCallback, useEffect, useRef, useState } from 'react';
import { baseState, SAVE_KEY } from '../../domain/state.js';
import { GameError } from '../../domain/engine.js';
import { commitLocal, loadLocal, replaceLocal, resetLocal } from '../../platform/local-save.js';
import { downloadJson, exportDiagnostics, record } from '../../platform/diagnostics.js';
import {
  SERVER_MODE,
  serverCommand,
  serverLoad,
  serverReset,
  clearServerSession,
} from '../../platform/server-client.js';
import { getFirebaseAuth, loginGoogle, logoutGoogle } from '../../platform/auth.js';
import { withDeadline } from '../../platform/deadline.js';
import {
  minigameSummary,
  scheduleChanges,
  taskCommandSummary,
} from '../../platform/command-log.js';

async function withSaveLock(fn) {
  if (navigator.locks) return navigator.locks.request('sasago3-year-save', fn);
  return fn();
}
export default function useGame({
  serverMode = SERVER_MODE,
  readAuth = getFirebaseAuth,
  readServer = serverLoad,
  bootTimeoutMs = 15000,
} = {}) {
  const [loaded] = useState(() => (serverMode ? { state: baseState(), issue: null } : loadLocal()));
  const [state, setState] = useState(loaded.state);
  const current = useRef(state);
  current.current = state;
  const running = useRef(false);
  const [busy, setBusy] = useState(serverMode);
  const [issue, setIssue] = useState(loaded.issue);
  const blocked = useRef(Boolean(loaded.blocked));
  const [conflict, setConflict] = useState(false);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [user, setUser] = useState(null);
  const [signedOut, setSignedOut] = useState(false);
  const [message, setMessage] = useState('');
  const notify = useCallback((text) => setMessage(text), []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    let alive = true;
    const onStorage = (e) => {
      if (e.key === SAVE_KEY && e.newValue !== JSON.stringify(current.current)) setConflict(true);
    };
    window.addEventListener('storage', onStorage);
    if (serverMode) {
      running.current = true;
      withDeadline(readAuth(), bootTimeoutMs, 'AUTH_INIT_TIMEOUT')
        .then((a) => {
          if (!alive) return;
          if (a.currentUser)
            return readServer().then((s) => {
              if (!alive) return;
              setUser(a.currentUser.uid);
              current.current = s;
              setState(s);
            });
        })
        .catch((error) => {
          if (alive) {
            if (error.code === 'CLIENT_UPDATE_REQUIRED') setUpdateRequired(true);
            setIssue('로그인 준비를 완료하지 못했습니다. 다시 로그인을 눌러 주세요.');
            record('warn', 'BOOT_CHECK_FAILED', { reason: error.code ?? error.name });
          }
        })
        .finally(() => {
          if (alive) {
            running.current = false;
            setBusy(false);
          }
        });
    }
    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  async function send(command) {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    const source = current.current;
    try {
      if (conflict || blocked.current)
        throw new GameError('SAVE_CONFLICT', '저장 문제를 먼저 해결해 주세요.');
      const next = serverMode
        ? await serverCommand(source, command, crypto.randomUUID())
        : await withSaveLock(() => commitLocal(source, command));
      const safeCommand =
        command.type === 'create'
          ? { ...command, profile: { ...command.profile, name: '[비공개]' } }
          : command;
      record('info', 'COMMAND_OK', {
        command: safeCommand,
        fromRevision: source.revision,
        toRevision: next.revision,
        week: next.week,
        ...(['plan', 'preset', 'copy_day'].includes(command.type)
          ? { scheduleChanges: scheduleChanges(source, next) }
          : {}),
        before: {
          stats: source.stats,
          courseMastery: source.courseMastery,
          money: source.money,
          seed: source.seed,
          minigames: minigameSummary(source),
          ...(command.type === 'task_game' ? { task: taskCommandSummary(source, command) } : {}),
        },
        after: {
          stats: next.stats,
          courseMastery: next.courseMastery,
          money: next.money,
          seed: next.seed,
          minigames: minigameSummary(next),
          ...(command.type === 'task_game' ? { task: taskCommandSummary(next, command) } : {}),
        },
      });
      current.current = next;
      setState(next);
      setIssue(null);
      return next;
    } catch (error) {
      const code = error.code ?? error.name;
      if (code === 'CLIENT_UPDATE_REQUIRED') {
        setUpdateRequired(true);
        setConflict(true);
        setIssue(error.message);
      }
      if (
        ['SAVE_CONFLICT', 'REVISION_CONFLICT', 'CSRF_INVALID', 'TASK_INPUT_CONFLICT'].includes(code)
      ) {
        setConflict(true);
        setIssue(error.message);
      }
      if (error.outcomeUnknown) {
        setConflict(true);
        setIssue(error.message);
      }
      if (code === 'AUTH_INVALID' || code === 'AUTH_REQUIRED') setUser(null);
      record('error', code, {
        command: command.type,
        revision: source.revision,
        week: source.week,
        trace: error.trace,
      });
      notify(
        error instanceof GameError
          ? `${error.message}${error.trace ? ` (요청 ID: ${error.trace})` : ''}`
          : '요청을 완료하지 못했어요. 기록을 보존했으니 다시 불러와 주세요.',
      );
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    try {
      const loaded = serverMode ? { state: await readServer() } : loadLocal();
      if (serverMode) setUser((await readAuth()).currentUser?.uid ?? null);
      current.current = loaded.state;
      setState(loaded.state);
      blocked.current = Boolean(loaded.blocked);
      setConflict(false);
      setIssue(loaded.issue ?? null);
      notify('최신 저장을 불러왔어요.');
      return loaded.state;
    } catch (error) {
      if (error.code === 'CLIENT_UPDATE_REQUIRED') {
        setUpdateRequired(true);
        setConflict(true);
        setIssue(error.message);
      }
      notify(
        error.code === 'CLIENT_UPDATE_REQUIRED'
          ? error.message
          : '서버를 불러오지 못했어요. 연결을 확인하세요.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function login() {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    try {
      const result = await loginGoogle();
      const next = await readServer();
      setUser(result.user.uid);
      current.current = next;
      setState(next);
      setSignedOut(false);
      setIssue(null);
      setConflict(false);
      blocked.current = false;
    } catch (error) {
      if (error.code === 'CLIENT_UPDATE_REQUIRED') {
        setUpdateRequired(true);
        setIssue(error.message);
      }
      record('error', 'LOGIN_FAILED', { reason: String(error.code ?? error.message).slice(0, 80) });
      notify(
        error.code === 'CLIENT_UPDATE_REQUIRED'
          ? error.message
          : error.code === 'AUTH_INIT_TIMEOUT'
            ? '로그인 준비가 지연되었습니다. 연결을 확인하고 다시 눌러 주세요.'
            : '로그인을 완료하지 못했어요. Google 활성화·허용 도메인·서버 설정을 확인하세요.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    try {
      if (serverMode) {
        await logoutGoogle();
        clearServerSession();
        setUser(null);
        const empty = baseState();
        current.current = empty;
        setState(empty);
      }
      setSignedOut(true);
      setConflict(false);
      setIssue(null);
      return true;
    } catch {
      notify('로그아웃하지 못했습니다. 다시 시도해 주세요.');
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function reset() {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    try {
      const next = serverMode
        ? await serverReset(current.current)
        : await withSaveLock(() => resetLocal(current.current, { allowDamaged: blocked.current }));
      current.current = next;
      setState(next);
      blocked.current = false;
      setConflict(false);
      setIssue(null);
      setSignedOut(false);
      notify('새 이야기를 시작할 준비가 됐어요.');
      return true;
    } catch (error) {
      if (error.outcomeUnknown) {
        setConflict(true);
        setIssue(error.message);
      }
      record('error', error.code ?? 'RESET_FAILED', {
        trace: error.trace,
        revision: current.current.revision,
      });
      notify(
        error.outcomeUnknown
          ? error.message
          : '초기화를 완료하지 못했습니다. 최신 기록을 확인해 주세요.',
      );
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function importSave(file) {
    if (serverMode) return notify('서버 모드에서는 외부 저장을 덮어쓸 수 없어요.');
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    try {
      if (file.size > 1500000) throw new Error('size');
      const raw = await file.text();
      const next = await withSaveLock(() => replaceLocal(raw));
      current.current = next;
      setState(next);
      blocked.current = false;
      setIssue(null);
      setConflict(false);
      notify('저장 파일을 복원했어요.');
    } catch {
      notify('파일 형식·버전·크기가 올바르지 않아 적용하지 않았어요.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return {
    state,
    busy,
    send,
    issue,
    conflict,
    updateRequired,
    refreshClient: () => window.location.reload(),
    reload,
    message,
    notify,
    reset,
    importSave,
    mode: serverMode ? 'server' : 'local',
    user,
    login,
    logout,
    signedOut,
    resume: () => setSignedOut(false),
    backup: () => downloadJson('sasago3-save.json', state),
    diagnostics: () => exportDiagnostics(state, serverMode ? 'server' : 'local'),
  };
}
