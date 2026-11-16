import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useGame from '../../src/features/year-game/useGame.js';

async function mountLogin(options) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://game.example' });
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  for (const name of ['window', 'document', 'navigator'])
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  function Login() {
    const game = useGame({
      serverMode: true,
      readAuth: async () => ({ currentUser: null }),
      ...options,
    });
    return React.createElement('button', { disabled: game.busy }, 'Google로 로그인');
  }
  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(React.createElement(Login));
  });
  return async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
      if (previous[name]) Object.defineProperty(globalThis, name, previous[name]);
      else delete globalThis[name];
    }
  };
}
test('a signed-out visitor can click Google login after the startup check', async () => {
  const cleanup = await mountLogin();
  try {
    assert.equal(document.querySelector('button').disabled, false);
  } finally {
    await cleanup();
  }
});
test('a stalled startup check releases the login button instead of locking it forever', async () => {
  const cleanup = await mountLogin({ readAuth: () => new Promise(() => {}), bootTimeoutMs: 15 });
  try {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 35));
    });
    assert.equal(document.querySelector('button').disabled, false);
  } finally {
    await cleanup();
  }
});
test('an unmounted login check cannot start a late server load', async () => {
  let finish;
  let loads = 0;
  const deferred = new Promise((resolve) => {
    finish = resolve;
  });
  const cleanup = await mountLogin({
    readAuth: () => deferred,
    readServer: async () => {
      loads++;
      return {};
    },
  });
  await cleanup();
  await act(async () => {
    finish({ currentUser: { uid: 'test-only' } });
  });
  assert.equal(loads, 0);
});
