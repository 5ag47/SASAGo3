export const DAYS = ['월', '화', '수', '목', '금', '토'];
export const ACTIVITIES = {
  math: { label: '수학', type: 'study', place: '학습실', reason: '수학 심층 공부' },
  science: { label: '물리', type: 'science', place: '학습실', reason: '물리 심층 공부' },
  interview: { label: '면접', type: 'interview', place: '스터디실', reason: '모의 면접' },
  write: { label: '자소서', type: 'write', place: '도서관', reason: '원서 작성' },
  rest: { label: '요양', type: 'rest', place: '호실(요양)', reason: '잠자기' },
  game: { label: '게임', type: 'rest', place: '호실(요양)', reason: '게임' },
  exercise: { label: '운동', type: 'exercise', place: '운동장', reason: '가볍게 운동' },
};
export const STATS = [
  { key: 'hp', label: '건강', color: '#7ba58a' },
  { key: 'focus', label: '집중력', color: '#d4ad65' },
  { key: 'reputation', label: '평판', color: '#a68bb6' },
  { key: 'stress', label: '스트레스', color: '#d1887e' },
  { key: 'math', label: '수학', color: '#799fc6' },
  { key: 'science', label: '물리', color: '#9395c2' },
  { key: 'writing', label: '서술력', color: '#b1a284' },
  { key: 'speech', label: '구술력', color: '#79a8ac' },
];
export const ITEMS = [
  { id: 'milk', name: '딸기우유', price: 1500, emoji: '🥛', desc: '달달한 한 모금의 여유' },
  { id: 'bread', name: '초코 소라빵', price: 2000, emoji: '🥐', desc: '공부도 일단 먹고 하자' },
  { id: 'note', name: '새 오답노트', price: 3500, emoji: '📓', desc: '이번엔 진짜 정리한다' },
];
export function initialGame() {
  return { version: 1, week: 0, name: '사사', character: 'boy', night: false, money: 15000,
    stats: { hp: 68, focus: 56, reputation: 45, stress: 32, math: 52, science: 38, writing: 30, speech: 25 },
    plan: ['math', 'math', 'science', 'game', 'interview', 'write'],
    tasks: [false, false], created: false };
}
export function weekDate(week) { return new Date(Date.UTC(2026, 8, 7 + week * 7)); }
export function dateLabel(week) {
  const date = weekDate(week);
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${Math.ceil(date.getUTCDate() / 7)}주차`;
}
export const SAVE_KEY = 'sasago3-save-v1';
export function validSave(value) {
  return value?.version === 1 && typeof value.created === 'boolean' && Number.isInteger(value.week) && value.week >= 0 && value.week <= 5200
    && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 12
    && ['boy', 'girl'].includes(value.character) && typeof value.night === 'boolean'
    && Number.isFinite(value.money) && value.money >= 0
    && STATS.every(({ key }) => Number.isFinite(value.stats?.[key]) && value.stats[key] >= 0 && value.stats[key] <= 100)
    && Array.isArray(value.plan) && value.plan.length === 6 && value.plan.every(id => Object.hasOwn(ACTIVITIES, id))
    && Array.isArray(value.tasks) && value.tasks.length === 2 && value.tasks.every(v => typeof v === 'boolean');
}
