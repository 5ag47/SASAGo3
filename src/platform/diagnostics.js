import { CONTENT_VERSION } from '../domain/state.js';
const LOG_KEY = 'sasago3-diagnostics-session-v1';
function restoreEntries() {
  try {
    const raw = globalThis.sessionStorage?.getItem(LOG_KEY);
    if (!raw || raw.length > 250000) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .filter(
            (entry) =>
              entry &&
              typeof entry.code === 'string' &&
              typeof entry.at === 'string' &&
              ['info', 'warn', 'error'].includes(entry.level),
          )
          .slice(-200)
      : [];
  } catch {
    return [];
  }
}
const entries = restoreEntries();
export const diagnosticLogSnapshot = () => structuredClone(entries);
export function record(level, code, detail = {}) {
  // Deliberately record only bounded, selected fields. Never capture tokens, names or request headers.
  const entry = { at: new Date().toISOString(), level, code, ...detail };
  entries.push(entry);
  if (entries.length > 200) entries.shift();
  try {
    let serialized = JSON.stringify(entries);
    while (serialized.length > 250000 && entries.length > 1) {
      entries.shift();
      serialized = JSON.stringify(entries);
    }
    globalThis.sessionStorage?.setItem(LOG_KEY, serialized);
  } catch {
    /* Log storage failure must not block the game. */
  }
  if (level === 'error') console.error(`[SASAGo3:${code}]`, detail);
}
export function downloadJson(filename, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportDiagnostics(state, mode) {
  const sanitized = {
    ...state,
    name: '[비공개]',
    seed: mode === 'server' ? '[서버 보관]' : state.seed,
  };
  downloadJson('sasago3-diagnostics.json', {
    app: 'SASAGo3',
    contentVersion: CONTENT_VERSION,
    mode,
    exportedAt: new Date().toISOString(),
    logs: entries,
    state: sanitized,
  });
}
export function installErrorLogging() {
  const error = (e) =>
    record('error', 'UNCAUGHT', {
      message: String(e.message ?? '').slice(0, 250),
      file: String(e.filename ?? '')
        .split('/')
        .at(-1),
      line: e.lineno,
    });
  const rejection = (e) =>
    record('error', 'UNHANDLED_REJECTION', {
      message: String(e.reason?.code ?? e.reason?.name ?? 'unknown').slice(0, 100),
    });
  window.addEventListener('error', error);
  window.addEventListener('unhandledrejection', rejection);
  return () => {
    window.removeEventListener('error', error);
    window.removeEventListener('unhandledrejection', rejection);
  };
}
