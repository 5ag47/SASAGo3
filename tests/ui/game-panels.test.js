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
  server: { middlewareMode: true, watch: null, hmr: false },
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
const { default: TaskGamePanel } = await vite.ssrLoadModule(
  '/src/features/year-game/TaskGamePanel.jsx',
);
const { default: TaskEditor } = await vite.ssrLoadModule('/tools/task-editor/TaskEditor.jsx');
const { default: StoryPanel } = await vite.ssrLoadModule('/src/features/year-game/StoryPanel.jsx');
const { default: Scene } = await vite.ssrLoadModule('/src/features/year-game/Scene.jsx');
const { CoursesPanel } = await vite.ssrLoadModule('/src/features/year-game/CoursesPanel.jsx');
const { default: Setup } = await vite.ssrLoadModule('/src/features/year-game/Setup.jsx');
const { default: SettingsPanel } = await vite.ssrLoadModule(
  '/src/features/year-game/SettingsPanel.jsx',
);
const { availableChapters } = await vite.ssrLoadModule('/src/domain/story.js');
const { default: CalendarEditor } = await vite.ssrLoadModule(
  '/tools/task-editor/CalendarEditor.jsx',
);
const { AdmissionsPanel } = await vite.ssrLoadModule('/src/features/year-game/AdmissionsPanel.jsx');
const { calendar } = await vite.ssrLoadModule('/src/domain/calendar-date.js');
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
test('calendar authoring exposes actual dates and known source bindings while an incomplete new record cannot export', async (t) => {
  const render = await mount(t);
  await render(CalendarEditor, {
    initial: {
      ...calendar,
      example_day: { kind: 'entry', name: '일정 예시', type: 'note', date: '2026-04-14' },
    },
  });
  assert.equal(document.querySelector('input[type="date"]').value, '2026-04-14');
  assert.ok(
    [...document.querySelectorAll('option')].some((option) => option.value === 'deadline:thesis'),
  );
  await click(
    [...document.querySelectorAll('button')].find((button) => button.textContent === '일정 추가'),
  );
  assert.equal(document.querySelector('header button').disabled, true);
  assert.match(document.body.textContent, /입력 검사/);
});
test('the common admissions screen shows accumulated evidence and neutral preparation status without blaming the player', async (t) => {
  const render = await mount(t),
    state = fresh();
  state.week = 25;
  state.recommendation = {
    teacher: 'math',
    status: 'preparing',
    progress: 1,
    quality: null,
    dueAt: null,
  };
  let direction;
  await render(AdmissionsPanel, {
    state,
    busy: false,
    onDirection: (value) => {
      direction = value;
    },
  });
  assert.equal(document.querySelectorAll('.route-comparison > article').length, 3);
  assert.match(document.body.textContent, /자료 확인 중/);
  assert.doesNotMatch(document.body.textContent, /생기부가 안 좋|추천서를 잘 안|피드백 관계/);
  await click(document.querySelector('.admission-directions button'));
  assert.equal(direction, 'dream');
});
test('both original characters appear at new-game setup and a failed second image can reload without changing selection', async (t) => {
  const render = await mount(t);
  await render(Setup, { onCreate() {}, busy: false, mode: 'local', loginRequired: false });
  const first = document.querySelector('button[aria-label="캐릭터 1 선택"]');
  const second = document.querySelector('button[aria-label="캐릭터 2 선택"]');
  assert.ok(first && second);
  assert.notEqual(first.querySelector('img').src, second.querySelector('img').src);
  assert.match(second.querySelector('img').src, /character-02\.png/);
  await act(async () => second.querySelector('img').dispatchEvent(new window.Event('error')));
  assert.ok(document.querySelector('[role="alert"]'));
  await click(document.querySelector('button[aria-label="캐릭터 2 이미지 다시 불러오기"]'));
  assert.equal(first.getAttribute('aria-pressed'), 'true');
  assert.match(second.querySelector('img').src, /reload=1/);
  await act(async () => second.querySelector('img').dispatchEvent(new window.Event('load')));
  await click(second);
  assert.equal(second.getAttribute('aria-pressed'), 'true');
  assert.match(second.querySelector('img').src, /character-02\.png/);
  assert.doesNotMatch(document.body.textContent, /남학생|여학생/);
});
test('settings expose no character selector after a game has started', async (t) => {
  const render = await mount(t);
  await render(SettingsPanel, {
    game: { state: fresh(), busy: false, mode: 'local' },
    audio: { playing: false, volume: 30 },
  });
  assert.equal(document.querySelector('[aria-label="캐릭터 선택"]'), null);
  assert.equal(document.querySelectorAll('.avatar-options').length, 0);
});
test('story UI resumes a saved page, allows skipping and replays without changing game state', async (t) => {
  const render = await mount(t);
  let state = fresh(),
    calls = 0,
    closed = 0;
  const chapter = availableChapters(state)[0];
  const props = () => ({
    state,
    chapter,
    onProgress(action) {
      calls++;
      state = transition(state, { type: 'story', chapter: chapter.id, action });
      return state;
    },
    onClose() {
      closed++;
    },
    onNavigate() {},
  });
  await render(StoryPanel, { ...props(), busy: true });
  assert.equal(document.querySelector('.story-actions .primary').disabled, true);
  await render(StoryPanel, props());
  await click(document.querySelector('.story-actions .primary'));
  await render(null);
  state = JSON.parse(JSON.stringify(state));
  await render(StoryPanel, props());
  assert.match(document.querySelector('.story-location').textContent, /2 \/ 4/);
  await click(document.querySelector('.story-actions .subtle'));
  assert.equal(closed, 1);
  assert.equal(state.story[chapter.id].read, true);
  const priorCalls = calls;
  await render(null);
  await render(StoryPanel, props());
  assert.match(document.querySelector('.story-location').textContent, /1 \/ 4/);
  await click(document.querySelector('.story-actions .primary'));
  assert.equal(calls, priorCalls);
});
test('pattern task UI responds immediately, resumes and confirms completion at planned time', async (t) => {
  const render = await mount(t);
  let state = fresh(),
    continued = false;
  state.tasks['practice-report'].target = 1;
  state.plan = Array.from({ length: 21 }, (_, index) =>
    index === 0
      ? { activity: 'task', target: 'practice-report' }
      : { activity: 'sleep', target: null },
  );
  state = transition(state, { type: 'advance' });
  const props = () => ({
    task: state.tasks['practice-report'],
    state,
    draftKey: 'ui-pattern-draft',
    onBack() {},
    onAssign() {
      throw Error('completed work must not ask for scheduling');
    },
    onContinue() {
      continued = true;
    },
    onAction(action) {
      state = transition(state, { type: 'task_game', task: 'practice-report', action });
      return state;
    },
  });
  await render(TaskGamePanel, props());
  await click(document.querySelector('.primary'));
  await render(TaskGamePanel, props());
  const goal = [...state.tasks['practice-report'].moduleData.goal];
  assert.equal(document.querySelectorAll('.task-pattern-grid .lit').length, 4);
  await click(document.querySelector('.primary'));
  await render(TaskGamePanel, props());
  assert.equal(document.querySelectorAll('.task-pattern-grid .lit').length, 0);
  for (const cell of goal) {
    await click(document.querySelectorAll('.task-pattern-grid button')[cell]);
    await render(TaskGamePanel, props());
  }
  await render(null);
  state = JSON.parse(JSON.stringify(state));
  await render(TaskGamePanel, props());
  assert.equal(document.querySelectorAll('.task-pattern-grid .lit').length, 4);
  await click(document.querySelector('.primary'));
  await render(TaskGamePanel, props());
  assert.match(document.body.textContent, /과제 완료/);
  await click(document.querySelector('.primary'));
  assert.equal(continued, true);
});
test('the authoring editor exposes task group membership and the two playable example modules', async (t) => {
  const render = await mount(t);
  const sample = {
    test_task: {
      kind: 'task',
      name: '검증 과제',
      description: '',
      week: 1,
      deadline: 2,
      target: 1,
    },
    test_group: {
      kind: 'group',
      name: '검증 그룹',
      members: ['test_task'],
      module: { id: 'order_v1', params: {} },
    },
  };
  await render(TaskEditor, { initial: sample });
  const groupButton = [...document.querySelectorAll('nav button')].find((button) =>
    button.textContent.includes('검증 그룹'),
  );
  await click(groupButton);
  assert.match(document.body.textContent, /1개 과제에 모듈 적용/);
  assert.equal(document.querySelectorAll('.group-members input:checked').length, 1);
  assert.ok(
    [...document.querySelectorAll('option')].some((option) => option.value === 'pattern_v2'),
  );
  assert.ok([...document.querySelectorAll('option')].some((option) => option.value === 'order_v1'));
});
test('tutorial practice leads to the actual calendar button without opening the feature itself', async (t) => {
  const render = await mount(t);
  localStorage.setItem(SAVE_KEY, JSON.stringify(fresh()));
  await render(YearGame);
  await click(document.querySelector('.tutorial-badge'));
  await click(
    [...document.querySelectorAll('.tutorial-workbook nav button')].find((button) =>
      button.textContent.includes('시험과 학사'),
    ),
  );
  await click(document.querySelector('.lesson-content .primary'));
  assert.equal(document.querySelector('dialog'), null);
  assert.ok(document.querySelector('.tutorial-guide').textContent.includes('왼쪽 아래'));
  assert.equal(document.querySelector('.calendar-grid'), null);
  await click(document.querySelector('[data-tutorial="calendar"]'));
  assert.equal(document.querySelectorAll('.calendar-grid [role="gridcell"]').length, 42);
  await click(document.querySelector('[aria-label="다음 달"]'));
  await click(document.querySelector('[aria-label="다음 달"]'));
  assert.match(document.querySelector('.calendar-heading h3').textContent, /4월/);
  assert.match(document.querySelector('.tutorial-badge').textContent, /1\/8/);
});
test('the full game plans first, performs two work rounds and completes the report before the week ends', async (t) => {
  const render = await mount(t);
  localStorage.setItem(SAVE_KEY, JSON.stringify(fresh()));
  await render(YearGame);
  await click(document.querySelector('.start-week'));
  await click(document.querySelector('.week-review > .primary'));
  for (let round = 0; round < 2; round++) {
    await click(document.querySelector('.task-game-panel .primary'));
    const goal = [...document.querySelectorAll('.task-pattern-grid button')].flatMap(
      (button, index) => (button.classList.contains('lit') ? [index] : []),
    );
    await click(document.querySelector('.task-game-panel .primary'));
    for (const cell of goal)
      await click(document.querySelectorAll('.task-pattern-grid button')[cell]);
    await click(document.querySelector('.task-game-panel .primary'));
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    assert.equal(saved.tasks['practice-report'].progress, round + 1);
    assert.equal(saved.week, 0);
    assert.equal(saved.tasks['practice-report'].status, round === 1 ? 'completed' : 'active');
    await click(document.querySelector('.task-game-passed .primary'));
  }
  assert.equal(JSON.parse(localStorage.getItem(SAVE_KEY)).week, 1);
  assert.match(document.querySelector('dialog').textContent, /주간 결과/);
});

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
  assert.match(document.querySelector('.day-copy-body .primary').textContent, /1일 · 4칸/);
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

