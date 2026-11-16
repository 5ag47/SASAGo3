import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyPatchFile } from '../../tools/apply-assignments.mjs';
import { buildAssignmentPatch } from '../../src/domain/assignment-edits.js';
import { courses, STATS } from '../../src/domain/catalog.js';
test('assignment file application keeps a backup, merges different records and refuses an occupied lock', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'sasago3-authoring-'));
  const data = join(root, 'data');
  mkdirSync(data);
  t.after(() => {
    const backups = join(root, '.local/task-edit-backups');
    for (const file of readdirSync(backups)) unlinkSync(join(backups, file));
    rmdirSync(backups);
    rmdirSync(join(root, '.local'));
    for (const file of readdirSync(data)) unlinkSync(join(data, file));
    rmdirSync(data);
    rmdirSync(root);
  });
  const task = { kind: 'task', name: '검증', description: '', week: 1, deadline: 2, target: 1 };
  const base = { test_task: task, other_task: { ...task } };
  const edited = structuredClone(base);
  edited.test_task.name = '수정';
  const latest = structuredClone(base);
  latest.other_task.name = '동료';
  const target = join(data, 'assignments.json');
  writeFileSync(target, JSON.stringify(latest));
  const patch = buildAssignmentPatch(base, edited);
  const result = applyPatchFile(root, patch, { courses, stats: STATS });
  assert.equal(result.changed, true);
  assert.equal(JSON.parse(readFileSync(target, 'utf8')).other_task.name, '동료');
  assert.deepEqual(JSON.parse(readFileSync(result.backup, 'utf8')), latest);
  const before = readFileSync(target, 'utf8');
  assert.deepEqual(applyPatchFile(root, patch, { courses, stats: STATS }).conflicts, ['test_task']);
  assert.equal(readFileSync(target, 'utf8'), before);
  writeFileSync(join(data, '.assignments.lock'), '');
  assert.throws(() => applyPatchFile(root, patch), /적용을 중단/);
  assert.equal(readFileSync(target, 'utf8'), before);
});
