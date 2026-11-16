import { ACTIVITIES, DAYS } from '../data/activities.js';
import { TASKS } from '../game.js';
import { advanceWeek } from './week.js';

function validProfile(name, character) {
  return typeof name === 'string' && name.trim().length > 0
    && name.trim().length <= 12 && ['boy', 'girl'].includes(character);
}

// All gameplay changes go through this reducer; UI components never mutate a save directly.
export function gameReducer(game, action) {
  switch (action.type) {
    case 'create':
      if (game.created || !validProfile(action.name, action.character)) return game;
      return { ...game, created: true, name: action.name.trim(), character: action.character };
    case 'profile':
      if (!game.created || !validProfile(action.name, action.character)) return game;
      return { ...game, name: action.name.trim(), character: action.character };
    case 'toggle-night':
      return game.created ? { ...game, night: !game.night } : game;
    case 'toggle-task':
      if (!game.created || !Number.isInteger(action.index) || action.index < 0 || action.index >= TASKS.length) return game;
      return { ...game, tasks: game.tasks.map((done, index) => index === action.index ? !done : done) };
    case 'set-plan':
      if (!game.created || !Number.isInteger(action.day) || action.day < 0 || action.day >= DAYS.length
        || !Object.hasOwn(ACTIVITIES, action.activity)) return game;
      return { ...game, plan: game.plan.map((id, day) => day === action.day ? action.activity : id) };
    case 'advance-week':
      return game.created ? advanceWeek(game) : game;
    default:
      return game;
  }
}
