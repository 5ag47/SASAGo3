import courses from '../data/courses.json' with { type: 'json' };
import { ACTIONS, EVENTS, INTERVIEW, LABELS, MAJORS, SHOP, TRAITS, UNIVERSITIES } from '../data/campaign.js';

export const SAVE_KEY = 'sasago3-campaign-v1';
export const END_WEEK = 37;
const clamp = (v, max = 100) => Math.max(0, Math.min(max, v));
const copy = value => structuredClone(value);
export function term(week) {
  if (week === 0) return { name:'겨울방학', month:2, part:1, label:'겨울방학 · 튜토리얼' };
  const month = Math.min(12, 3 + Math.floor((week - 1) / 4));
  const part = (week - 1) % 4 + 1;
  const name = month <= 6 ? '1학기' : month <= 8 ? '여름방학' : '2학기';
  return { name, month, part, label:`${month}월 ${part}주 · ${name}` };
}
export const enrolled = game => courses.filter(c => !c.majors.length || c.majors.includes(game.major));
export const PERIODS = ['아침 자습','1자','2자','연장 자습'];
export const expandPlan = plan => plan.flatMap((v,i) => i % 2 === 0 ? ['skip',v] : [v,'sleep']);
export const defaultPlan = () => expandPlan(['math','rest','science','rest','math','play','science','rest','interview','rest','clean','rest','math','exercise']);
export const courseStats = g => enrolled(g).filter(c => c.majors.length || c.id === 'math_seminar');
export const isLearning = id => id.startsWith('course:') || id.startsWith('quest:') || ['math','science','interview','csat','academy','clean'].includes(id);
export function validSlot(id,i) {
  const study = isLearning(id) && id !== 'clean' && !id.startsWith('quest:clean-');
  if (i % 4 === 0) return id === 'skip' || study;
  if (i % 4 === 3) return id === 'sleep' || study;
  return !['skip','sleep'].includes(id) && (id !== 'work' || i >= 20);
}
export const isTrip = g => g.week === 12 && enrolled(g).some(c => c.id === 'biodiversity');
export const slotLocked = (g,i) => (isTrip(g) && i >= 16) || (i % 4 === 1 && Math.floor(i / 4) < g.lockedSlots);
export function syncTasks(source) {
  const g = copy(source);
  for (const e of EVENTS.filter(e => e.task && e.week <= g.week && e.task.due >= g.week)) quest(g,e.task);
  return g;
}
export function migrateCampaign(source) {
  if (!source || ![1,2].includes(source.version)) return source;
  const g = copy(source);
  if (g.version === 1) {
    g.plan = expandPlan(g.plan);
    g.version = 2;
    g.overnightStudy = false;
    g.volume = .3;
    for (const c of enrolled(g)) {
      g.mastery[c.id] ??= 25;
      g.grades[c.id] ??= {quiz:[],midterm:null,final:null,assignment:[]};
    }
  }
  g.stats.focus = clamp(g.stats.hp - g.stats.stress);
  return syncTasks(g);
}
function apply(game, effects = {}, efficiency = 1) {
  for (const [key, amount] of Object.entries(effects)) {
    if (!(key in game.stats)) continue;
    game.stats[key] = clamp(game.stats[key] + amount * (['math','science','writing','speech','csat'].includes(key) && amount > 0 ? efficiency : 1));
  }
  game.stats.focus = clamp(game.stats.hp - game.stats.stress);
}
function random(game) {
  game.seed = (Math.imul(game.seed, 1664525) + 1013904223) >>> 0;
  return game.seed / 4294967296;
}
export function newCampaign({name='사사',character='boy',major='physics',trait='steady',difficulty='normal',seed=Date.now()} = {}) {
  const game = {
    version:2,overnightStudy:false,volume:.3,name:name.trim().slice(0,12) || '사사',character,major,trait,difficulty,seed:seed >>> 0,
    week:0,night:false,money:30000,stats:{hp:65,focus:50,reputation:40,stress:25,math:28,science:28,writing:25,speech:20,csat:0},
    plan:defaultPlan(),study:null,failedStudies:[],seen:[],quests:[],grades:{},mastery:{},history:[],lastResult:null,
    penalties:0,fatigue:false,csatUnlocked:false,teacher:0,setting:'home',lockedSlots:0,awards:0,recommendation:0,
    application:null,interviewAnswers:[],interviewScore:0,creative:false,inventory:[],purchases:[],ending:null,
  };
  apply(game,TRAITS[trait].effects);
  if (difficulty === 'easy') { apply(game,{math:10,science:10,hp:10}); game.money += 20000; }
  game.previousGpa = difficulty === 'easy' ? 3.8 : 3.1;
  for (const c of enrolled(game)) { game.mastery[c.id] = 25; game.grades[c.id] = {quiz:[],midterm:null,final:null,assignment:[]}; }
  return beginWeek(game);
}
function quest(game, spec) {
  if (!game.quests.some(q => q.id === spec.id)) game.quests.push({progress:0,status:'active',reward:{},...spec});
}
function beginWeek(game) {
  const w = game.week;
  game.lockedSlots = 0;
  game.purchases = [];
  if (w > END_WEEK) return game;
  if (w >= 1 && w <= 16 && (w - 1) % 4 === 0) {
    const due = w + 3;
    quest(game,{id:`academy-${w}`,name:'해냄 숙제 묶음',target:2,due,reward:{math:5,reputation:3},penalty:{math:-3,reputation:-4}});
    const selected = enrolled(game);
    const monthIndex = Math.floor((w - 1) / 4);
    // 모든 수강 과목에 학기 중 적어도 한 번 수행평가가 배정된다.
    selected.filter((_,i) => i % 4 === monthIndex).forEach(c => quest(game,{id:`course-${c.id}`,name:c.task,course:c.id,target:3,due,reward:{[c.ability]:3,reputation:2}}));
    if (w === 1) selected.filter(c => ['project','algorithm','math_seminar','physics'].includes(c.id)).forEach(c => quest(game,{id:`course-${c.id}`,name:c.id === 'algorithm' ? '고급알고리즘 발표' : c.task,course:c.id,target:3,due,reward:{[c.ability]:3,reputation:2}}));
  }
  if (w > 0 && (game.study === 'serious' || (game.study === 'friends' && w % 4 === 2))) quest(game,{id:`study-${w}`,name:'스터디활동',target:1,due:w,reward:{math:4},penalty:{reputation:-1,stress:6},fine:2000});
  if (w >= 1 && w <= 16) {
    const c = enrolled(game)[(w - 1) % enrolled(game).length];
    quest(game,{id:`weekly-${w}`,name:`${c.name} 주간 과제`,course:c.id,target:1,due:w,reward:{[c.ability]:2},penalty:{[c.ability]:-2,reputation:-2,stress:4}});
  }
  if (w > 0 && term(w).name !== '여름방학') quest(game,{id:`clean-${w}`,name:'방 청소',target:1,due:w,reward:{},penalty:{reputation:-2,stress:3}});
  return syncTasks(game);
}
export function notices(game) {
  if (game.ending) return [];
  const extra = [];
  if (game.week === 1) extra.push({id:'academy-info',week:1,title:'해냄 숙제를 매달 완료해야 합니다',text:'해냄 숙제는 매달 자동 추가됩니다. 마감 전에 완료하면 수학과 평판이 올라갑니다.'});
  if (game.week > 0 && ((game.study === 'friends' && game.week % 4 === 0) || (game.study === 'play' && game.week % 2 === 0))) extra.push({id:`party-${game.week}`,week:game.week,title:'스터디 회식',text:'잠깐 모여서 이야기할까? 수학 능력에는 영향이 없어요.',choices:[{label:'회식 참여',effects:{stress:-12}},{label:'이번에는 쉬기',effects:{}}]});
  return [...EVENTS,...extra].filter(e => (e.choices || e.kind === 'interview' ? e.week <= game.week : e.week === game.week) && (e.id !== 'jeju' || isTrip(game)) && !game.seen.includes(e.id));
}
export const requiredNotices = g => notices(g).filter(e => e.choices || e.kind === 'interview');
export function chooseEvent(source, id, index = 0) {
  const event = notices(source).find(e => e.id === id);
  if (!event || event.kind === 'interview') return source;
  const g = copy(source);
  const option = event.choices?.[index];
  if (event.choices && !option) return source;
  if ((option?.cost || 0) > g.money || (id === 'study' && g.failedStudies.includes(option.kind))) return source;
  let message = `${event.title} 확인`;
  if (event.task) quest(g,event.task);
  if (option) {
    g.money -= option.cost || 0;
    apply(g,option.effects);
    const kind = option.kind;
    if (id === 'study') {
      if (kind === 'serious' && random(g) > Math.min(.95,.55 + g.stats.reputation / 250)) {
        g.failedStudies.push(kind);
        g.feedback = '열공팀 정원이 찼어요. 다른 스터디에 지원해 보세요.';
        return g;
      }
      g.study = kind;
      if (kind === 'serious') quest(g,{id:`study-${g.week}`,name:'아침스터디 문제 풀이',target:1,due:g.week,reward:{math:4},penalty:{stress:6},fine:2000});
    }
    if (kind === 'counsel') { g.csatUnlocked = true; g.teacher += 2; message = '상담 완료! 수능 공부와 수능 전형이 해금되었습니다.'; }
    if (['managed','cafe','home'].includes(kind)) g.setting = kind;
    if (kind === 'lecture' || kind === 'contest') g.lockedSlots += 2;
    if (kind === 'photo' && g.inventory.includes('outfit')) apply(g,{reputation:8});
    if (kind === 'recommend') { g.recommendation = Math.round(g.stats.reputation / 20) + g.teacher; message = `전공 선생님의 추천서 보너스 +${g.recommendation}`; }
    if (kind === 'room') { const good = random(g) > .5; apply(g,{stress:good ? -8 : 12}); message = good ? '조용한 호실 당첨! 스트레스 −8' : '떠들썩한 호실 당첨… 스트레스 +12'; }
    if (kind === 'contest') { const win = random(g) < g.stats.science / 120; if (win) g.awards++; message = win ? '외부대회 수상! 서울대 외 수시 전형에 보너스.' : '아쉽게도 수상은 놓쳤지만 탐구 경험은 남았다.'; apply(g,{science:3}); }
    if (kind === 'rival') { apply(g,{stress:g.stats.reputation >= 60 ? -5 : 10}); message = g.stats.reputation >= 60 ? '정확한 지원 정보를 확인했다. 소문에 흔들리지 말자.' : '소문만 더 늘었다… 평판 60 이상이면 정확한 정보가 보인다.'; }
    if (kind === 'creative') { g.creative = gpa(g) >= 4.3 || random(g) < (gpa(g) / 4.3) ** 3; apply(g,{stress:g.creative ? -10 : 12}); message = g.creative ? '창의도전 합격! 수시 평가 보너스 +5' : '창의도전 불합격. 남은 면접을 준비하자.'; }
    if (kind === 'birthday') { apply(g,{stress:g.stats.reputation >= 55 ? -20 : -6}); message = g.stats.reputation >= 55 ? '친구들이 깜짝 생일 파티를 열어줬다!' : '친구와 작은 케이크를 나눠 먹었다.'; }
  }
  g.seen.push(id);
  g.feedback = message;
  return g;
}
export function answerInterview(source, answer) {
  if (!notices(source).some(e => e.id === 'interview') || !Number.isInteger(answer) || answer < 0 || answer > 2) return source;
  const g = copy(source);
  g.interviewAnswers.push(answer);
  if (g.interviewAnswers.length === INTERVIEW.length) {
    g.interviewScore = g.interviewAnswers.filter((v,i) => v === INTERVIEW[i].answer).length * 10;
    g.seen.push('interview');
    g.feedback = `면접 완료! ${g.interviewScore / 10} / 3문항 정답 · 전형 보너스 +${g.interviewScore / 3}`;
  }
  return g;
}
export function buyItem(source,id) {
  const item = SHOP.find(i => i.id === id);
  if (!item || source.ending || source.money < item.price || source.purchases.includes(id) || (id === 'outfit' && source.inventory.includes(id))) return source;
  const g = copy(source);
  g.money -= item.price;
  g.purchases.push(id);
  if (id === 'outfit') g.inventory.push(id);
  apply(g,item.effects);
  g.feedback = `${item.name} 구매${id === 'outfit' ? ' · 의상 장착 완료' : ' · 바로 사용했어요'}`;
  return g;
}
export function submitApplication(source,university,department) {
  if (source.week < 25 || source.week > 28 || !UNIVERSITIES[university] || !['자연과학','공학','융합'].includes(department) || (university === 'csat' && !source.csatUnlocked)) return source;
  const g = copy(source);
  g.application = {university,department};
  g.feedback = `${UNIVERSITIES[university].name} ${department} 원서 접수 완료 (9월 안에는 변경 가능)`;
  return g;
}
export function courseScore(g,c) {
  const grades = g.grades[c.id];
  const avg = values => values.length ? values.reduce((a,b) => a+b,0) / values.length : 0;
  return Object.entries(c.weights).reduce((total,[type,weight]) => total + weight * (Array.isArray(grades[type]) ? avg(grades[type]) : grades[type] ?? 0),0);
}
export function gpa(g) {
  const selected = enrolled(g);
  const grade = score => score >= 95 ? 4.3 : score >= 90 ? 4 : score >= 85 ? 3.7 : score >= 80 ? 3.3 : score >= 75 ? 3 : score >= 70 ? 2.7 : score >= 60 ? 2 : 1;
  return selected.reduce((sum,c) => sum + grade(courseScore(g,c)) * c.credits,0) / selected.reduce((sum,c) => sum + c.credits,0);
}
function examine(g,type,notes) {
  for (const c of enrolled(g)) {
    const ability = g.mastery[c.id] * .65 + g.stats[c.ability] * .35;
    const score = Math.round(clamp(40 + ability * .6 + (random(g) - .5) * 10));
    if (type === 'quiz') g.grades[c.id].quiz.push(score); else g.grades[c.id][type] = score;
    notes.push(`${c.name} ${type === 'quiz' ? '퀴즈' : type === 'midterm' ? '중간고사' : '기말고사'} ${score}점`);
  }
}
export function activityOptions(g) {
  return [
    ...Object.entries(ACTIONS).filter(([id]) => id !== 'csat' || g.csatUnlocked).map(([id,a]) => ({id,name:a.name,hint:a.hint})),
    ...enrolled(g).map(c => ({id:`course:${c.id}`,name:`내신 · ${c.name}`,hint:'과목 숙련도 +7 · 관련 능력 +1 · 건강 −2 · 스트레스 +3'})),
    ...g.quests.filter(q => q.status === 'active').map(q => ({id:`quest:${q.id}`,name:`할 일 · ${q.name}`,hint:`진척도 ${q.progress}/${q.target} · ${term(q.due).label} 마감`})),
  ];
}
export function resolveCampaign(source) {
  if (source.ending || requiredNotices(source).length || source.plan.length !== 28) return source;
  const g = copy(source);
  const before = {...g.stats};
  const notes = [];
  let rested = 0, cleaned = false;
  const summer = term(g.week).name === '여름방학';
  const tired = g.fatigue;
  const allowed = new Set(activityOptions(source).map(a => a.id));
  if (source.plan.some((id,i) => !allowed.has(id) || !validSlot(id,i))) return source;
  for (const [slot,id] of g.plan.entries()) {
    const period = slot % 4;
    const day = Math.floor(slot / 4);
    if (slotLocked(g,slot)) { if (period === 3) g.overnightStudy = false; notes.push(`${['월','화','수','목','금','토','일'][day]} ${PERIODS[period]}: ${isTrip(g) && day >= 4 ? '제주도 자연 탐사' : '행사 참여'}`); continue; }
    if (period === 0) {
      const overslept = g.overnightStudy && random(g) < .5;
      g.overnightStudy = false;
      if (overslept && id !== 'skip') {
        notes.push(`${['월','화','수','목','금','토','일'][day]}요일 연장자습 후 늦잠 · 아침자습 실패`);
        apply(g,{stress:4,reputation:-1});
        if (g.study === 'serious') g.money = Math.max(0,g.money - 2000);
        continue;
      }
    }
    if (period === 3) g.overnightStudy = isLearning(id);
    if (id === 'skip' || id === 'sleep') continue;
    if (id === 'work' && day < 5) { notes.push('알바는 토·일에만 가능해 휴식으로 대체'); apply(g,ACTIONS.rest.effects); rested++; continue; }
    const learning = isLearning(id);
    let efficiency = (1 + (g.stats.focus - 50) / 250) * (tired ? .65 : 1);
    if (g.stats.hp < 25 || g.stats.stress >= 80) efficiency *= .7;
    const venueCost = summer && learning ? (g.setting === 'managed' ? 1500 : g.setting === 'cafe' ? 700 : 0) : 0;
    const actionCost = ACTIONS[id]?.cost || 0;
    if (g.money < venueCost + actionCost) {
      notes.push(`${slot + 1}번째 자습: 비용 부족 → 무료 휴식`);
      apply(g,ACTIONS.rest.effects); rested++; continue;
    }
    g.money -= venueCost + actionCost;
    if (summer && learning) { efficiency *= g.setting === 'managed' ? 1.4 : g.setting === 'cafe' ? 1.2 : .9; if (g.setting === 'managed') apply(g,{stress:1}); }
    if (id.startsWith('course:')) {
      const c = enrolled(g).find(c => c.id === id.slice(7));
      g.mastery[c.id] = clamp(g.mastery[c.id] + 7 * efficiency);
      apply(g,{[c.ability]:1,stress:3,hp:-2},efficiency);
    } else if (id.startsWith('quest:')) {
      const q = g.quests.find(q => q.id === id.slice(6));
      if (!q || q.status !== 'active') { apply(g,ACTIONS.rest.effects); rested++; continue; }
      q.progress = Math.min(q.target,q.progress + (q.id === 'essay' && g.stats.reputation >= 60 ? 2 : 1));
      apply(g,{hp:-2,stress:2});
      if (q.progress >= q.target) {
        q.status = 'complete'; q.completedWeek = g.week; apply(g,q.reward); notes.push(`완료: ${q.name}`); g.teacher++;
        if (q.course) { g.mastery[q.course] = clamp(g.mastery[q.course] + 5); g.grades[q.course].assignment.push(Math.round(clamp(70 + g.mastery[q.course] * .3))); }
        if (q.id.startsWith('clean-')) cleaned = true;
      }
    } else {
      const a = ACTIONS[id];
      apply(g,a.effects,efficiency); g.money += a.income || 0;
      if (id === 'rest') rested++;
      if (id === 'clean') { cleaned = true; const q = g.quests.find(q => q.id === `clean-${g.week}`); if (q) {q.progress = q.target;q.status = 'complete';q.completedWeek = g.week;} }
    }
  }
  for (const q of g.quests.filter(q => q.status === 'active' && q.due <= g.week)) {
    q.status = 'expired'; apply(g,{reputation:-4,stress:5,...q.penalty});
    if (q.fine) g.money = Math.max(0,g.money - q.fine);
    if (q.course) {g.grades[q.course].assignment.push(0);g.mastery[q.course] = clamp(g.mastery[q.course] - 3);}
    notes.push(`기한 초과: ${q.name}${q.fine ? ' · 벌금 2,000원' : ''}`);
  }
  if (g.study === 'serious' && rested < 2) { g.money = Math.max(0,g.money - 2000); apply(g,{stress:5}); notes.push('수면 부족으로 아침스터디 지각 · 벌금 2,000원'); }
  if (g.week >= 1 && !summer && !cleaned) { g.penalties += 2; notes.push('방 청소 미완료 · 호실 점검 벌점 +2'); }
  else if (g.week > 0 && !summer && random(g) < .15) { g.penalties++; apply(g,{reputation:-1}); notes.push('냉장고 호실 점검에 걸렸다… 벌점 +1'); }
  if ([4,12].includes(g.week)) examine(g,'quiz',notes);
  if (g.week === 8) examine(g,'midterm',notes);
  if (g.week === 16) examine(g,'final',notes);
  if (g.week === 36 && g.csatUnlocked) notes.push(`수능 시험: ${Math.round(g.stats.csat)}점 · 모의면접 보너스 미반영`);
  apply(g,{stress:4});
  notes.push('주간 기본 스트레스 +4');
  if (isTrip(g)) {apply(g,{hp:-25,stress:-15,science:4}); notes.push('제주도 자연 탐사 · 건강 −25 · 스트레스 −15');}
  g.fatigue = g.stats.hp < 25 || g.stats.stress >= 80;
  if (tired) notes.push('이번 주 만성피로: 학습 효율 35% 감소');
  if (g.fatigue) notes.push('다음 주 만성피로 주의! 휴식과 운동을 배정하세요.');
  g.money += 10000 + (summer && g.setting === 'home' ? 3000 : 0);
  for (const key of Object.keys(g.stats)) g.stats[key] = Math.round(g.stats[key]);
  g.lastResult = {week:g.week,delta:Object.fromEntries(Object.keys(g.stats).map(k => [k,g.stats[k] - before[k]])),notes};
  g.history.push(g.lastResult);
  if (g.week === END_WEEK) { g.ending = evaluateEnding(g); return g; }
  g.week++;
  g.plan = g.plan.map((id,i) => id.startsWith('quest:') ? (i % 4 === 0 ? 'skip' : i % 4 === 3 ? 'sleep' : 'rest') : id);
  return beginWeek(g);
}
export function admissionScore(g,university) {
  const s = g.stats;
  if (university === 'csat') return s.csat;
  const academic = gpa(g) / 4.3 * 80 + g.previousGpa / 4.3 * 20;
  const essay = g.quests.some(q => q.id === 'essay' && q.status === 'complete') ? 5 : 0;
  const base = university === 'snu' ? academic * .5 + (s.math + s.science) * .15 + s.speech * .2
    : university === 'kaist' ? academic * .35 + s.science * .35 + s.math * .1 + s.speech * .2
    : university === 'korea' ? academic * .5 + s.writing * .3 + s.speech * .2
    : academic * .45 + s.science * .35 + s.speech * .2;
  return Math.round(base + essay + g.interviewScore / 3 + g.recommendation + (g.creative ? 5 : 0) + (university === 'snu' ? 0 : g.awards * 4));
}
export function evaluateEnding(g) {
  if (g.application) {
    const u = UNIVERSITIES[g.application.university];
    const score = admissionScore(g,g.application.university);
    const threshold = u.threshold + (g.application.department === '공학' ? 3 : g.application.department === '융합' ? -2 : 0);
    if (score >= threshold) return {title:`${u.name} 합격!`,description:`${g.application.department}에서 새로운 이야기가 시작됩니다.`,score,threshold};
    return {title:'한 번 더, 시대인재',description:'이번 결과는 아쉽지만 쌓아온 시간은 사라지지 않습니다. 재수라는 다음 도전을 선택했습니다.',score,threshold};
  }
  if (g.money >= 200000) return {title:'작은 창업가',description:'아껴 모은 자금으로 친구들과 작은 프로젝트를 시작했습니다.'};
  return {title:'나만의 속도로',description:'원서 대신 일과 탐색을 선택했습니다. 알바를 하며 다음 목표를 찾아갑니다.'};
}
export function validCampaign(g) {
  try { return validateCampaignData(g); } catch { return false; }
}
function validateCampaignData(g) {
  if (!g || g.version !== 2 || !MAJORS[g.major] || !TRAITS[g.trait] || !['normal','easy'].includes(g.difficulty)) return false;
  if (typeof g.overnightStudy !== 'boolean' || !Number.isFinite(g.volume) || g.volume < 0 || g.volume > 1) return false;
  if (typeof g.name !== 'string' || !g.name.trim() || g.name.length > 12 || !['boy','girl'].includes(g.character)) return false;
  if (!Number.isInteger(g.week) || g.week < 0 || g.week > END_WEEK || !Number.isInteger(g.seed) || g.seed < 0 || g.seed > 4294967295) return false;
  if (!Number.isFinite(g.money) || g.money < 0 || !Object.keys(LABELS).every(k => Number.isFinite(g.stats?.[k]) && g.stats[k] >= 0 && g.stats[k] <= 100)) return false;
  if (!['night','fatigue','csatUnlocked','creative'].every(k => typeof g[k] === 'boolean') || !['penalties','teacher','lockedSlots','awards','recommendation','interviewScore','previousGpa'].every(k => Number.isFinite(g[k]) && g[k] >= 0)) return false;
  if (![null,'friends','serious','play','solo'].includes(g.study) || !['managed','cafe','home'].includes(g.setting)) return false;
  if (!['seen','failedStudies','inventory','purchases'].every(k => Array.isArray(g[k]) && g[k].every(v => typeof v === 'string'))) return false;
  if (!Array.isArray(g.interviewAnswers) || g.interviewAnswers.length > 3 || !g.interviewAnswers.every(v => Number.isInteger(v) && v >= 0 && v <= 2)) return false;
  if (!Array.isArray(g.quests) || !g.quests.every(q => typeof q.id === 'string' && typeof q.name === 'string' && ['active','complete','expired'].includes(q.status) && Number.isFinite(q.progress) && q.progress >= 0 && q.progress <= q.target && Number.isFinite(q.target) && q.target > 0 && Number.isInteger(q.due) && q.due >= 0 && q.due <= END_WEEK && (!q.course || enrolled(g).some(c => c.id === q.course)))) return false;
  if (!enrolled(g).every(c => Number.isFinite(g.mastery?.[c.id]) && g.mastery[c.id] >= 0 && g.mastery[c.id] <= 100 && ['quiz','assignment'].every(k => Array.isArray(g.grades?.[c.id]?.[k]) && g.grades[c.id][k].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) && ['midterm','final'].every(k => g.grades[c.id][k] === null || (Number.isFinite(g.grades[c.id][k]) && g.grades[c.id][k] >= 0 && g.grades[c.id][k] <= 100)))) return false;
  if (!Array.isArray(g.history) || g.history.length > 38 || !g.history.every(r => Number.isInteger(r.week) && Array.isArray(r.notes) && r.notes.every(n => typeof n === 'string') && Object.keys(LABELS).every(k => Number.isFinite(r.delta?.[k])))) return false;
  if (g.application && (!UNIVERSITIES[g.application.university] || !['자연과학','공학','융합'].includes(g.application.department))) return false;
  if (g.feedback !== undefined && typeof g.feedback !== 'string') return false;
  if (g.ending && (g.week !== END_WEEK || typeof g.ending.title !== 'string' || typeof g.ending.description !== 'string')) return false;
  if (g.lastResult && (!Array.isArray(g.lastResult.notes) || !g.lastResult.notes.every(n => typeof n === 'string') || !Object.keys(LABELS).every(k => Number.isFinite(g.lastResult.delta?.[k])))) return false;
  const allowed = new Set(activityOptions(g).map(a => a.id));
  // 완료된 과제는 다음 주에 휴식으로 바꾸며, 엔딩에서는 마지막 계획을 보존한다.
  g.quests.forEach(q => allowed.add(`quest:${q.id}`));
  return Array.isArray(g.plan) && g.plan.length === 28 && g.plan.every((id,i) => allowed.has(id) && validSlot(id,i));
}

