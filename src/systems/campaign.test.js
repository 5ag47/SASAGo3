import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERVIEW, MAJORS } from '../data/campaign.js';
import { expandPlan, migrateCampaign, requiredNotices, courseStats, slotLocked, activityOptions, admissionScore, answerInterview, buyItem, chooseEvent, enrolled, evaluateEnding, newCampaign, notices, resolveCampaign, submitApplication, term, validCampaign } from './campaign.js';

function acknowledge(g, strategy = {}) {
  while (notices(g).length) {
    const e = notices(g)[0];
    if (e.kind === 'interview') g = answerInterview(g,INTERVIEW[g.interviewAnswers.length].answer);
    else g = chooseEvent(g,e.id,strategy[e.id] ?? 0);
  }
  return g;
}
function next(g) { return resolveCampaign(acknowledge(g)); }

test('전공별 프리셋과 교양필수, 자동 능력치 설정', () => {
  for (const major of Object.keys(MAJORS)) {
    const g = newCampaign({major,seed:42});
    assert.equal(enrolled(g).filter(c => c.majors.length === 0).length,4);
    assert.ok(enrolled(g).every(c => !c.majors.length || c.majors.includes(major)));
    assert.equal(g.plan.length,28);
    assert.equal(validCampaign(g),true);
  }
  assert.equal(newCampaign({trait:'strong'}).stats.hp,85);
});

test('미확인 알림이 있으면 시간 진행을 막고 동일 이벤트 보상을 중복 적용하지 않는다', () => {
  const g = newCampaign({seed:1});
  assert.equal(resolveCampaign(g),g);
  const chosen = chooseEvent(g,'study',0);
  assert.equal(chooseEvent(chosen,'study',0),chosen);
  assert.equal(resolveCampaign(chosen).week,1);
});

test('스터디 거절은 해당 팀을 제외하고 다른 선택을 허용한다', () => {
  let g = newCampaign({seed:1000});
  g.stats.reputation = 0;
  g = chooseEvent(g,'study',1);
  assert.deepEqual(g.failedStudies,['serious']);
  assert.equal(chooseEvent(g,'study',1),g);
  assert.equal(chooseEvent(g,'study',0).study,'friends');
});

test('할 일은 배정한 시간만큼 진행되고 마감 때 완료 또는 만료된다', () => {
  let g = acknowledge(next(newCampaign({seed:2})));
  const q = g.quests.find(q => q.id === 'course-linear');
  g.plan = expandPlan(Array(14).fill('rest'));
  g.plan[1] = `quest:${q.id}`;
  g = resolveCampaign(g);
  assert.equal(g.quests.find(x => x.id === q.id).progress,1);
  g.plan[1] = `quest:${q.id}`;g.plan[2] = `quest:${q.id}`;
  g = next(g);
  assert.equal(g.quests.find(x => x.id === q.id).status,'complete');
  assert.ok(g.grades.linear.assignment.length >= 1);
  while (g.week <= 4) g = next(g);
  assert.equal(g.quests.find(q => q.id === 'academy-1').status,'expired');
  assert.equal(g.grades.linear.quiz.length,1);
});

test('14칸 모두 실행, 잔고 부족은 휴식으로 대체하고 스탯 범위를 지킨다', () => {
  let g = acknowledge(newCampaign({seed:10}));
  g.money = 0;g.plan = expandPlan(Array(14).fill('academy'));
  const r = resolveCampaign(g);
  assert.equal(r.money,10000);
  assert.equal(r.lastResult.notes.filter(n => n.includes('비용 부족')).length,14);
  assert.ok(Object.values(r.stats).every(v => v >= 0 && v <= 100));
  assert.deepEqual(resolveCampaign(g),r,'동일 저장과 선택의 결과는 재현 가능');
});

test('휴식이 피로를 회복하며 기숙사 청소와 스터디 수면을 판정한다', () => {
  let g = acknowledge(next(newCampaign({seed:2})));
  g.fatigue = true;g.stats.hp = 10;g.stats.stress = 95;g.plan = expandPlan(Array(14).fill('rest'));
  const rested = resolveCampaign(g);
  assert.equal(rested.fatigue,false);
  assert.equal(rested.penalties,2);
  g.plan[1] = 'clean';
  assert.ok(resolveCampaign(g).penalties < 2);
});

