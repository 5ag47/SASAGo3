// Stable facade: consumers do not depend on migration order or validation internals.
export { SCHEMA_VERSION, SAVE_KEY, CONTENT_VERSION } from './version.js';
export { baseState, balancedPlan } from './state/base.js';
export { migrateState } from './state/migrate.js';
export { validateState } from './state/validate.js';
