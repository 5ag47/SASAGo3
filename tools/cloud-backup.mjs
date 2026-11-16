import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { sealBackup, openBackup } from './backup/archive.js';
import { verifyBackup } from './backup/verify.js';
const root = resolve(import.meta.dirname, '..'),
  folder = resolve(root, '.local/cloud-backups');
const config = readFileSync(resolve(root, 'wrangler.toml'), 'utf8');
const database = config.match(/^database_name\s*=\s*"([a-z0-9-]+)"/m)?.[1];
const databaseId = config.match(/^database_id\s*=\s*"([a-f0-9-]+)"/m)?.[1];
const cli = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
function wrangler(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.status !== 0) {
    const code =
      `${result.stdout}${result.stderr}`.match(/\[code:\s*(\d+)\]/)?.[1] ??
      result.status ??
      'TIMEOUT';
    throw new Error(
      `BACKUP_${args.slice(0, 3).join('_').toUpperCase().replaceAll('-', '_')}_${code}`,
    );
  }
  return result.stdout;
}
function safeArchive(path) {
  const rel = relative(folder, resolve(path));
  if (rel.startsWith('..') || isAbsolute(rel) || !rel.endsWith('.json'))
    throw new Error('BACKUP_PATH');
  return resolve(path);
}
let temporary;
try {
  if (!database || !databaseId) throw new Error('BACKUP_DATABASE_CONFIG');
  const secretPath = resolve(root, '.local/cloudflare-player-secret');
  if (!existsSync(secretPath)) throw new Error('BACKUP_KEY_MISSING');
  const secret = readFileSync(secretPath, 'utf8').trim();
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const verifyIndex = process.argv.indexOf('--verify');
  let archivePath;
  if (verifyIndex >= 0) archivePath = safeArchive(process.argv[verifyIndex + 1] ?? '');
  else {
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
    temporary = resolve(folder, `.export-${id}.sql`);
    const bookmark = JSON.parse(wrangler(['d1', 'time-travel', 'info', database, '--json']));
    wrangler(['d1', 'export', database, '--remote', '--skip-confirmation', '--output', temporary]);
    const archive = sealBackup(
      {
        database,
        databaseId,
        createdAt: new Date().toISOString(),
        bookmark,
        sql: readFileSync(temporary, 'utf8'),
      },
      secret,
    );
    archivePath = resolve(folder, `${id}.json`);
    writeFileSync(archivePath, JSON.stringify(archive), { flag: 'wx', mode: 0o600 });
  }
  const bytes = readFileSync(archivePath),
    payload = openBackup(JSON.parse(bytes), secret);
  if (payload.databaseId !== databaseId) throw new Error('BACKUP_WRONG_DATABASE');
  const report = verifyBackup(payload);
  const result = {
    database,
    createdAt: payload.createdAt,
    archive: relative(root, archivePath),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...report,
    restoredToProduction: false,
  };
  writeFileSync(`${archivePath}.report.json`, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // SQL, signed export URLs, account details, game data and secrets must never enter output.
  console.error(
    /^BACKUP_[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : 'BACKUP_FAILED_PRIVATE_DETAILS_OMITTED',
  );
  process.exitCode = 1;
} finally {
  if (temporary && existsSync(temporary)) unlinkSync(temporary);
}
