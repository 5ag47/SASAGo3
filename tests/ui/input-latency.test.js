import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false },
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  appType: 'custom',
  logLevel: 'error',
});
const { default: TaskGamePanel } = await vite.ssrLoadModule(
  '/src/features/year-game/TaskGamePanel.jsx',
);
test.after(() => vite.close());
test('a slow save must not delay the next order-game selection', async (t) => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  for (const name of ['window', 'document', 'navigator'])
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const pending = [],
    root = createRoot(document.getElementById('root'));
  t.after(async () => {
    await act(async () => {
      pending.forEach((resolve) => resolve(false));
      root.unmount();
    });
    dom.window.close();
    for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
      if (previous[name]) Object.defineProperty(globalThis, name, previous[name]);
      else delete globalThis[name];
    }
  });
  function Harness() {
    const [busy, setBusy] = useState(false);
    const task = {
      id: 'latency_fixture',
      name: '반응 속도 검사',
      status: 'active',
      target: 2,
      progress: 0,
      module: { id: 'order_v2', params: {} },
      moduleData: {
        kind: 'order',
        cards: [4, 1, 7, 3],
        index: 0,
        mistakes: 0,
        phase: 'play',
        passed: false,
        quality: null,
      },
    };
    return React.createElement(TaskGamePanel, {
      task,
      busy,
      onBack() {},
      onAssign() {},
      onAction() {
        setBusy(true);
        return new Promise((resolve) => pending.push(resolve));
      },
    });
  }
  await act(async () => root.render(React.createElement(Harness)));
  const button = (number) =>
    [...document.querySelectorAll('.task-order-cards button')].find(
      (b) => b.textContent === String(number),
    );
  await act(async () => button(1).click());
  assert.equal(
    button(3).disabled,
    false,
    'the next card is locked while waiting for the first save',
  );
  await act(async () => button(3).click());
  assert.equal(document.querySelectorAll('.task-order-cards .picked').length, 2);
});