test('lobby character and bubble both change dialogue without changing game state', async (t) => {
  const render = await mount(t),
    state = fresh(),
    before = structuredClone(state);
  await render(Scene, { state, night: false, onOpen() {}, onTask() {} });
  const first = document.querySelector('.lobby-speech').textContent;
  await click(document.querySelector('.avatar'));
  assert.notEqual(document.querySelector('.lobby-speech').textContent, first);
  const second = document.querySelector('.lobby-speech').textContent;
  await click(document.querySelector('.lobby-speech'));
  assert.notEqual(document.querySelector('.lobby-speech').textContent, second);
  assert.deepEqual(state, before);
  assert.equal(document.querySelector('.name-plate'), null);
  assert.doesNotMatch(document.body.textContent, /남학생|여학생|마감 전에 끝내기/);
  assert.deepEqual(
    [...document.querySelectorAll('.stat-line > span')].map((el) => el.textContent),
    ['건강', '집중력', '평판', '스트레스', '수학 능력', '과학'],
  );
});
test('enrolled course panel exposes records without registration inputs', async (t) => {
  const render = await mount(t);
  await render(CoursesPanel, { state: fresh() });
  assert.equal(document.querySelector('input'), null);
  assert.doesNotMatch(document.body.textContent, /추가 신청|다음 학기 신청/);
});

