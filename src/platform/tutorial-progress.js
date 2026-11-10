export const TUTORIAL_EVIDENCE = [
  'stats',
  'courses',
  'shop',
  'notices',
  'study-event',
  'calendar:4',
  'result-read',
];
export async function tutorialStorageKey(owner, runRevision = 0) {
  const bytes = new TextEncoder().encode(`${owner ?? 'local'}:${runRevision}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `sasago3-tutorial-ui-v2:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
export function readTutorialVisits(key, storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 4096) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? [...new Set(value.filter((id) => TUTORIAL_EVIDENCE.includes(id)))]
      : [];
  } catch {
    return [];
  }
}
export function writeTutorialVisits(key, visits, storage = globalThis.localStorage) {
  try {
    storage.setItem(key, JSON.stringify(visits.filter((id) => TUTORIAL_EVIDENCE.includes(id))));
  } catch {
    /* Read-only UI progress must not prevent gameplay. */
  }
}
