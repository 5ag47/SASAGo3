import { spawnSync } from 'node:child_process';
const npm = process.env.npm_execpath;
if (!npm) throw new Error('npm run verify로 실행하세요.');
const stages = [
  ['run', 'check'],
  ['test'],
  ['run', 'build:secure'],
  ['run', 'tasks:editor:build'],
  ['audit', '--audit-level=high'],
];
for (const args of stages) {
  const result = spawnSync(process.execPath, [npm, ...args], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Release verification passed. Deployment is a separate action.');
