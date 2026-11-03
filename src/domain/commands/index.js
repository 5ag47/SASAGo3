import { profileCommands } from './profile.js';
import { planningCommands } from './planning.js';
import { taskGameCommands } from './task-game.js';
import { choiceCommands } from './choice.js';
import { progressionCommands } from './progression.js';
import { admissionsCommands } from './admissions.js';
const entries = [
  profileCommands,
  planningCommands,
  taskGameCommands,
  choiceCommands,
  progressionCommands,
  admissionsCommands,
].flatMap(Object.entries);
if (new Set(entries.map(([id]) => id)).size !== entries.length)
  throw new Error('DUPLICATE_COMMAND');
for (const [id, definition] of entries) {
  if (
    !Array.isArray(definition.fields) ||
    !definition.fields.includes('type') ||
    typeof definition.apply !== 'function'
  )
    throw new Error('COMMAND_CONTRACT:' + id);
  Object.freeze(definition.fields);
  Object.freeze(definition);
}
export const COMMANDS = Object.freeze(Object.fromEntries(entries));
