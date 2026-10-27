// Optional browser smoke test: install Playwright, start Vite, then run this file.
// PLAYWRIGHT_MODULE can point to a preinstalled Playwright module.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { expandPlan, newCampaign, notices, chooseEvent, resolveCampaign } from '../src/systems/campaign.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge',headless:true});
const page = await browser.newPage({viewport:{width:1366,height:768}});
const errors = [];
page.on('pageerror',e => errors.push(e.message));
await mkdir('.qa',{recursive:true});
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByPlaceholder('어떻게 불러줄까?').fill('테스트사사');
  await page.getByRole('button',{name:'겨울방학으로'}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  assert.equal(await page.getByRole('combobox').count(),1);
  await page.getByRole('button',{name:/알림장/}).click();
  await page.getByRole('button',{name:'찐친들 스터디',exact:false}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByLabel('월요일 1자 활동').selectOption('course:linear');
  await page.getByRole('button',{name:'변경한 일정 신청하기'}).click();
  await page.reload();
  assert.equal(await page.getByLabel('월요일 1자 활동').inputValue(),'course:linear');
  await page.screenshot({path:'.qa/desktop.png',fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth),'desktop is a single viewport');
  await page.getByRole('button',{name:'화요일',exact:true}).click();
  await page.getByRole('button',{name:'아침 자습',exact:true}).click();
  await page.getByRole('button',{name:'참여',exact:true}).click();
  await page.getByLabel('화요일 아침 자습 활동').selectOption('science');
  await page.getByRole('button',{name:'변경한 일정 신청하기'}).click();
  await page.getByRole('button',{name:'연장 자습',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'잠',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'학습',exact:true}).click();
  await page.getByRole('button',{name:'변경한 일정 신청하기'}).click();
  await page.getByRole('button',{name:'설정',exact:true}).click();
  await page.getByRole('slider',{name:'효과음 음량'}).fill('0.5');
  await page.getByRole('button',{name:'로그아웃',exact:true}).click();
  await page.getByRole('button',{name:'이어하기',exact:true}).click();
  const edited = await page.evaluate(() => JSON.parse(localStorage.getItem('sasago3-campaign-v1')));
  assert.equal(edited.plan[4],'science');assert.equal(edited.plan[7],'math');assert.equal(edited.volume,.5);
  await page.getByRole('button',{name:'한 주 시작하기',exact:true}).click();
  await page.getByRole('button',{name:'계획대로 한 주 보내기'}).click();
  await page.getByRole('button',{name:'다음 주 준비하기'}).click();
  // No notification click: the thesis must already exist in the task list.
  assert.equal(await page.getByLabel('할 일 목록').getByText('졸업논문',{exact:true}).count(),1);
  await page.getByLabel('월요일 1자 활동').selectOption('quest:thesis');
  await page.getByRole('button',{name:'변경한 일정 신청하기'}).click();
  await page.getByRole('button',{name:'매점',exact:true}).click();
  await page.getByRole('button',{name:'구매 · 사용'}).first().click();
  assert.equal(await page.getByRole('button',{name:'이번 주 구매 완료'}).count(),1);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('button',{name:'성적표',exact:true}).click();
  assert.equal(await page.getByRole('cell',{name:'일반물리',exact:false}).count(),1);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.qa/mobile.png',fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight),'mobile must fit one screen');
  await page.getByRole('button',{name:'한 주 시작하기',exact:true}).click();
  await page.getByRole('button',{name:'계획대로 한 주 보내기'}).click();
  await page.getByRole('button',{name:'다음 주 준비하기'}).click();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('sasago3-campaign-v1')));
  assert.equal(save.week,2);
  assert.equal(save.quests.find(q => q.id === 'thesis').progress,1);
  // A generated, valid late-game fixture exercises the admission/interview UI.
  let late = newCampaign({name:'입시테스트',seed:99});
  while (late.week < 25) {
    for (const event of notices(late)) late = chooseEvent(late,event.id,0);
    late = resolveCampaign(late);
  }
  await page.evaluate(value => localStorage.setItem('sasago3-campaign-v1',JSON.stringify(value)),late);
  await page.reload();
  await page.getByRole('button',{name:'진학실',exact:true}).click();
  await page.getByLabel('목표 대학').selectOption('csat');
  await page.getByRole('button',{name:'원서 접수 · 변경'}).click();
  await page.getByText('접수 완료: 수능 전형 공학',{exact:true}).waitFor();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  late = await page.evaluate(() => JSON.parse(localStorage.getItem('sasago3-campaign-v1')));
  while (late.week < 34) {
    for (const event of notices(late)) late = chooseEvent(late,event.id,0);
    late.plan = expandPlan(['csat','rest','csat','rest','csat','rest','csat','rest','csat','rest','clean','rest','csat','rest']);
    late = resolveCampaign(late);
  }
  await page.evaluate(value => localStorage.setItem('sasago3-campaign-v1',JSON.stringify(value)),late);
  await page.reload();
  await page.getByRole('button',{name:/알림장/}).click();
  await page.getByRole('button',{name:'조건과 가정을 정리하고 접근법을 설명한다'}).click();
  await page.getByRole('button',{name:'측정 오차와 가설을 구분하고 재검증을 제안한다'}).click();
  await page.getByRole('button',{name:'기여한 부분과 실패에서 배운 점을 구체적으로 말한다'}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  for (let week=34;week<=37;week++) {
    if (await page.getByRole('button',{name:/알림장/}).isEnabled()) {
      await page.getByRole('button',{name:/알림장/}).click();
      if (await page.getByRole('button',{name:/회식 참여/}).count()) await page.getByRole('button',{name:/회식 참여/}).click();
      await page.getByRole('button',{name:'닫기',exact:true}).click();
    }
    await page.getByRole('button',{name:week === 37 ? '12월 결과 확인하기' : '한 주 시작하기',exact:true}).click();
    await page.getByRole('button',{name:'계획대로 한 주 보내기'}).click();
    await page.getByRole('button',{name:week === 37 ? '엔딩 확인하기' : '다음 주 준비하기',exact:true}).click();
  }
  await page.getByRole('heading',{name:'수능 전형 합격!',exact:true}).waitFor();
  await page.screenshot({path:'.qa/ending.png',fullPage:true});
  let bio = newCampaign({major:'biology',seed:1});
  while (bio.week < 12) {
    for (const e of notices(bio)) bio = chooseEvent(bio,e.id,0);
    bio = resolveCampaign(bio);
  }
  await page.evaluate(value => localStorage.setItem('sasago3-campaign-v1',JSON.stringify(value)),bio);
  await page.reload();
  for (const day of ['금','토','일']) assert.equal(await page.getByRole('button',{name:`${day}요일 제주도 탐사`}).isDisabled(),true);
  assert.equal(await page.getByAltText('한라산과 바다, 한라봉이 있는 제주도 탐사 일러스트').count(),1);
  await page.screenshot({path:'.qa/jeju.png',fullPage:true});
  for (const viewport of [{width:1024,height:768},{width:800,height:600},{width:360,height:640}]) {
    await page.setViewportSize(viewport);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight),`single viewport at ${viewport.width}x${viewport.height}`);
    const play = await page.getByRole('button',{name:'한 주 시작하기',exact:true}).boundingBox();
    assert.ok(play && play.y >= 0 && play.y + play.height <= viewport.height);
    const apply = await page.getByRole('button',{name:'신청하기',exact:true}).boundingBox();
    assert.ok(apply && apply.y > 0 && apply.y + apply.height < play.y,'application button stays visible inside the game');
    await page.screenshot({path:`.qa/screen-${viewport.width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: single-screen UI, day editor, 28 slots, events, reload persistence, shop, grades, mobile, quests, application, interview, ending; no browser errors');
} finally {await browser.close();}
