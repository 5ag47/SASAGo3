import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyAssignmentPatch } from '../src/domain/assignment-edits.js';
import { courses, STATS, storyEvents, lifeEvents } from '../src/domain/catalog.js';
import { applyContentFile, applyCli } from './content-files.mjs';
export function applyPatchFile(
  root,
  patch,
  context = {
    courses,
    stats: STATS,
    reservedIds: [...Object.keys(storyEvents), ...Object.keys(lifeEvents)],
  },
) {
  return applyContentFile(
    root,
    { file: 'assignments.json', backups: 'task-edit-backups' },
    patch,
    (current, change) => applyAssignmentPatch(current, change, context),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  applyCli(fileURLToPath(new URL('../', import.meta.url)), applyPatchFile, 'tasks');
