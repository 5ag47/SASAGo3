import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition, endingAvailable } from '../../src/domain/engine.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { balance } from '../../src/domain/balance.js';
import { balanceIssues } from '../../src/domain/balance-validation.js';
import { events } from '../../src/domain/catalog.js';
import { resolveAdmission } from '../../src/domain/grades.js';
import { beginWeek } from '../../src/domain/events.js';
import { weekForecast } from '../../src/domain/week-forecast.js';
import {
  activityLock,
  csatGrade,
  monthlyAllowance,
  recoveryFactor,
  seasonAt,
  strainStage,
} from '../../src/domain/senior-year.js';
import { runPlannedWeek, solveActiveTaskGames } from '../helpers/task-games.js';

const profile = { name: '고삼', character: 'boy', role: 'steady', major: 'math' };
function ready(seed = 31) {
  const state = solveActiveTaskGames(
    transition(createGame(profile, seed), {
      type: 'choose',
      event: 'winter_study',
      option: 'friends',
    }),
  );
  state.pending = [];
  return state;
}
const fill = (state, activity, target = null) => ({
  ...state,
  plan: Array.from({ length: 21 }, () => ({ activity, target })),
});
function atWeek(week, seed = 31) {
  const state = ready(seed);
  state.week = week;
  state.tasks = {};
  state.pending = [];
  state.group = null;
  state.studyApplication = null;
  state.stats.stress = 10;
  state.stats.hp = 80;
  state.flags.eventDeliveries = Object.fromEntries(Object.keys(events).map((id) => [id, true]));
  return state;
}

test('every playable week belongs to exactly one season and gaps are rejected', () => {
  for (let week = 0; week <= 40; week++) assert.ok(seasonAt(week).label, `week ${week}`);
  assert.equal(seasonAt(17).vacation, true);
  assert.equal(seasonAt(30).vacation, false);
  const broken = structuredClone(balance);
  broken.seasons.summer.to = 20;
  assert.ok(balanceIssues(broken).some((issue) => issue.startsWith('seasons')));
});

test('the same study week is harder in exam season than at the start of term', () => {
  // Eight study slots and thirteen rest slots: a normal week that does not saturate stress.
  const plan = (state) => ({
    ...state,
    plan: Array.from({ length: 21 }, (_, i) =>
      i % 3 === 0 || i === 1
        ? { activity: 'study', target: 'linear_algebra' }
        : { activity: 'sleep', target: null },
    ),
  });
  const calm = runPlannedWeek(plan(atWeek(2))).stats.stress;
  const exam = runPlannedWeek(plan(atWeek(15))).stats.stress;
  assert.ok(seasonAt(15).pressure > seasonAt(2).pressure);
  assert.ok(exam < 100, 'the comparison is not clipped');
  assert.ok(exam > calm + 5, `exam ${exam} vs calm ${calm}`);
});

test('recovery shrinks after the free slots, so a week of rest cannot erase any stress', () => {
  assert.equal(recoveryFactor(balance.recovery.freeSlots), 1);
  assert.ok(recoveryFactor(balance.recovery.freeSlots + 3) < 1);
  assert.ok(recoveryFactor(21) >= balance.recovery.floor);
  const state = fill(atWeek(3), 'sleep');
  state.stats.stress = 90;
  const after = runPlannedWeek(state);
  assert.ok(after.stats.stress < 90);
  assert.ok(
    90 - after.stats.stress < 21 * 3,
    'twenty-one sleeps are not twenty-one full recoveries',
  );
  assert.ok(after.history.at(-1).actions.some((a) => a.note.startsWith('회복 효과')));
});

test('strain has three stages and eases by at most one stage a week', () => {
  const calm = { hp: 80, stress: 20 };
  assert.equal(strainStage(calm), 0);
  assert.equal(strainStage({ hp: 80, stress: balance.fatigue.strainStress }), 1);
  assert.equal(strainStage({ hp: 80, stress: balance.fatigue.tiredStress }), 2);
  assert.equal(strainStage({ hp: 10, stress: 20 }), 3);
  assert.equal(strainStage(calm, null, 3), 2, 'a burnout lingers');
  assert.equal(strainStage(calm, { minHealth: 3, peakStress: 20 }), 2, 'running empty mid-week');
  const tired = fill(atWeek(3), 'study', 'linear_algebra');
  const rested = { ...structuredClone(tired), fatigue: 0 };
  tired.fatigue = 3;
  tired.stats.math = rested.stats.math = 20;
  assert.ok(runPlannedWeek(rested).stats.math > runPlannedWeek(tired).stats.math);
});

test('money arrives monthly, living costs are weekly, and part-time work is vacation-only', () => {
  assert.equal(monthlyAllowance(1), balance.money.monthlyAllowance);
  assert.equal(monthlyAllowance(2), 0);
  assert.equal(monthlyAllowance(0), 0);
  const term = atWeek(2);
  const before = term.money;
  assert.equal(runPlannedWeek(fill(term, 'sleep')).money, before - balance.weekly.livingCost);
  assert.ok(activityLock(term, 'work'));
  assert.throws(
    () => transition(term, { type: 'plan', index: 0, activity: 'work', target: null }),
    /방학/,
  );
  const stale = fill(atWeek(2), 'work');
  const ran = runPlannedWeek(stale);
  assert.equal(
    ran.money,
    stale.money - balance.weekly.livingCost,
    'a stale work plan earns nothing',
  );
  const summer = atWeek(18);
  assert.equal(activityLock(summer, 'work'), '');
  assert.ok(runPlannedWeek(fill(summer, 'work')).money > summer.money);
  const carried = atWeek(19);
  carried.week = 25;
  carried.plan = fill(carried, 'work').plan;
  beginWeek(carried);
  assert.ok(carried.plan.every((slot) => slot.activity === 'sleep'));
});

