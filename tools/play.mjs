// One-step local launcher: no deploy and, by default, no account.
// Checks Node, installs packages only when the lockfile changed, picks a port,
// reuses a game this launcher already started, and opens the browser when ready.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const SESSION_FILE = join(root, '.local', 'play-session.json');
const LOCK_STAMP = join(root, 'node_modules', '.sasago3-lock-hash');
const FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];
const LOCAL_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
const LOGIN = { url: 'http://localhost:5173/', ports: [5173, 4174] };

const say = (message) => console.log(`[SASAGo3] ${message}`);
function fail(message) {
  console.error(`\n[SASAGo3] ${message}\n`);
  process.exit(1);
}

export function nodeVersionOk(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

// Only reports which keys have a value; never returns or prints the values themselves.
export function presentEnvKeys(text) {
  const keys = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match && match[2].replace(/^["']|["']$/g, '').trim()) keys.add(match[1]);
  }
  return keys;
}
export function loginConfigured(path = join(root, '.env.local')) {
  if (!existsSync(path)) return false;
  const keys = presentEnvKeys(readFileSync(path, 'utf8'));
  return FIREBASE_KEYS.every((key) => keys.has(key));
}

const lockHash = () =>
  createHash('sha256')
    .update(readFileSync(join(root, 'package-lock.json')))
    .digest('hex');
// Install when packages are missing or package-lock.json changed since the last launcher install.
// An existing install without a stamp is trusted once and stamped, so nothing is reinstalled needlessly.
export function packagesStatus() {
  if (!existsSync(join(root, 'node_modules', 'vite', 'bin', 'vite.js'))) return 'missing';
  if (!existsSync(LOCK_STAMP)) return 'unstamped';
  return readFileSync(LOCK_STAMP, 'utf8').trim() === lockHash() ? 'ready' : 'changed';
}
function ensurePackages() {
  const status = packagesStatus();
  if (status === 'unstamped') writeFileSync(LOCK_STAMP, lockHash());
  if (status === 'ready' || status === 'unstamped') return;
  say(
    status === 'missing'
      ? '처음 실행이라 필요한 패키지를 설치해요. 1~2분 걸릴 수 있어요.'
      : 'package-lock.json이 바뀌어서 패키지를 다시 맞춰요.',
  );
  const result = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0)
    fail(
      '패키지 설치에 실패했어요. 인터넷 연결을 확인하고, 이 폴더를 연 다른 실행 창을 모두 닫은 뒤 다시 실행해 주세요.',
    );
  writeFileSync(LOCK_STAMP, lockHash());
}

// A port is busy if any loopback address already has a listener on it.
export async function portFree(port) {
  for (const host of ['127.0.0.1', '::1']) {
    const result = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', (error) => resolve(error.code === 'EADDRINUSE' ? 'busy' : 'skip'));
      server.once('listening', () => server.close(() => resolve('free')));
      server.listen(port, host);
    });
    if (result === 'busy') return false;
  }
  return true;
}
export async function servesGame(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.text()).includes('SASAGo3');
  } catch {
    return false;
  }
}
function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function runningSession() {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    const session = JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
    if (processAlive(session.pid) && (await servesGame(session.url))) return session;
  } catch {
    // A damaged session note only means nothing reusable is known.
  }
  rmSync(SESSION_FILE, { force: true });
  return null;
}

function openBrowser(url) {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  const child = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
    windowsVerbatimArguments: process.platform === 'win32',
  });
  child.on('error', () => say(`브라우저에서 ${url} 을 직접 열어 주세요.`));
  child.unref();
}
async function waitForGame(url, child) {
  for (let elapsed = 0; elapsed < 90_000 && child.exitCode === null; elapsed += 500) {
    if (await servesGame(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const shouldOpen = !args.has('--no-open');
  if (!nodeVersionOk())
    fail(
      `지금 Node.js ${process.versions.node}이 설치되어 있어요. 22.12 이상이 필요해요. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요.`,
    );
  let mode = args.has('--login') ? 'login' : 'local';
  if (mode === 'login' && !loginConfigured()) {
    say('.env.local에 Firebase 설정 4개가 없어 로그인 없는 모드로 실행해요.');
    say('로그인 모드 설정 방법은 docs/firebase-setup.md에 있어요.');
    mode = 'local';
  }

  const existing = await runningSession();
  if (existing?.mode === mode) {
    say(`이미 실행 중인 게임이 있어요. ${existing.url} 을 열어요.`);
    if (shouldOpen) openBrowser(existing.url);
    return;
  }
  if (existing)
    fail(
      `다른 모드의 게임이 이미 켜져 있어요 (${existing.url}). 그 실행 창에서 Ctrl+C로 끈 뒤 다시 실행해 주세요.`,
    );

  ensurePackages();

  let url, child;
  if (mode === 'login') {
    for (const port of LOGIN.ports)
      if (!(await portFree(port)))
        fail(
          `${port} 포트를 다른 프로그램이 쓰고 있어요. 예전에 켜 둔 SASAGo3 창(npm run dev:secure 등)을 닫고 다시 실행해 주세요.`,
        );
    url = LOGIN.url;
    child = spawn(process.execPath, ['--env-file-if-exists=.env.local', 'tools/dev-secure.mjs'], {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
    });
  } else {
    let port = null;
    for (const candidate of LOCAL_PORTS)
      if (await portFree(candidate)) {
        port = candidate;
        break;
      }
    if (port === null)
      fail('5173~5180 포트가 모두 사용 중이에요. 다른 개발 서버 창을 닫고 다시 실행해 주세요.');
    url = `http://127.0.0.1:${port}/`;
    child = spawn(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort',
      ],
      {
        cwd: root,
        // Already-set variables win over .env files, so this stays the browser-save mode.
        env: { ...process.env, VITE_SERVER_MODE: 'false' },
        stdio: 'inherit',
        windowsHide: true,
      },
    );
  }

  mkdirSync(join(root, '.local'), { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify({ mode, url, pid: process.pid }));
  const cleanup = () => rmSync(SESSION_FILE, { force: true });
  const stop = () => child.exitCode === null && child.kill();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', (code) => {
    cleanup();
    process.exitCode = code ?? 0;
  });

  if (await waitForGame(url, child)) {
    console.log('');
    say(
      mode === 'login'
        ? `준비됐어요 → ${url}  (Google 로그인 · 기록은 이 컴퓨터의 로컬 서버에 저장)`
        : `준비됐어요 → ${url}  (로그인 없음 · 기록은 이 브라우저에만 저장)`,
    );
    say('끄려면 이 창에서 Ctrl+C를 누르세요.');
    console.log('');
    if (shouldOpen) openBrowser(url);
  } else if (child.exitCode === null) {
    say(`아직 열리지 않았어요. 잠시 뒤 브라우저에서 ${url} 을 열어 보세요.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
