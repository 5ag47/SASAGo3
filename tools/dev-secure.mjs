import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, VITE_SERVER_MODE: 'true' };
if (
  !env.VITE_FIREBASE_PROJECT_ID ||
  !env.VITE_FIREBASE_API_KEY ||
  !env.VITE_FIREBASE_AUTH_DOMAIN ||
  !env.VITE_FIREBASE_APP_ID
) {
  console.error(
    '먼저 .env.example을 .env.local로 복사하고 Firebase 공개 설정 4개를 입력하세요. docs/firebase-setup.md에 단계별 안내가 있어요.',
  );
  process.exit(1);
}
const api = spawn(process.execPath, ['--watch', 'server/node.mjs'], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: true,
});
const vite = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5173', '--strictPort'],
  { cwd: root, env, stdio: 'inherit', windowsHide: true },
);
function stop() {
  api.kill();
  vite.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => {
  if (code) {
    vite.kill();
    process.exitCode = code;
  }
});
vite.on('exit', stop);
