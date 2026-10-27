import { execFileSync } from 'node:child_process';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8000000 });
const branch = git('branch', '--show-current').trim();
if (['main', 'master'].includes(branch)) {
  console.error('main/master에서 직접 커밋할 수 없습니다. 현재 허용된 개발 브랜치를 사용하세요.');
  process.exit(1);
}
const paths = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z')
  .split('\0')
  .filter(Boolean);
const forbidden =
  /(^|\/)(?:\.env(?:\..+)?|identity-secret|\.local|node_modules|dist)(?:\/|$)|\.(?:sqlite|sqlite-shm|sqlite-wal|db|pem|p12)$/i;
const errors = [];
for (const path of paths) {
  if (path !== '.env.example' && forbidden.test(path)) {
    errors.push(`올리면 안 되는 로컬/비밀 파일: ${path}`);
    continue;
  }
  if (!/\.(?:js|jsx|mjs|json|md|toml|ya?ml|txt|env|example)$/.test(path)) continue;
  const value = git('show', `:${path}`);
  if (
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"private_key"\s*:\s*"-----|gh[pousr]_[A-Za-z0-9]{30,}/.test(
      value,
    )
  )
    errors.push(`비밀값으로 보이는 내용이 있습니다: ${path}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Branch/staged-file guard passed (${paths.length} staged files).`);
