import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyCalendarPatch } from '../src/domain/calendar-edits.js';
import { applyContentFile, applyCli } from './content-files.mjs';
export const applyCalendarFile = (root, patch) =>
  applyContentFile(
    root,
    {
      file: 'calendar.json',
      backups: 'calendar-edit-backups',
    },
    patch,
    applyCalendarPatch,
  );
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  applyCli(fileURLToPath(new URL('../', import.meta.url)), applyCalendarFile, 'calendar');
