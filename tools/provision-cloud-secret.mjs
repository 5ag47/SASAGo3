import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
const cli = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const run = (args, options = {}) =>
  spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', ...options });
const listing = run(['secret', 'list']);
if (listing.status !== 0) {
  console.error('서버 비밀값 목록을 확인하지 못했습니다. 계정 연결을 확인하세요.');
  process.exit(1);
}
const names = JSON.parse(listing.stdout);
if (names.some((item) => item.name === 'PLAYER_ID_SECRET')) {
  console.log('PLAYER_ID_SECRET already exists; preserved without rotation.');
  process.exit(0);
}
mkdirSync(resolve(root, '.local'), { recursive: true });
const path = resolve(root, '.local/cloudflare-player-secret');
if (!existsSync(path))
  writeFileSync(path, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
const secret = readFileSync(path, 'utf8').trim();
if (!/^[0-9a-f]{64}$/.test(secret))
  throw new Error('Invalid private backup; refused to change the server secret.');
const result = run(['secret', 'put', 'PLAYER_ID_SECRET'], {
  input: secret,
  stdio: ['pipe', 'inherit', 'inherit'],
});
process.exitCode = result.status ?? 1;
