import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { CONTENT_VERSION } from '../src/domain/state.js';
for (const name of [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
])
  if (!process.env[name]) {
    console.error(`${name} 설정이 필요해요. .env.example과 docs/firebase-setup.md를 확인하세요.`);
    process.exit(1);
  }
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  env: { ...process.env, VITE_SERVER_MODE: 'true' },
  stdio: 'inherit',
  windowsHide: true,
});
if (result.status !== 0) process.exit(result.status ?? 1);
writeFileSync(
  new URL('../dist/build-mode.json', import.meta.url),
  JSON.stringify({ mode: 'server', contentVersion: CONTENT_VERSION }),
);
console.log('Server-only build verified. Browser saves are not accepted by this build.');
