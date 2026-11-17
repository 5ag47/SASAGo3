import { dateWeek, weekDate } from './calendar-date.js';
import { LAST_WEEK, STATS } from './catalog.js';
import { createGame } from './commands/profile.js';
import { requireRule } from './errors.js';
import { EXTENSION_TIME, gameClockPosition, SESSION_TIMES, validTime } from './game-time.js';
import { syncCondition } from './state/condition.js';
import { CONTENT_VERSION, validateState } from './state.js';
import { resolveWeek } from './week.js';

export const DEVELOPER_ACTIONS = [
  'developer_skip_week',
  'developer_advance',
  'developer_stats',
  'developer_clock',
];
export const DEVELOPER_LAST_DATE = weekDate(LAST_WEEK + 1);
export const EDITABLE_STATS = {
  ...Object.fromEntries(
    Object.entries(STATS)
      .filter(([id]) => id !== 'focus')
      .map(([id, { name }]) => [id, { name, max: 100, step: 0.1 }]),
  ),
  money: { name: '용돈', max: 1e9, step: 1 },
  fatigue: { name: '피로 단계', max: 3, step: 1 },
  awards: { name: '수상 횟수', max: 100, step: 1 },
  interviewScore: { name: '면접 점수', max: 100, step: 1 },
};

function setClock(state, time) {
  requireRule(validTime(time), 'DEVELOPER_TIME', '시각을 다시 입력하세요.');
  state.flags.developerClock = { position: gameClockPosition(state), time };
}

function replayFromStart(state) {
  const initialSeed = /^SASA-([\da-f]{1,8})$/i.exec(state.campaign.playerId)?.[1];
  const replay = createGame(state, initialSeed ? Number.parseInt(initialSeed, 16) : state.seed);
  replay.flags.runRevision = state.revision + 1;
  return replay;
}

function advanceTo(state, at, replay) {
  requireRule(
    typeof at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at),
    'DEVELOPER_DATE',
    '날짜와 시각을 입력하세요.',
  );
  const [date, time] = at.split('T');
  const target = dateWeek(date);
  requireRule(
    target &&
      date <= DEVELOPER_LAST_DATE &&
      weekDate(target.week, target.day) === date &&
      validTime(time),
    'DEVELOPER_DATE',
    '학사 달력에서 게임 일정이 있는 날짜를 골라 주세요.',
  );
  if (replay === true) state = replayFromStart(state);
  requireRule(
    !state.ending && at >= gameClockPosition(state),
    'DEVELOPER_PAST',
    '이미 지난 일시는 처음부터 다시 진행해 확인하세요.',
  );

  while (state.week < target.week) state = resolveWeek(state, { automatic: true });
  const slots = SESSION_TIMES.filter((session) => session <= time).length;
  if (state.week <= LAST_WEEK && (state.weekRun || target.day > 0 || slots > 0)) {
    const until = {
      day: target.day,
      cursor: target.day * SESSION_TIMES.length + slots,
      afterNight: time >= EXTENSION_TIME,
    };
    state = resolveWeek(state, { automatic: true, until });
  }
  setClock(state, time);
  return state;
}

function applyDeveloperAction(state, command) {
  requireRule(state.created, 'GAME_CLOSED', '테스트 게임을 먼저 시작하세요.');
  switch (command.type) {
    case 'developer_skip_week':
      requireRule(
        !state.ending && state.week <= LAST_WEEK,
        'YEAR_FINISHED',
        '진행할 주간 일정이 없어요.',
      );
      return resolveWeek(state, { automatic: true });
    case 'developer_advance':
      return advanceTo(state, command.at, command.replay);
    case 'developer_clock':
      setClock(state, command.time);
      return state;
    case 'developer_stats':
      requireRule(
        command.values && typeof command.values === 'object' && !Array.isArray(command.values),
        'DEVELOPER_STAT',
        '능력치 입력 범위를 확인하세요.',
      );
      for (const [key, value] of Object.entries(command.values)) {
        const field = Object.hasOwn(EDITABLE_STATS, key) && EDITABLE_STATS[key];
        requireRule(
          field &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= field.max &&
            (field.step !== 1 || Number.isInteger(value)),
          'DEVELOPER_STAT',
          '능력치 입력 범위를 확인하세요.',
        );
        if (Object.hasOwn(STATS, key)) state.stats[key] = Math.round(value * 10) / 10;
        else state[key] = value;
      }
      return syncCondition(state);
    default:
      throw new Error('DEVELOPER_COMMAND_UNKNOWN');
  }
}

export function developerTransition(source, command) {
  requireRule(validateState(source), 'STATE_INVALID', '테스트 저장 상태를 확인할 수 없어요.');
  const next = applyDeveloperAction(structuredClone(source), command);
  next.contentVersion = CONTENT_VERSION;
  next.revision = source.revision + 1;
  if (next.weekRun) {
    next.weekRun.minHealth = Math.min(next.weekRun.minHealth, next.stats.hp);
    next.weekRun.peakStress = Math.max(next.weekRun.peakStress, next.stats.stress);
  }
  requireRule(validateState(next), 'INVARIANT_FAILED', '테스트 결과를 저장할 수 없어요.');
  return next;
}
