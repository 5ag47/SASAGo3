import { courses } from '../catalog.js';
import { emptyMinigames } from '../minigames.js';
import { buildPreset } from '../auto-plan.js';
import { SCHEMA_VERSION, CONTENT_VERSION } from '../version.js';
export function baseState(seed = 20261013) {
  return {
    version: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    created: false,
    week: 0,
    seed: seed >>> 0,
    name: '사사',
    character: 'boy',
    role: 'steady',
    major: 'math',
    nextMajor: null,
    electives: [],
    nextElectives: null,
    courses: [],
    courseMastery: {},
    stats: {
      hp: 72,
      focus: 52,
      stress: 20,
      reputation: 35,
      math: 28,
      science: 25,
      writing: 23,
      speech: 23,
      charm: 30,
    },
    money: 30000,
    plan: [],
    tasks: {},
    assessments: [],
    notices: [],
    history: [],
    pending: [],
    choices: {},
    minigames: emptyMinigames(),
    story: {},
    weekRun: null,
    studyApplication: null,
    documents: null,
    recommendation: null,
    group: null,
    rejectedGroups: [],
    teachers: { math: 15, science: 15, homeroom: 20 },
    flags: {
      environment: 'home',
      camp: 'none',
      target: 'balanced',
      taskGamesVersion: 1,
      taskFlowVersion: 2,
      schoolRecordVersion: 1,
      seniorYearVersion: 1,
    },
    fatigue: 0,
    discipline: 0,
    awards: 0,
    interviewScore: 0,
    admissions: [],
    ending: null,
    revision: 0,
  };
}
export function balancedPlan(state) {
  return buildPreset(state, 'balanced');
}
