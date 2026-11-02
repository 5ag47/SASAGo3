import { ACTIVITIES, DAYS } from './data/activities.js';
import { STATS } from './data/stats.js';
import { EVENTS } from './data/schedule.js';
import { COURSES } from './data/courses.js';
import { ITEMS } from './data/items.js';
import { DEFAULT_SLEEP, SLEEP_OPTIONS } from './data/sleep.js';
export const SAVE_KEY = 'sasago3-save-v1';
export const SAVE_VERSION = 5;
export const MAX_HISTORY = 100;
export const TASKS = ['수학 2회 이상 학습하기', '운동 또는 요양 1회 하기'];
export function initialGame() {
  return {
    version: SAVE_VERSION,
    week: 0,
    name: '사사',
    character: 'boy',
    night: false,
    money: 15000,
    stats: {
      hp: 68,
      focus: 56,
      reputation: 45,
      stress: 32,
      math: 52,
      science: 38,
      writing: 30,
      speech: 25
    },
    plan: ['math', 'math', 'science', 'game', 'rest', 'exercise', 'rest'],
    sleepPlan: Array(DAYS.length).fill(DEFAULT_SLEEP),
    tasks: [false, false],
    history: [],
    created: false,
    major: '물리',
    enrolled: false,
    tutorialStep: 0,
    inventory: {},
    noticeReadWeek: -1,
    ended: false
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
  return EVENTS.map(event => ({
    ...event,
    days: Math.round((Date.parse(event.date) - start) / 86400000)
  })).filter(event => event.days >= 0).sort((a, b) => a.days - b.days)[0] ?? null;
}
export function migrateSave(value) {
  if ([1, 2, 3, 4].includes(value?.version)) {
    return {
      ...initialGame(),
      ...value,
      version: SAVE_VERSION,
      sleepPlan: Array(DAYS.length).fill(DEFAULT_SLEEP),
      enrolled: value.enrolled === true || value.week > 0,
      plan: Array.isArray(value.plan) && value.plan.length === 6 ? [...value.plan, 'rest'] : value.plan,
      ended: value.week >= 12,
      history: value.version === 1 ? [] : value.history
    };
  }
  return value;
}
function validSleepPlan(plan) {
  return Array.isArray(plan) && plan.length === DAYS.length && plan.every(hours => SLEEP_OPTIONS.includes(hours));
}
function validPlan(plan, legacy = false) {
  return Array.isArray(plan) && (plan.length === DAYS.length || legacy && plan.length === 6) && plan.every(id => Object.hasOwn(ACTIVITIES, id));
}
function validHistoryEntry(entry) {
  return Number.isInteger(entry?.week) && entry.week >= 0 && validPlan(entry.plan, true) && (entry.sleepPlan === undefined || validSleepPlan(entry.sleepPlan)) && STATS.every(({
    key
  }) => Number.isFinite(entry.delta?.[key])) && Array.isArray(entry.notes) && entry.notes.every(note => typeof note === 'string') && (entry.daily === undefined || Array.isArray(entry.daily) && entry.daily.every(day => typeof day.day === 'string' && typeof day.label === 'string' && typeof day.summary === 'string' && (day.sleepHours === undefined || SLEEP_OPTIONS.includes(day.sleepHours)) && (day.delta === undefined || day.delta !== null && typeof day.delta === 'object' && !Array.isArray(day.delta) && Object.entries(day.delta).every(([key, amount]) => STATS.some(stat => stat.key === key) && Number.isFinite(amount))))) && (entry.story === undefined || typeof entry.story?.title === 'string' && typeof entry.story?.outcome === 'string' && typeof entry.story?.choice === 'string') && (entry.economy === undefined || ['allowance', 'reward', 'bonus', 'fine', 'net'].every(key => Number.isFinite(entry.economy?.[key]))) && (entry.major === undefined || COURSES.includes(entry.major)) && (entry.assessment === undefined || entry.assessment === null || Number.isFinite(entry.assessment)) && [entry.before, entry.after].every(stats => stats === undefined || STATS.every(({
    key
  }) => Number.isFinite(stats?.[key]) && stats[key] >= 0 && stats[key] <= 100));
}
export function validSave(value) {
  return value?.version === SAVE_VERSION && typeof value.created === 'boolean' && Number.isInteger(value.week) && value.week >= 0 && value.week <= 5200 && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 12 && ['boy', 'girl'].includes(value.character) && typeof value.night === 'boolean' && Number.isFinite(value.money) && value.money >= 0 && STATS.every(({
    key
  }) => Number.isFinite(value.stats?.[key]) && value.stats[key] >= 0 && value.stats[key] <= 100) && validPlan(value.plan) && validSleepPlan(value.sleepPlan) && Array.isArray(value.tasks) && value.tasks.length === TASKS.length && value.tasks.every(v => typeof v === 'boolean') && Array.isArray(value.history) && value.history.length <= MAX_HISTORY && value.history.every(validHistoryEntry) && COURSES.includes(value.major) && typeof value.enrolled === 'boolean' && Number.isInteger(value.tutorialStep) && value.tutorialStep >= 0 && value.tutorialStep <= 4 && typeof value.ended === 'boolean' && Number.isInteger(value.noticeReadWeek) && value.noticeReadWeek >= -1 && value.inventory !== null && typeof value.inventory === 'object' && !Array.isArray(value.inventory) && Object.entries(value.inventory).every(([id, count]) => ITEMS.some(item => item.id === id) && Number.isInteger(count) && count >= 0 && count <= 99);
}
