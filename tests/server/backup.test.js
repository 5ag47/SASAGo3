import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sealBackup, openBackup } from '../../tools/backup/archive.js';
import { verifyBackup } from '../../tools/backup/verify.js';
import { createGame } from '../../src/domain/engine.js';
const secret = 'unit-test-only-backup-secret-01234567890123456789';
function payload(revision = 0) {
  const state = createGame({
    name: '비공개 이름',
    character: 'girl',
    role: 'steady',
    major: 'math',
  });
  const sql = readFileSync(new URL('../../server/schema.sql', import.meta.url), 'utf8');
  return {
    sql: `${sql}\nINSERT INTO players(id,revision,state,updated_at) VALUES('test-player',${revision},'${JSON.stringify(state).replaceAll("'", "''")}',0);`,
  };
}
test('backup encryption authenticates the archive and uses a new nonce for every export', () => {
  const data = payload(),
    first = sealBackup(data, secret),
    second = sealBackup(data, secret);
  assert.notEqual(first.iv, second.iv);
  assert.deepEqual(openBackup(first, secret), data);
  assert.ok(!JSON.stringify(first).includes('비공개 이름'));
  assert.ok(!JSON.stringify(first).includes('CREATE TABLE'));
  assert.throws(() => openBackup(first, `${secret}wrong`), /BACKUP_AUTHENTICATION_FAILED/);
  const bytes = Buffer.from(first.data, 'base64');
  bytes[0] ^= 1;
  assert.throws(
    () => openBackup({ ...first, data: bytes.toString('base64') }, secret),
    /BACKUP_AUTHENTICATION_FAILED/,
  );
});
test('restore drills verify player schemas and revision protection in an isolated memory database', () => {
  const data = payload(),
    before = structuredClone(data);
  assert.deepEqual(verifyBackup(openBackup(sealBackup(data, secret), secret)), {
    integrity: 'ok',
    players: 1,
    receipts: 0,
    revisionCheck: true,
  });
  assert.deepEqual(data, before);
  assert.throws(() => verifyBackup(payload(9)), /BACKUP_STATE_INVALID/);
  assert.throws(() => sealBackup(data, ''), /BACKUP_KEY_MISSING/);
});