test('CSAT opens only after the summer counseling decision and records a grade, not an offer', () => {
  const state = atWeek(18);
  assert.ok(activityLock(state, 'csat_study'));
  state.flags.counseled = true;
  state.pending = ['csat_decision'];
  const prepared = transition(state, { type: 'choose', event: 'csat_decision', option: 'prepare' });
  assert.equal(prepared.flags.csat, 'prepare');
  assert.equal(activityLock(prepared, 'csat_study'), '');
  const after = runPlannedWeek(fill(prepared, 'csat_study'));
  assert.ok(after.flags.csatPrep > 0);
  assert.ok(after.flags.csatPrep <= balance.admissions.csatPrepCap);

  const exam = structuredClone(after);
  exam.week = 34;
  resolveAdmission(exam, events.csat);
  const record = exam.admissions.at(-1);
  assert.equal(record.accepted, false);
  assert.equal(record.exam, true);
  assert.equal(record.grade, csatGrade(record.score));
  assert.equal(exam.flags.csatGrade, record.grade);

  const skipped = atWeek(34);
  skipped.flags.csat = 'skip';
  resolveAdmission(skipped, events.csat);
  assert.equal(skipped.admissions.at(-1).applied, false);
  assert.equal(skipped.flags.csatGrade, undefined);
});

test('the 고대 minimum can fail a passing comprehensive score, and 정시 uses the CSAT grade', () => {
  function korea(grade) {
    const state = atWeek(35);
    state.flags.target = 'safe';
    state.documents = {
      direction: 'safe',
      factors: { gpa: 100, record: 100, fit: 100, essay: 100, recommendation: 100 },
    };
    state.interviewScore = 100;
    if (grade) state.flags.csatGrade = grade;
    resolveAdmission(state, events.korea_university);
    return state.admissions.at(-1);
  }
  assert.equal(korea(2).accepted, true);
  const missed = korea(5);
  assert.equal(missed.accepted, false);
  assert.match(missed.reason, /최저/);
  assert.equal(korea(null).accepted, false);

  function regular(grade) {
    const state = atWeek(38);
    if (grade) state.flags.csatGrade = grade;
    resolveAdmission(state, events.regular_admission);
    return state.admissions.at(-1);
  }
  assert.equal(regular(balance.admissions.regularGrade).accepted, true);
  assert.equal(regular(balance.admissions.regularGrade + 1).accepted, false);
  assert.equal(regular(null).applied, false);
});

test('university ending names the best offer and the startup ending needs real achievement', () => {
  const state = atWeek(40);
  state.week = 41;
  state.admissions.push(
    { name: '고대 종합 평가', profile: 'korea_university', score: 80, accepted: true, week: 35 },
    {
      name: '카이스트·포스텍 종합 평가',
      profile: 'kaist_postech',
      score: 85,
      accepted: true,
      week: 35,
    },
  );
  const ended = transition(state, { type: 'ending', ending: 'university' });
  assert.equal(ended.ending.school, '카이스트·포스텍 종합 평가');
  state.stats.science = 90;
  state.stats.reputation = 90;
  state.awards = 0;
  assert.equal(endingAvailable(state, 'startup'), false);
  state.awards = 1;
  assert.equal(endingAvailable(state, 'startup'), true);
});

test('old saves map binary fatigue to a strain stage once and keep taking the CSAT', () => {
  const old = ready();
  old.week = 26;
  old.fatigue = 1;
  delete old.flags.seniorYearVersion;
  const before = structuredClone(old);
  const migrated = migrateState(old);
  assert.deepEqual(old, before, 'migration does not mutate the source');
  assert.equal(migrated.fatigue, 2);
  assert.equal(migrated.flags.csat, 'prepare');
  assert.equal(migrated.flags.seniorYearVersion, 1);
  assert.ok(validateState(migrated));
  assert.deepEqual(migrateState(migrated), migrated, 'idempotent');
  const fresh = ready();
  assert.deepEqual(migrateState(fresh), fresh, 'new games are untouched');
});

test('the plan forecast moves the same way as the real week', () => {
  const heavy = fill(atWeek(14), 'study', 'linear_algebra');
  const light = fill(atWeek(14), 'sleep');
  const heavyForecast = weekForecast(heavy),
    lightForecast = weekForecast(light);
  assert.ok(heavyForecast.stress > lightForecast.stress);
  assert.ok(heavyForecast.hp < lightForecast.hp);
  const heavyRun = runPlannedWeek(heavy),
    lightRun = runPlannedWeek(light);
  assert.ok(heavyRun.stats.stress > lightRun.stats.stress);
  assert.ok(Math.abs(heavyForecast.stress - heavyRun.stats.stress) <= 15, 'close to the real run');
  assert.equal(heavyForecast.season.label, seasonAt(14).label);
});
