// Optional browser smoke test: install Playwright, start Vite, then run this file.
// PLAYWRIGHT_MODULE can point to a preinstalled Playwright module.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { newCampaign, notices, chooseEvent, resolveCampaign } from '../src/systems/campaign.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1100}});
const errors = [];
page.on('pageerror',e => errors.push(e.message));
await mkdir('.qa',{recursive:true});
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByPlaceholder('어떻게 불러줄까?').fill('테스트사사');
  await page.getByRole('button',{name:'겨울방학으로'}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  assert.equal(await page.getByRole('combobox').count(),14);
  await page.getByRole('button',{name:'알림 1',exact:true}).click();
  await page.getByRole('button',{name:'찐친들 스터디',exact:false}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByLabel('월요일 1자').selectOption('course:linear');
  await page.reload();
  assert.equal(await page.getByLabel('월요일 1자').inputValue(),'course:linear');
  await page.screenshot({path:'.qa/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'한 주 시작하기',exact:true}).click();
  await page.getByRole('button',{name:'계획대로 한 주 보내기'}).click();
  await page.getByRole('button',{name:'다음 주 준비하기'}).click();
  await page.getByRole('button',{name:'알림 1',exact:true}).click();
  await page.getByRole('button',{name:'확인 · 할 일에 추가'}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByLabel('월요일 1자').selectOption('quest:thesis');
  await page.getByRole('button',{name:'매점',exact:true}).click();
  await page.getByRole('button',{name:'구매 · 사용'}).first().click();
  assert.equal(await page.getByRole('button',{name:'이번 주 구매 완료'}).count(),1);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('button',{name:'수강 과목 · 성적표',exact:true}).click();
  assert.equal(await page.getByRole('cell',{name:'일반물리',exact:false}).count(),1);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.qa/mobile.png',fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'mobile must not overflow horizontally');
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
    late.plan = ['csat','rest','csat','rest','csat','rest','csat','rest','csat','rest','clean','rest','csat','rest'];
    late = resolveCampaign(late);
  }
  await page.evaluate(value => localStorage.setItem('sasago3-campaign-v1',JSON.stringify(value)),late);
  await page.reload();
  await page.getByRole('button',{name:'알림 1',exact:true}).click();
  await page.getByRole('button',{name:'조건과 가정을 정리하고 접근법을 설명한다'}).click();
  await page.getByRole('button',{name:'측정 오차와 가설을 구분하고 재검증을 제안한다'}).click();
  await page.getByRole('button',{name:'기여한 부분과 실패에서 배운 점을 구체적으로 말한다'}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  for (let week=34;week<=37;week++) {
    await page.getByRole('button',{name:week === 37 ? '12월 결과 확인하기' : '한 주 시작하기',exact:true}).click();
    await page.getByRole('button',{name:'계획대로 한 주 보내기'}).click();
    await page.getByRole('button',{name:week === 37 ? '엔딩 확인하기' : '다음 주 준비하기',exact:true}).click();
  }
  await page.getByRole('heading',{name:'수능 전형 합격!',exact:true}).waitFor();
  await page.screenshot({path:'.qa/ending.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: onboarding, 14 slots, events, reload persistence, shop, grades, mobile, quests, application, interview, ending; no browser errors');
} finally {await browser.close();}