test('매점 비용, 중복 구매, 의상 영구 보유', () => {
  let g = newCampaign({seed:2});
  g = buyItem(g,'outfit');
  assert.equal(g.money,10000);
  assert.deepEqual(g.inventory,['outfit']);
  assert.equal(buyItem(g,'outfit'),g);
  g.money = 0;
  assert.equal(buyItem(g,'snack'),g);
});

test('원서는 9월에만 접수 가능하며 수능은 상담 후에만 해금된다', () => {
  let g = newCampaign({seed:1});
  assert.equal(submitApplication(g,'kaist','공학'),g);
  assert.equal(activityOptions(g).some(a => a.id === 'csat'),false);
  while (g.week < 17) g = next(g);
  g = acknowledge(g);
  assert.equal(g.csatUnlocked,true);
  assert.equal(activityOptions(g).some(a => a.id === 'csat'),true);
  while (g.week < 25) g = next(g);
  g = submitApplication(g,'csat','융합');
  assert.equal(g.application.university,'csat');
  g.week = 29;
  assert.equal(submitApplication(g,'kaist','공학'),g);
});

test('외부대회는 서울대 미반영, 구술·서술·면접은 수능 미반영', () => {
  const g = newCampaign({seed:1});
  const awarded = {...g,awards:2};
  assert.equal(admissionScore(g,'snu'),admissionScore(awarded,'snu'));
  assert.equal(admissionScore(awarded,'kaist') - admissionScore(g,'kaist'),8);
  const eloquent = structuredClone(g);
  eloquent.stats.speech=100;eloquent.stats.writing=100;eloquent.interviewScore=30;
  assert.equal(admissionScore(g,'csat'),admissionScore(eloquent,'csat'));
});

test('38주 전체 진행과 모든 전공의 저장/복원이 엔딩까지 정상 동작한다', () => {
  for (const major of Object.keys(MAJORS)) {
    let g = newCampaign({major,seed:42});
    for (let step=0;step<38;step++) {
      g = acknowledge(g);
      if (g.week === 25) g = submitApplication(g,'kaist','공학');
      const prev = structuredClone(g);
      g = resolveCampaign(g);
      assert.equal(validCampaign(JSON.parse(JSON.stringify(g))),true,`${major}: ${step}`);
      assert.equal(prev.history.length,step,'입력 상태를 변경하지 않는다');
    }
    assert.ok(g.ending);
    assert.equal(g.history.length,38);
    assert.equal(resolveCampaign(g),g);
    assert.equal(g.interviewScore,30);
    assert.ok(enrolled(g).every(c => g.grades[c.id].assignment.length >= 1));
    assert.equal(term(g.week).month,12);
  }
});

test('합격·재수·창업·알바 엔딩 분기', () => {
  const g = newCampaign();
  g.application = {university:'csat',department:'융합'};
  g.stats.csat = 100;
  assert.match(evaluateEnding(g).title,/합격/);
  g.stats.csat = 0;
  assert.match(evaluateEnding(g).title,/시대인재/);
  g.application = null;g.money = 200000;
  assert.match(evaluateEnding(g).title,/창업/);
  g.money = 0;
  assert.match(evaluateEnding(g).description,/알바/);
});

test('깨진 저장은 거부한다', () => {
  for (const bad of [null,{}, {version:1}]) assert.equal(validCampaign(bad),false);
  const g = newCampaign();
  for (const patch of [{stats:{}},{quests:[{}]},{quests:[null]},{feedback:{}},{lastResult:{}},{plan:['unknown']},{grades:{}},{history:[{}]},{seed:-1}]) assert.equal(validCampaign({...g,...patch}),false);
});

test('상담 후 실제 일정만으로 수능 합격 루트를 끝까지 플레이할 수 있다', () => {
  let g = newCampaign({seed:99});
  while (!g.ending) {
    g = acknowledge(g);
    if (g.csatUnlocked) g.plan = expandPlan(['csat','rest','csat','rest','csat','rest','csat','rest','csat','rest','clean','rest','csat','rest']);
    if (g.week === 25) g = submitApplication(g,'csat','자연과학');
    g = resolveCampaign(g);
  }
  assert.match(g.ending.title,/합격/);
  assert.equal(g.ending.score,100);
});

