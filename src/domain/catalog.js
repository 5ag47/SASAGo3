import courses from '../../data/courses.json' with { type: 'json' };
import roles from '../../data/roles.json' with { type: 'json' };
import activities from '../../data/activities.json' with { type: 'json' };
import items from '../../data/items.json' with { type: 'json' };
import storyEvents from '../../data/events.json' with { type: 'json' };
import lifeEvents from '../../data/life-events.json' with { type: 'json' };
import quizzes from '../../data/quizzes.json' with { type: 'json' };
import resources from '../../data/resources.json' with { type: 'json' };
import assignments from '../../data/assignments.json' with { type: 'json' };
import CHARACTERS from '../../data/characters.json' with { type: 'json' };
import { expandAssignments } from './assignments.js';
import { calendarTiming } from './calendar-date.js';
const assignmentEvents = expandAssignments(assignments);
const events = { ...storyEvents, ...lifeEvents, ...assignmentEvents };

export {
  CHARACTERS,
  courses,
  roles,
  activities,
  items,
  events,
  quizzes,
  storyEvents,
  lifeEvents,
  resources,
  assignments,
  assignmentEvents,
};
export const MAJORS = {
  math: {
    name: '수학',
    icon: '∑',
    courses: ['linear_algebra', 'general_physics', 'physics_seminar'],
  },
  physics: {
    name: '물리',
    icon: 'Φ',
    courses: ['linear_algebra', 'general_physics', 'physics_seminar'],
  },
  chemistry: {
    name: '화학',
    icon: '⚗',
    courses: ['linear_algebra', 'general_chemistry', 'chemistry_seminar'],
  },
  biology: { name: '생물', icon: '♧', courses: ['general_biology', 'biology_seminar'] },
  information: {
    name: '정보',
    icon: '⌘',
    courses: ['linear_algebra', 'cs_project', 'algorithms', 'ai_project'],
  },
};
export const ELECTIVES = ['urban_planning'];
export const REQUIRED = [
  'tech_english',
  'visual_communication',
  'math_seminar',
  'foreign_language',
];
export const STATS = {
  hp: { name: '체력', color: '#8aa789' },
  focus: { name: '집중력', color: '#80a8ba' },
  stress: { name: '스트레스', color: '#c78c8c' },
  reputation: { name: '평판', color: '#c3a56e' },
  math: { name: '수학', color: '#839dc1' },
  science: { name: '과학', color: '#8baea4' },
  writing: { name: '서술력', color: '#b19cbe' },
  speech: { name: '구술력', color: '#bdad86' },
  charm: { name: '매력', color: '#ce9d9f' },
};
export const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
export const TEACHERS = { math: '수학 선생님', science: '과학 선생님', homeroom: '담임 선생님' };
export const GROUPS = {
  friends: {
    name: '찐친들의 스터디',
    description: '공부보다 서로가 힘이 되는 시간',
    chance: 1,
    effect: { stress: -7, reputation: 1 },
  },
  focused: {
    name: '몰입형 스터디',
    description: '낯설지만 함께 성장하는 팀',
    chance: 0.72,
    effect: { math: 4.5, science: 2, stress: 3, hp: -2 },
  },
  playful: {
    name: '일단 모여 스터디',
    description: '웃음과 친목은 확실한 모임',
    chance: 0.9,
    effect: { stress: -10, charm: 2, hp: -1 },
  },
};
export const LAST_WEEK = 40;
// The practice week is winter week 0, but its lessons stay open until this week so running
// the week to practise "한 주 진행" does not close the remaining lessons.
export const TUTORIAL_LAST_WEEK = 2;
export const TUTORIAL_TASKS = {
  'first-study': {
    module: { id: 'time_v1', params: {} },
    name: '수학 공부 1회',
    description: '수학 과목 자습 한 칸을 배정하세요.',
    target: 1,
    deadline: TUTORIAL_LAST_WEEK,
    special: 'tutorial',
    reward: { focus: 3 },
    penalty: {},
  },
  'practice-report': {
    name: '연습 보고서',
    description:
      '할 일 진행을 두 칸 배정하고 한 주를 진행하면 그 시간에 작업합니다. 못 끝내도 불이익이 없습니다.',
    target: 2,
    deadline: TUTORIAL_LAST_WEEK,
    special: 'practice',
    reward: { writing: 2 },
    penalty: {},
  },
};

export function period(week) {
  if (week > LAST_WEEK)
    return {
      month: 12,
      weekOfMonth: 4,
      name: '졸업',
      term: '최종 결과',
      chapter: 'EPILOGUE',
      label: '졸업 · 최종 결과',
    };
  if (week === 0)
    return {
      month: 2,
      weekOfMonth: 1,
      name: '겨울방학',
      term: '튜토리얼',
      chapter: 'PROLOGUE',
      label: '겨울방학 · 첫 번째 일주일',
    };
  const month = 3 + Math.floor((Math.min(week, LAST_WEEK) - 1) / 4);
  const weekOfMonth = ((week - 1) % 4) + 1;
  const term = month <= 6 ? '1학기' : month <= 8 ? '여름방학' : '2학기';
  return {
    month,
    weekOfMonth,
    name: `${month}월`,
    term,
    chapter: month <= 6 ? 'CHAPTER 01' : month <= 8 ? 'INTERLUDE' : 'CHAPTER 02',
    label: `${month}월 ${weekOfMonth}주차 · ${term}`,
  };
}
export const activeTasks = (state) =>
  Object.values(state.tasks).filter((t) => t.status === 'active');
export function choiceDeadline(id) {
  const original = events[id]?.week ?? 40;
  const deadline =
    {
      winter_study: 4,
      academy_offer: 4,
      recommendation: 16,
      second_registration: 24,
      summer_place: 24,
      summer_camp: 24,
      csat_decision: 20,
      applications: 28,
      mock_interview: 28,
    }[id] ??
    events[id]?.week ??
    40;
  return Math.min(40, calendarTiming(`event:${id}`, original).week + deadline - original);
}
export function effectText(effect = {}) {
  return Object.entries(effect)
    .map(([key, value]) => `${STATS[key]?.name ?? key} ${value > 0 ? '+' : ''}${value}`)
    .join(' · ');
}
