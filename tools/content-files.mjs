import {
  openSync,
  closeSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
export function applyContentFile(root, { file, backups }, patch, apply) {
  if (!/^[a-z][a-z0-9-]*\.json$/.test(file) || !/^[a-z][a-z0-9-]*$/.test(backups))
    throw new Error('CONTENT_FILE_TARGET');
  const name = file.slice(0, -5),
    target = resolve(root, 'data', file);
  const lock = resolve(root, `data/.${name}.lock`),
    temporary = resolve(root, `data/.${name}-${randomUUID()}.tmp`);
  let fd;
  try {
    fd = openSync(lock, 'wx');
  } catch {
    throw new Error(
      '다른 콘텐츠 적용 작업이 진행 중이거나 잠금 파일을 만들 수 없습니다. 적용을 중단했습니다.',
    );
  }
  try {
    const raw = readFileSync(target, 'utf8'),
      result = apply(JSON.parse(raw), patch);
    if (!result.next) return result;
    if (!Object.keys(patch.changes).length) return { ...result, changed: false };
    const backupDir = resolve(root, '.local', backups);
    mkdirSync(backupDir, { recursive: true });
    const backup = join(backupDir, `${Date.now()}-${randomUUID()}.json`);
    writeFileSync(backup, raw, { flag: 'wx' });
    writeFileSync(temporary, JSON.stringify(result.next, null, 2) + '\n', { flag: 'wx' });
    if (readFileSync(target, 'utf8') !== raw)
      throw new Error('적용 중 원본 파일이 변경되었습니다. 덮어쓰지 않았습니다.');
    renameSync(temporary, target);
    return { ...result, changed: true, backup };
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
    closeSync(fd);
    unlinkSync(lock);
  }
}
export function applyCli(root, apply, label) {
  try {
    if (!process.argv[2])
      throw new Error(`사용법: npm run ${label}:apply -- "다운로드한 변경 파일의 전체 경로"`);
    const raw = readFileSync(resolve(process.argv[2]), 'utf8');
    if (raw.length > 500000) throw new Error('변경 파일은 500KB 이하여야 합니다.');
    const result = apply(root, JSON.parse(raw));
    if (!result.next) {
      for (const id of result.conflicts)
        console.error(
          `충돌: ${id} — 편집 후 원본이 바뀌었습니다. 최신 내용을 열어 변경을 비교하세요.`,
        );
      for (const issue of result.issues) console.error(issue);
      process.exitCode = 1;
    } else
      console.log(
        result.changed
          ? `콘텐츠 변경 적용 완료. 원본 백업: ${result.backup}`
          : '적용할 변경이 없습니다.',
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