test('extended study and custom preset controls send explicit commands, then show fixed-day locks', async (t) => {
  const { default: CampaignPlanner } = await vite.ssrLoadModule(
    '/src/features/year-game/CampaignPlanner.jsx',
  );
  const render = await mount(t);
  let state = fresh(),
    command;
  const props = () => ({
    state,
    day: 6,
    busy: false,
    send: (c) => {
      command = c;
      state = transition(state, c);
    },
  });
  await render(CampaignPlanner, props());
  const select = document.querySelector('select');
  select.value = 'math_seminar';
  await act(async () => select.dispatchEvent(new window.Event('change', { bubbles: true })));
  assert.deepEqual(command, {
    type: 'night_plan',
    day: 6,
    activity: 'study',
    target: 'math_seminar',
  });
  await render(CampaignPlanner, props());
  assert.match(document.body.textContent, /50%/);
  await click(document.querySelector('.saved-preset button'));
  assert.equal(state.campaign.presets[0].nights[6].target, 'math_seminar');
  state = createGame({ name: '생물', character: 'girl', role: 'steady', major: 'biology' });
  state.week = 12;
  await render(CampaignPlanner, props());
  assert.equal(document.querySelector('select').disabled, true);
});
test('main navigation omits help and admissions room while weekly overview exposes seven nights', async (t) => {
  const render = await mount(t);
  localStorage.setItem(SAVE_KEY, JSON.stringify(fresh()));
  await render(YearGame);
  assert.doesNotMatch(document.querySelector('.window-toolbar').textContent, /도움말|진학실/);
  await click(
    [...document.querySelectorAll('button')].find((b) => b.textContent.includes('전체 일정')),
  );
  assert.equal(document.querySelectorAll('.night-overview select').length, 7);
});