test('과제는 알림 확인 없이 자동 추가되고 읽지 않은 안내는 다음 주를 막지 않는다', () => {
  let g = next(newCampaign({seed:9}));
  assert.ok(g.quests.some(q => q.id === 'thesis'));
  assert.ok(g.quests.some(q => q.id === 'clean-1'));
  assert.ok(g.quests.some(q => q.id === 'weekly-1'));
  assert.equal(requiredNotices(g).length,0);
  assert.equal(notices(g).filter(e => e.id === 'academy-info').length,1);
  const nextWeek = resolveCampaign(g);
  assert.equal(nextWeek.week,2);
  assert.equal(notices(nextWeek).some(e => e.id === 'academy-info'),false);
});

test('아침/연장 선택 제한과 연장 공부 후 다음 날 50% 늦잠을 적용한다', () => {
  let g = acknowledge(newCampaign({seed:1}));
  g.plan = expandPlan(Array(14).fill('rest'));
  g.plan[3] = 'math'; g.plan[4] = 'math';
  const r = resolveCampaign(g);
  assert.ok(r.lastResult.notes.some(n => n.includes('화요일 연장자습 후 늦잠')));
  g.plan[0] = 'play';
  assert.equal(resolveCampaign(g),g,'아침 게임은 실행 불가');
  g.plan[0] = 'skip';g.plan[3] = 'exercise';
  assert.equal(resolveCampaign(g),g,'연장 운동은 실행 불가');
  g.plan[3] = 'sleep';
  assert.ok(!resolveCampaign(g).lastResult.notes.some(n => n.includes('늦잠')));
});

test('일요일 연장 공부는 다음 주 월요일 아침까지 이어진다', () => {
  let g = acknowledge(newCampaign({seed:1}));
  g.plan[27] = 'math';
  g = resolveCampaign(g);
  assert.equal(g.overnightStudy,true);
  g.plan[0] = 'math';
  g = resolveCampaign(g);
  assert.ok(g.lastResult.notes.some(n => n.includes('월요일 연장자습 후 늦잠')));
});

test('전공 스탯과 제주도 탐사는 생다이 수강 여부를 따른다', () => {
  const cs = newCampaign({major:'cs'});
  assert.ok(courseStats(cs).some(c => c.id === 'physics_seminar'));
  assert.ok(!courseStats(cs).some(c => c.id === 'english'));
  assert.ok(courseStats(cs).some(c => c.id === 'math_seminar'));
  let bio = newCampaign({major:'biology',seed:2});
  while (bio.week < 12) bio = next(bio);
  assert.ok(slotLocked(bio,16));
  assert.ok(slotLocked(bio,27));
  assert.ok(!slotLocked(bio,15));
  assert.ok(notices(bio).some(e => e.id === 'jeju'));
  const other = {...cs,week:12};
  assert.ok(!slotLocked(other,16));
  assert.ok(!notices(other).some(e => e.id === 'jeju'));
});

test('찐친 월 1회 과제/회식과 노는 팀 격주 회식이 서로 다르다', () => {
  let g = next(newCampaign({seed:3}));
  g = next(g);
  assert.ok(g.quests.some(q => q.id === 'study-2'));
  assert.ok(!notices(g).some(e => e.id.startsWith('party-')));
  g = next(next(g));
  assert.ok(notices(g).some(e => e.id === 'party-4'));
  const before = g.stats.math;
  assert.equal(chooseEvent(g,'party-4',0).stats.math,before);
  const play = {...g,study:'play',week:2};
  assert.ok(notices(play).some(e => e.id === 'party-2'));
});

test('구버전의 14칸 저장을 28칸으로 옮기고 새 과목과 자동 과제를 복원한다', () => {
  const old = newCampaign({major:'cs'});
  old.version = 1; old.week = 1;
  old.plan = ['math','rest','science','rest','math','play','science','rest','interview','rest','clean','rest','math','exercise'];
  delete old.mastery.physics_seminar;delete old.grades.physics_seminar;
  const g = migrateCampaign(old);
  assert.equal(validCampaign(g),true);
  assert.equal(g.plan[0],'skip');assert.equal(g.plan[1],'math');assert.equal(g.plan[3],'sleep');
  assert.ok(g.quests.some(q => q.id === 'thesis'));
  assert.equal(g.stats.focus,Math.max(0,g.stats.hp - g.stats.stress));
});

