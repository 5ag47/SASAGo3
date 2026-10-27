import { idToken } from './auth.js';
import { createApiTransport } from './api-transport.js';
import { record } from './diagnostics.js';
export const SERVER_MODE = import.meta.env?.VITE_SERVER_MODE === 'true';
const transport = createApiTransport({ getToken: idToken, onTrace: record });
const request = transport.request;
export const clearServerSession = transport.clear;
export async function serverLoad() {
  return (await request('/api/game')).state;
}
export async function serverCommand(state, command, key) {
  return (
    await request('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: state.revision, idempotencyKey: key, command }),
    })
  ).state;
}
export async function serverReset(state) {
  return (
    await request('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: state.revision,
        idempotencyKey: crypto.randomUUID(),
        confirmation: '새로 시작',
      }),
    })
  ).state;
}
