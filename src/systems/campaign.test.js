import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERVIEW, MAJORS } from '../data/campaign.js';
import { activityOptions, admissionScore, answerInterview, buyItem, chooseEvent, enrolled, evaluateEnding, newCampaign, notices, resolveCampaign, submitApplication, term, validCampaign } from './campaign.js';

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
    assert.equal(g.plan.length,14);
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
  g.plan = Array(14).fill('rest');
  g.plan[0] = `quest:${q.id}`;
  g = resolveCampaign(g);
  assert.equal(g.quests.find(x => x.id === q.id).progress,1);
  g.plan[0] = `quest:${q.id}`;g.plan[1] = `quest:${q.id}`;
  g = next(g);
  assert.equal(g.quests.find(x => x.id === q.id).status,'complete');
  assert.equal(g.grades.linear.assignment.length,1);
  while (g.week <= 4) g = next(g);
  assert.equal(g.quests.find(q => q.id === 'academy-1').status,'expired');
  assert.equal(g.grades.linear.quiz.length,1);
});

test('14칸 모두 실행, 잔고 부족은 휴식으로 대체하고 스탯 범위를 지킨다', () => {
  let g = acknowledge(newCampaign({seed:10}));
  g.money = 0;g.plan = Array(14).fill('academy');
  const r = resolveCampaign(g);
  assert.equal(r.money,10000);
  assert.equal(r.lastResult.notes.filter(n => n.includes('비용 부족')).length,14);
  assert.ok(Object.values(r.stats).every(v => v >= 0 && v <= 100));
  assert.deepEqual(resolveCampaign(g),r,'동일 저장과 선택의 결과는 재현 가능');
});

test('휴식이 피로를 회복하며 기숙사 청소와 스터디 수면을 판정한다', () => {
  let g = acknowledge(next(newCampaign({seed:2})));
  g.fatigue = true;g.stats.hp = 10;g.stats.stress = 95;g.plan = Array(14).fill('rest');
  const rested = resolveCampaign(g);
  assert.equal(rested.fatigue,false);
  assert.equal(rested.penalties,2);
  g.plan[0] = 'clean';
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
    assert.ok(enrolled(g).every(c => g.grades[c.id].assignment.length === 1));
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
    if (g.csatUnlocked) g.plan = ['csat','rest','csat','rest','csat','rest','csat','rest','csat','rest','clean','rest','csat','rest'];
    if (g.week === 25) g = submitApplication(g,'csat','자연과학');
    g = resolveCampaign(g);
  }
  assert.match(g.ending.title,/합격/);
  assert.equal(g.ending.score,100);
});

