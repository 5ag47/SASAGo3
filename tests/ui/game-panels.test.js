import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import { createGame, transition } from '../../src/domain/engine.js';
import { beginWeek } from '../../src/domain/events.js';
import { SAVE_KEY } from '../../src/domain/state.js';

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null },
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  appType: 'custom',
  logLevel: 'error',
});
const { default: EventDialog } = await vite.ssrLoadModule(
  '/src/features/year-game/EventDialog.jsx',
);
const { default: DayCopy } = await vite.ssrLoadModule('/src/features/year-game/DayCopy.jsx');
const { default: YearGame } = await vite.ssrLoadModule('/src/features/year-game/YearGame.jsx');
test.after(() => vite.close());
function fresh() {
  return createGame({ name: '화면 테스트', character: 'boy', role: 'steady', major: 'math' });
}
async function mount(t) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://game.example' });
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  for (const name of ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'])
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  const root = createRoot(document.getElementById('root'));
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const name of [
      'window',
      'document',
      'navigator',
      'localStorage',
      'sessionStorage',
      'IS_REACT_ACT_ENVIRONMENT',
    ]) {
      if (previous[name]) Object.defineProperty(globalThis, name, previous[name]);
      else delete globalThis[name];
    }
  });
  return async (component, props) =>
    act(async () => root.render(component ? React.createElement(component, props) : null));
}
const click = async (button) => act(async () => button.click());

test('interview UI resumes the next unanswered question after remount and displays the completed review', async (t) => {
  const render = await mount(t);
  let state = fresh();
  state.week = 36;
  state.pending = ['interview_day'];
  const answers = [];
  const props = () => ({
    state,
    eventId: 'interview_day',
    onDone() {},
    onChoose(command) {
      answers.push(command);
      state = transition(state, { type: 'choose', ...command });
    },
  });
  await render(EventDialog, props());
  await click(document.querySelectorAll('.choice-row')[1]);
  assert.deepEqual(answers[0], { event: 'interview_day', option: 'answer:1' });
  await render(null);
  state = JSON.parse(JSON.stringify(state));
  await render(EventDialog, props());
  assert.match(document.body.textContent, /질문 2 \/ 3/);
  await click(document.querySelectorAll('.choice-row')[2]);
  await render(EventDialog, props());
  await click(document.querySelectorAll('.choice-row')[0]);
  await render(EventDialog, props());
  assert.equal(document.querySelectorAll('.interview-review li').length, 3);
  assert.equal(document.querySelectorAll('.choice-row').length, 0);
  assert.match(document.body.textContent, /내 답변/);
});

test('card UI shows playable hands, disables them during save, and resumes the same board after remount', async (t) => {
  const render = await mount(t);
  let state = fresh();
  state.week = 38;
  state.pending = [];
  beginWeek(state);
  state = transition(state, { type: 'choose', event: 'dorm_cards', option: 'play' });
  let move;
  const props = (busy = false) => ({
    state,
    eventId: 'dorm_cards',
    busy,
    onDone() {},
    onChoose(command) {
      move = command;
      state = transition(state, { type: 'choose', ...command });
    },
  });
  await render(EventDialog, props(true));
  assert.equal(document.querySelectorAll('.card-hand button').length, 3);
  assert.ok([...document.querySelectorAll('.card-hand button')].every((button) => button.disabled));
  await render(EventDialog, props());
  await click(document.querySelector('.card-hand button'));
  assert.match(move.option, /^card:\d+$/);
  await render(null);
  state = JSON.parse(JSON.stringify(state));
  await render(EventDialog, props());
  assert.match(document.body.textContent, /2 \/ 8턴/);
  assert.equal(document.querySelectorAll('.card-move-log li').length, 1);
});

test('day copy UI requires a selected destination and sends a single command including Sunday', async (t) => {
  const render = await mount(t);
  let submitted;
  await render(DayCopy, {
    state: fresh(),
    sourceDay: 0,
    onCopy: async (...args) => {
      submitted = args;
      return true;
    },
  });
  await click(document.querySelector('.day-copy-toggle'));
  assert.equal(document.querySelector('.day-copy-body .primary').disabled, true);
  const sunday = [...document.querySelectorAll('.day-copy-targets label')].find(
    (label) => label.textContent === '일',
  );
  await click(sunday.querySelector('input'));
  assert.match(document.querySelector('.day-copy-body .primary').textContent, /1일 · 3칸/);
  await click(document.querySelector('.day-copy-body .primary'));
  assert.deepEqual(submitted, [0, [6]]);
  assert.equal(document.querySelector('.day-copy-body'), null);
});

test('the complete game keeps the interview result open and supports closing and resuming before the last answer', async (t) => {
  const render = await mount(t);
  const state = fresh();
  state.week = 36;
  state.pending = ['interview_day'];
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  await render(YearGame);
  const openInterview = async () => {
    await click(document.querySelector('button[aria-label="알림"]'));
    await click(document.querySelector('.pending-notices button'));
  };
  await openInterview();
  await click(document.querySelectorAll('dialog .choice-row')[1]);
  assert.match(document.querySelector('dialog').textContent, /질문 2 \/ 3/);
  await click(document.querySelector('dialog button[aria-label="닫기"]'));
  await openInterview();
  assert.match(document.querySelector('dialog').textContent, /질문 2 \/ 3/);
  await click(document.querySelectorAll('dialog .choice-row')[2]);
  await click(document.querySelectorAll('dialog .choice-row')[0]);
  assert.equal(document.querySelectorAll('dialog .interview-review li').length, 3);
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  assert.equal(saved.minigames.interview.phase, 'finished');
  assert.ok(!saved.pending.includes('interview_day'));
  await click(document.querySelector('dialog .interview-game > button'));
  assert.equal(document.querySelector('dialog'), null);
});
