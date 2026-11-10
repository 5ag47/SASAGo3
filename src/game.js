import { ACTIVITIES, DAYS } from './data/activities.js';
import { STATS } from './data/stats.js';
import { EVENTS } from './data/schedule.js';

export const SAVE_KEY = 'sasago3-save-v1';
export const SAVE_VERSION = 2;
export const MAX_HISTORY = 100;
export const TASKS = ['모의 면접 준비하기', '원서 초안 작성하기'];

const DAY_MS = 86400000;

export function initialGame() {
  return {
    version: SAVE_VERSION, week: 0, name: '사사', character: 'boy', night: false, money: 15000,
    stats: { hp: 68, focus: 56, reputation: 45, stress: 32, math: 52, science: 38, writing: 30, speech: 25 },
    plan: ['math', 'math', 'science', 'game', 'interview', 'write'],
    tasks: TASKS.map(() => false),
    history: [],
    created: false,
  };
}

export function weekDate(week) {
  return new Date(Date.UTC(2026, 8, 7 + week * 7));
}

export function dateLabel(week) {
  const date = weekDate(week);
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${Math.ceil(date.getUTCDate() / 7)}주차`;
}

export function nextEvent(week) {
  const start = weekDate(week).getTime();
  const upcoming = EVENTS
    .map(event => ({ ...event, days: Math.round((Date.parse(event.date) - start) / DAY_MS) }))
    .filter(event => event.days >= 0)
    .sort((a, b) => a.days - b.days);
  return upcoming[0] ?? null;
}

export function migrateSave(value) {
  if (value?.version === 1) return { ...value, version: SAVE_VERSION, history: [] };
  return value;
}

function validPlan(plan) {
  return Array.isArray(plan) && plan.length === DAYS.length && plan.every(id => Object.hasOwn(ACTIVITIES, id));
}

function validHistoryEntry(entry) {
  return Number.isInteger(entry?.week) && entry.week >= 0
    && validPlan(entry.plan)
    && STATS.every(({ key }) => Number.isFinite(entry.delta?.[key]))
    && Array.isArray(entry.notes) && entry.notes.every(note => typeof note === 'string');
}

export function validSave(value) {
  return value?.version === SAVE_VERSION && typeof value.created === 'boolean'
    && Number.isInteger(value.week) && value.week >= 0 && value.week <= 5200
    && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 12
    && ['boy', 'girl'].includes(value.character) && typeof value.night === 'boolean'
    && Number.isFinite(value.money) && value.money >= 0
    && STATS.every(({ key }) => Number.isFinite(value.stats?.[key]) && value.stats[key] >= 0 && value.stats[key] <= 100)
    && validPlan(value.plan)
    && Array.isArray(value.tasks) && value.tasks.length === TASKS.length && value.tasks.every(v => typeof v === 'boolean')
    && Array.isArray(value.history) && value.history.length <= MAX_HISTORY && value.history.every(validHistoryEntry);
}
