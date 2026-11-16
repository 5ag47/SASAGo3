import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { beginWeek, dispatchDayEvents } from '../../src/domain/events.js';
import { choiceOptions } from '../../src/domain/choices.js';
import {
  recurringCampaignTasks,
  closeCampaignWeek,
  runNight,
  schoolRank,
  queueStory,
} from '../../src/domain/campaign.js';
import { finalCampaignResults, lifeOutcome } from '../../src/domain/campaign-outcomes.js';
import { lockedSlots } from '../../src/domain/schedule.js';
import { finishTask, workTask } from '../../src/domain/tasks.js';
import { assess } from '../../src/domain/academic-grades.js';
import { TASK_MODULES } from '../../src/domain/task-modules/registry.js';
import { taskContext } from '../../src/domain/task-processing.js';
import { runPlannedWeek } from '../helpers/task-games.js';
import { events, courses } from '../../src/domain/catalog.js';
const fresh = (major = 'math', seed = 123) =>
  createGame({ name: '한나', character: 'girl', role: 'steady', major }, seed);
const choose = (s, event, option) => transition(s, { type: 'choose', event, option });
function at(s, week) {
  s.week = week;
  s.pending = [];
  beginWeek(s);
  return s;
}
function finishCurrent(s) {
  s.plan = Array.from({ length: 21 }, (_, i) => ({
    activity: i % 3 === 0 ? 'skip' : 'sleep',
    target: null,
  }));
  return runPlannedWeek(s);
}
test('new games have four documented presets including biology diversity and information physics', () => {
  assert.ok(fresh('biology').courses.includes('biodiversity'));
  assert.ok(fresh('information').courses.includes('physics_seminar'));
  assert.ok(fresh().campaign.priorGpa >= 3 && fresh().campaign.priorGpa <= 4.3);
  assert.equal(fresh().campaign.priorGpa, fresh().campaign.priorGpa);
  assert.notEqual(fresh('math', 1).campaign.priorGpa, fresh('math', 5678).campaign.priorGpa);
});
test('morning commands reject recovery/tasks; extended study accepts only enrolled subjects', () => {
  const s = fresh();
  assert.throws(() => transition(s, { type: 'plan', index: 0, activity: 'game' }), {
    code: 'MORNING_STUDY_ONLY',
  });
  assert.equal(
    transition(s, { type: 'plan', index: 0, activity: 'skip' }).plan[0].activity,
    'skip',
  );
  assert.throws(() => transition(s, { type: 'night_plan', day: 0, activity: 'game' }), {
    code: 'NIGHT_INVALID',
  });
  assert.throws(
    () =>
      transition(s, { type: 'night_plan', day: 0, activity: 'study', target: 'general_chemistry' }),
    { code: 'NIGHT_INVALID' },
  );
  assert.ok(s.campaign.nights.every((n) => n.activity === 'sleep'));
});
test('night studying records 50% risk and Sunday risk survives into Monday', () => {
  let s = fresh();
  s = transition(s, { type: 'night_plan', day: 6, activity: 'study', target: 'math_seminar' });
  s = finishCurrent(s);
  assert.equal(s.campaign.lateRisk, 0.5);
  const before = s.courseMastery.math_seminar;
  runNight(s, 6, []);
  assert.ok(s.courseMastery.math_seminar > before);
  assert.equal(s.campaign.lateRisk, 1);
});
test('100% lateness skips the next morning and clears the consumed risk', () => {
  const s = fresh();
  s.pending = [];
  s.campaign.lateRisk = 1;
  s.plan = Array.from({ length: 21 }, (_, i) => ({
    activity: i === 0 ? 'study' : i % 3 === 0 ? 'skip' : 'sleep',
    target: i === 0 ? 'math_seminar' : null,
  }));
  const next = runPlannedWeek(s);
  assert.equal(next.history[0].actions[0].activity, 'skip');
  assert.equal(next.campaign.lateRisk, 0);
  assert.ok(next.history[0].messages.some((m) => m.includes('지각')));
});
test('Jeju locks Friday through Sunday including night editing', () => {
  const s = at(fresh('biology'), 12);
  assert.deepEqual(Object.keys(lockedSlots(s)).map(Number), [12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.throws(
    () =>
      transition(s, { type: 'night_plan', day: 4, activity: 'study', target: 'general_biology' }),
    { code: 'NIGHT_LOCKED' },
  );
  assert.equal(Object.keys(lockedSlots(at(fresh('chemistry'), 12))).length, 0);
});
test('personal presets persist, protect fixed slots, and discard expired task targets', () => {
  let s = fresh();
  s.plan[1] = { activity: 'task', target: 'practice-report' };
  s = transition(s, { type: 'save_preset', slot: 0, name: '시험 주' });
  s.tasks['practice-report'].status = 'expired';
  s.plan[1] = { activity: 'game', target: null };
  s = transition(s, { type: 'load_preset', slot: 0 });
  assert.equal(s.plan[1].activity, 'sleep');
  const restored = migrateState(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.campaign.presets[0].name, '시험 주');
  assert.ok(validateState(restored));
  s.week = 18;
  s.flags.camp = 'heavy';
  s = transition(s, { type: 'load_preset', slot: 0 });
  assert.equal(lockedSlots(s)[1].activity, 'academy');
});
test('nickname changes never change the immutable player ID', () => {
  const s = fresh(),
    next = transition(s, { type: 'rename', name: '새 한나' });
  assert.equal(next.name, '새 한나');
  assert.equal(next.campaign.playerId, s.campaign.playerId);
  assert.throws(() => transition(s, { type: 'rename', name: ' ' }), { code: 'PROFILE_NAME' });
});
test('legacy campaign migration preserves history, money and all completed work', () => {
  const old = finishCurrent(fresh());
  delete old.campaign;
  const before = structuredClone(old);
  const next = migrateState(old);
  assert.ok(validateState(next));
  assert.deepEqual(next.history, old.history);
  assert.equal(next.money, old.money);
  assert.deepEqual(next.tasks, old.tasks);
  assert.deepEqual(old, before);
});
test('invalid new save fields are rejected', () => {
  for (const mutate of [
    (s) => (s.campaign.lateRisk = NaN),
    (s) => (s.campaign.rank = 91),
    (s) => (s.campaign.nights[0] = { activity: 'study', target: 'bad' }),
    (s) => (s.campaign.applications.snu = 'forged'),
  ]) {
    const s = fresh();
    mutate(s);
    assert.equal(validateState(s), false);
  }
});
test('study groups create their different monthly and weekly schedules without duplicates', () => {
  for (const group of ['friends', 'focused', 'playful']) {
    const s = fresh();
    s.group = group;
    for (let w = 1; w <= 4; w++) {
      s.week = w;
      recurringCampaignTasks(s);
      recurringCampaignTasks(s);
    }
    const tasks = Object.keys(s.tasks).filter((k) => k.startsWith('study-activity-'));
    assert.equal(tasks.length, group === 'friends' ? 1 : group === 'focused' ? 4 : 0);
    assert.equal(
      s.pending.filter((k) => k.startsWith('story_dinner_')).length,
      group === 'friends' ? 1 : group === 'playful' ? 2 : 0,
    );
  }
});
test('union study occurs three times each week except Chuseok, mock interview rotates monthly', () => {
  const s = at(fresh(), 25);
  assert.equal(Object.keys(s.tasks).filter((k) => k.startsWith('union-25-')).length, 3);
  at(s, 27);
  assert.ok(!s.tasks['union-27-1']);
  at(s, 28);
  assert.match(s.tasks['mock-28'].name, /면접관/);
});
test('all three essay stages unlock in sequence and never pay cash', () => {
  const s = at(fresh(), 25),
    money = s.money;
  assert.ok(s.tasks['essay-draft']);
  assert.ok(!s.tasks['essay-rewrite']);
  workTask(s, 'essay-draft', [], 2);
  assert.ok(s.tasks['essay-rewrite']);
  workTask(s, 'essay-rewrite', [], 2);
  assert.ok(s.tasks['essay-feedback']);
  workTask(s, 'essay-feedback', [], 2);
  assert.equal(s.tasks['essay-feedback'].status, 'completed');
  assert.equal(s.money, money);
});
test('romance branches stop after ignoring the crush', () => {
  let s = at(fresh(), 2);
  s = choose(s, 'story_crush', 'study');
  at(s, 4);
  assert.ok(!s.pending.includes('story_smile'));
  at(s, 8);
  assert.ok(!s.pending.includes('story_drink'));
});
test('romance good choices unlock confession and weekly dates', () => {
  let s = at(fresh(), 2);
  s = choose(s, 'story_crush', 'continue');
  at(s, 4);
  s = choose(s, 'story_smile', 'smile');
  at(s, 8);
  s = choose(s, 'story_drink', 'buy');
  at(s, 16);
  s = choose(s, 'story_avoid', 'snack');
  at(s, 20);
  assert.ok(s.pending.includes('story_confession'));
  s = choose(s, 'story_confession', 'accept');
  assert.equal(s.campaign.relationship, 'dating');
  assert.ok(s.tasks['date-20']);
});
test('confrontation unlocks an apology or a failed confession and cannot repeat', () => {
  let s = at(fresh(), 16);
  s.flags.romance_open = true;
  s.flags.eventDeliveries.story_avoid = false;
  dispatchDayEvents(s, 0);
  s = choose(s, 'story_avoid', 'confront');
  dispatchDayEvents(s, 1);
  s = choose(s, 'story_apology', 'confess');
  assert.equal(s.flags.romance_open, false);
  assert.throws(() => choose(s, 'story_apology', 'confess'));
});
test('dating neglect warns at two and three weeks and offers a breakup after four', () => {
  let s = fresh();
  Object.assign(s.campaign, { relationship: 'dating', partnerSince: 20 });
  for (let w = 21; w <= 24; w++) {
    s.week = w;
    closeCampaignWeek(s, []);
  }
  assert.ok(s.notices.some((n) => n.text.includes('2주째')));
  assert.ok(s.notices.some((n) => n.text.includes('3주째')));
  assert.ok(s.pending.includes('story_breakup_25'));
  s = choose(s, 'story_breakup_25', 'accept');
  assert.equal(s.campaign.relationship, 'ended');
});
test('regular dates unlock handholding and later kiss only once', () => {
  let s = fresh();
  Object.assign(s.campaign, { relationship: 'dating', partnerSince: 20 });
  for (let w = 21; w <= 26; w++) {
    s.week = w;
    recurringCampaignTasks(s);
    workTask(s, `date-${w}`, [], 1);
    closeCampaignWeek(s, []);
    if (w === 23) {
      assert.ok(s.pending.includes('story_handhold'));
      s = choose(s, 'story_handhold', 'ok');
    }
  }
  assert.ok(s.pending.includes('story_kiss'));
  assert.equal(s.campaign.totalDates, 6);
});
test('rank gates every SNU tier and bottom-five applicants must reselect', () => {
  for (const [rank, expected] of [
    [1, 4],
    [20, 4],
    [21, 3],
    [40, 3],
    [41, 2],
    [60, 2],
    [61, 1],
    [80, 1],
    [81, 0],
    [90, 0],
  ]) {
    const s = fresh();
    s.campaign.rank = rank;
    const unlocked = choiceOptions(s, 'story_apply_snu').filter(
      (o) => !o.locked && o.id !== 'none',
    );
    assert.equal(new Set(unlocked.map((o) => o.id.split(':')[0])).size, expected);
  }
  let s = at(fresh(), 25);
  s.campaign.rank = 16;
  s = choose(s, 'story_apply_snu', '0:0');
  assert.ok(s.pending.includes('story_apply_snu'));
  assert.equal(s.campaign.snuMinimumTier, 1);
  assert.throws(() => choose(s, 'story_apply_snu', '0:0'), { code: 'OPTION_LOCKED' });
  s = choose(s, 'story_apply_snu', '1:0');
  assert.equal(s.campaign.applications.snu, '기계공학부');
});
test('rank depends on weighted recorded grades and counselling preserves it', () => {
  const a = fresh(),
    b = fresh();
  a.assessments = [{ course: 'math_seminar', score: 100, kind: 'quiz', term: 1, week: 4 }];
  b.assessments = [{ ...a.assessments[0], score: 40 }];
  assert.ok(schoolRank(a) < schoolRank(b));
  at(a, 17);
  assert.equal(a.campaign.rank, schoolRank(a));
});
test('unprepared quiz offers honest 100 or cheating 0 with reputation floored', () => {
  for (const option of ['honest', 'cheat']) {
    let s = fresh();
    s.week = 4;
    s.campaign.quiz = { week: 4, sourceId: 'test', courses: ['math_seminar'] };
    queueStory(s, 'story_quiz_crisis_4');
    s = choose(s, 'story_quiz_crisis_4', option);
    assert.equal(s.assessments.at(-1).score, option === 'honest' ? 100 : 0);
    if (option === 'cheat') assert.equal(s.stats.reputation, 0);
    assert.equal(s.campaign.quiz, null);
  }
});
test('past papers guarantee exactly the next quiz and do not reroll after reload', () => {
  const s = fresh();
  s.flags.next_quiz_perfect = true;
  s.week = 4;
  const copy = JSON.parse(JSON.stringify(s));
  assess(s, 'quiz');
  assess(copy, 'quiz');
  assert.ok(s.assessments.every((a) => a.score === 100));
  assert.equal(s.flags.next_quiz_perfect, false);
  assert.deepEqual(s, copy);
});
test('six subject mini-games grade answers, hide hints by mastery, and keep answers server-side', () => {
  const module = TASK_MODULES.subject_quiz_v1;
  for (const subject of ['math', 'physics', 'chemistry', 'biology', 'earth', 'information']) {
    let d = module.game.create({ roll: () => 0.3, ability: 90, params: { subject } });
    assert.ok(module.game.valid(d));
    assert.equal(d.questions[0].hidden.length, 3);
    assert.equal(module.game.public(d).questions[0].correct, undefined);
    for (let i = 0; i < 3; i++)
      d = module.game.act({}, d, { type: 'answer', answer: d.questions[i].correct });
    assert.equal(d.quality, 100);
    assert.ok(module.game.valid(d));
  }
});
test('random story outcomes replay deterministically and failed contests pay no reward', () => {
  const s = at(fresh(), 20);
  const a = choose(s, 'story_contest_ai', 'posco'),
    b = choose(JSON.parse(JSON.stringify(s)), 'story_contest_ai', 'posco');
  assert.deepEqual(a, b);
  assert.equal(a.money - s.money, a.awards > s.awards ? 20000 : 0);
});
test('final results require the department, grades, condition, interview and submitted documents', () => {
  const s = fresh();
  s.week = 37;
  s.stats = { ...s.stats, hp: 90, reputation: 90, math: 95, science: 90 };
  s.campaign.priorGpa = 4.3;
  s.campaign.applications = { snu: '수리과학부', kaist: '무학과', yonsei: '기계공학부' };
  s.assessments = [{ course: 'math_seminar', score: 100, kind: 'final', term: 1, week: 16 }];
  s.interviewScore = 100;
  s.documents = {};
  finalCampaignResults(s);
  assert.ok(s.admissions.find((a) => a.profile === 'top_interview').accepted);
  const count = s.admissions.length;
  finalCampaignResults(s);
  assert.equal(s.admissions.length, count);
  const fail = fresh();
  fail.week = 37;
  finalCampaignResults(fail);
  assert.ok(!fail.admissions.some((a) => a.accepted));
  assert.match(lifeOutcome({ ...s, stats: { ...s.stats, hp: 10 } }), /병원/);
});
test('copied nights, saved presets and actual night deltas survive reload without repeating work', () => {
  let s = transition(fresh(), {
    type: 'night_plan',
    day: 0,
    activity: 'study',
    target: 'math_seminar',
  });
  s = transition(s, { type: 'copy_day', sourceDay: 0, days: [1, 6] });
  assert.equal(s.campaign.nights[6].target, 'math_seminar');
  s = finishCurrent(s);
  assert.equal(s.history[0].nightActions.length, 7);
  assert.equal(s.history[0].nightActions[0].delta.hp, -2);
  const restored = migrateState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.history, s.history);
});
test('essay feedback completes the admission essay once and preserves its completion record', () => {
  const s = at(fresh(), 25);
  for (const id of ['essay-draft', 'essay-rewrite', 'essay-feedback']) workTask(s, id, [], 2);
  assert.equal(s.tasks.essay.status, 'completed');
  const before = structuredClone(s);
  finishTask(s, s.tasks['essay-feedback'], []);
  assert.deepEqual(s, before);
});
test('first round rejects low grades and only qualified applicants get university interviews', () => {
  const fail = at(fresh(), 33);
  assert.equal(fail.flags.hannah_first_round_snu, false);
  assert.ok(!fail.pending.includes('story_interview_kaist'));
  const qualified = fresh();
  qualified.campaign.priorGpa = 4.3;
  qualified.campaign.applications = { snu: '수리과학부', kaist: '무학과' };
  qualified.documents = {};
  qualified.stats.reputation = 90;
  qualified.assessments = [
    { course: 'math_seminar', score: 100, kind: 'final', term: 1, week: 16 },
  ];
  at(qualified, 33);
  assert.equal(qualified.flags.hannah_first_round_snu, true);
  assert.ok(qualified.pending.includes('story_interview_kaist'));
});
test('AI glasses have seeded rare success and frequent caught outcomes, not unconditional disqualification', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    let s = at(fresh('math', seed), 30);
    s = choose(s, 'story_ai_glasses', 'use');
    seen.add(s.flags.ai_glasses_caught);
    if (s.flags.ai_glasses_caught) assert.equal(s.stats.reputation, 0);
  }
  assert.deepEqual(seen, new Set([true, false]));
});
test('solo study and malformed preset storage cannot trap or forge a schedule', () => {
  const solo = choose(fresh(), 'winter_study', 'solo');
  assert.equal(solo.studyApplication, null);
  assert.ok(!solo.pending.includes('winter_study'));
  const s = transition(fresh(), { type: 'save_preset', slot: 0, name: '내 계획' });
  s.campaign.presets[0].plan[0].activity = 'forged';
  assert.equal(validateState(s), false);
});
