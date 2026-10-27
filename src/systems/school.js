import { COURSE_MAP, enrolledCourses, defaultSchedule, SLOTS, eventsForWeek, definitionForTask, taskDeadline, eventKey, calendarAt, YEAR_WEEKS, ROLES } from '../data/school.js';
import { DAYS } from '../data/activities.js';
const clamp = value => Math.max(0,Math.min(100,value));
const round = value => Math.round(value*10)/10;
const copy = game => structuredClone(game);
export function createSchoolState(game={}) {
 const abilities=Object.fromEntries(enrolledCourses(game.major||'물리').filter(c=>c.ability).map(c=>[c.id,c.id==='math_seminar'?(game.stats?.math??52):(game.stats?.science??38)]));
 const schedule=defaultSchedule();
 if(game.plan) game.plan.forEach((activity,i)=>{if(i<7) schedule[i].first=activity==='science'?'course:'+Object.keys(abilities).find(id=>id!=='math_seminar'):['math','rest','game','exercise'].includes(activity)?activity:'math';});
 return {schema:1,role:'balanced',schedule,abilities,tasks:[],choices:{},failedStudy:[],study:null,
   grades:[],fatigueWeeks:0,lateNight:false,seed:123456789,preparedWeek:-1,
   reserved:0,ledger:[],studyPlace:'home',summer:'self',interview:0,awards:0,
   teacher:null,affinity:{math:0,major:0,homeroom:0},offers:[],violations:0,ending:null,
   volume:.4,startStats:null,startMoney:game.money??15000};
}
export function syncStats(game) {
 game.stats.focus=round(clamp(game.stats.hp-game.stats.stress));
 const values=Object.values(game.school.abilities);
 if(values.length) game.stats.science=round(values.reduce((a,b)=>a+b,0)/values.length);
}
export function snapshotStats(game) {
 return {...game.stats,...game.school.abilities};
}
function applyEffects(game,effects={}) {
 for(const [key,amount] of Object.entries(effects)){
  if(key==='focus') continue;
  if(Object.hasOwn(game.school.abilities,key)) game.school.abilities[key]=round(clamp(game.school.abilities[key]+amount));
  else if(Object.hasOwn(game.stats,key)) {
   game.stats[key]=round(clamp(game.stats[key]+amount));
   if(key==='science') for(const id of Object.keys(game.school.abilities)) if(id!=='math_seminar')game.school.abilities[id]=round(clamp(game.school.abilities[id]+amount));
  }
 }
 syncStats(game);
}
function random(game) {
 game.school.seed=(Math.imul(1664525,game.school.seed)+1013904223)>>>0;
 return game.school.seed/4294967296;
}
function spend(game,amount) { const paid=Math.min(game.money,amount); game.money-=paid;return paid; }
export function prepareSchoolWeek(input) {
 const game=copy(input);
 if(!game.school)game.school=createSchoolState(game);
 syncStats(game);
 const school=game.school;
 if(school.preparedWeek!==game.week){
   school.preparedWeek=game.week;school.reserved=0;school.ledger=[];
   school.startStats=snapshotStats(game);school.startMoney=game.money;
 }
 for(const event of eventsForWeek(game).filter(e=>e.kind==='task')){
  const id=eventKey(event,game.week);
  if(school.tasks.some(t=>t.id===id))continue;
  let target=event.work.targetProgress;
  if(event.requires&&!school.tasks.some(t=>t.definitionId===event.requires&&t.status==='complete')) target+=3;
  school.tasks.push({id,definitionId:event.id,name:event.name,courseId:event.courseId??null,
    progress:0,target,issued:game.week,deadline:taskDeadline(event,game.week),status:'active',resolvedWeek:null});
 }
 // Completed/expired assignments must not keep consuming the following week's schedule.
 for(const day of school.schedule)for(const slot of SLOTS)if(day[slot].startsWith('task:')&&!school.tasks.some(t=>t.id===day[slot].slice(5)&&t.status==='active'))day[slot]=slot==='morning'?'off':slot==='extension'?'sleep':'rest';
 return game;
}
export function initializeSchool(game) {
 if(game.school)return prepareSchoolWeek(game);
 const next={...game,school:createSchoolState(game),ended:game.week>=YEAR_WEEKS};
 return prepareSchoolWeek(next);
}
export function applyRole(game,roleId){
 if(game.created)return game;
 const role=ROLES.find(r=>r.id===roleId);if(!role)return game;
 const next=copy(game);next.school.role=role.id;applyEffects(next,role.effect);next.school.startStats=snapshotStats(next);return next;
}
export function enrollSchool(game,major){
 if(game.enrolled||game.ended||!Object.hasOwn(COURSE_MAP,'math_seminar'))return game;
 const courses=enrolledCourses(major);if(courses.length<=4)return game;
 const next=copy(game);next.major=major;next.enrolled=true;
 next.school.abilities=Object.fromEntries(courses.filter(c=>c.ability).map(c=>[c.id,c.id==='math_seminar'?game.stats.math:game.stats.science]));
 next.school.schedule=defaultSchedule();
 return prepareSchoolWeek(next);
}
export function lockedDays(game){ return [...new Set(eventsForWeek(game).flatMap(e=>e.lockedDays||[]))]; }
export function activeTasks(game){return game.school.tasks.filter(t=>t.status==='active');}
export function visibleTasks(game){return game.school.tasks.filter(t=>t.status==='active'||t.resolvedWeek===game.week);}
export function actionLabel(action,game){
 const labels={off:'불참',sleep:'잠자기',rest:'잠',game:'게임',exercise:'운동',math:'수학 심층'};
 if(labels[action])return labels[action];
 if(action.startsWith('course:'))return COURSE_MAP[action.slice(7)]?.name||'과목';
 if(action.startsWith('task:'))return game.school.tasks.find(t=>t.id===action.slice(5))?.name||'완료된 과제';
 return '휴식';
}
export function validAction(action,slot,game) {
 if(slot==='morning'&&action==='off'||slot==='extension'&&action==='sleep')return true;
 if(['first','second'].includes(slot)&&['rest','game','exercise'].includes(action))return true;
 if(action==='math')return true;
 if(action.startsWith('course:'))return enrolledCourses(game.major).some(c=>c.id===action.slice(7)&&c.ability);
 return slot!=='morning'&&action.startsWith('task:')&&activeTasks(game).some(t=>t.id===action.slice(5));
}
export function updateSchedule(game,day,slot,action){
 if(game.ended||!game.enrolled||!Number.isInteger(day)||day<0||day>6||!SLOTS.includes(slot)||lockedDays(game).includes(day)||!validAction(action,slot,game))return game;
 const next=copy(game);next.school.schedule[day][slot]=action;return next;
}
export function pendingChoices(game){return eventsForWeek(game).filter(e=>e.kind==='choice'&&!Object.hasOwn(game.school.choices,eventKey(e,game.week)));}
export function choiceUnavailable(game,event,index){
 const option=event.choices[index];
 if(!option)return true;
 return (option.cost||0)>game.money || (event.id==='study'&&game.school.failedStudy.includes(index)) || (option.requiresOffer&&!game.school.offers.some(o=>o.accepted));
}
export function chooseSchoolEvent(input,id,index){
 const event=pendingChoices(input).find(e=>e.id===id);
 if(!event||choiceUnavailable(input,event,index))return input;
 const game=copy(input),s=game.school,option=event.choices[index],key=eventKey(event,game.week);
 if(option.study && random(game)>option.chance){
  s.failedStudy.push(index);s.ledger.push(event.name+' · 지원 실패');return game;
 }
 s.choices[key]=index;spend(game,option.cost||0);applyEffects(game,option.effects);
 s.reserved+=option.slots||0;
 if(option.study)s.study=option.study;
 if(option.place)s.studyPlace=option.place;
 if(option.summer)s.summer=option.summer;
 if(option.teacher)s.teacher=option.teacher;
 if(option.interview)s.interview=clamp(s.interview+option.interview);
 if(option.violation)s.violations++;
 if(option.competition && random(game)<(game.stats.math+game.stats.science)/220){s.awards++;s.ledger.push(event.name+' · 수상');}
 if(option.birthday)applyEffects(game,{stress:game.stats.reputation>=60?-8:2});
 if(option.information)s.ledger.push(game.stats.reputation>=60?'지원 정보 공유: 충분':'지원 정보 공유: 제한적');
 if(option.admission){
  const gpa=schoolGpa(game),perfect=gpa>=4.299;
  const chance=option.admission==='creative'?(perfect?1:gpa/4.3*.75):Math.min(.95,(gpa/4.3*.5)+(game.stats.math/100*.2)+(s.interview/100*.2)+(s.awards*.03));
  const accepted=random(game)<chance;
  s.offers.push({id:option.admission,accepted,week:game.week});
  s.ledger.push(event.name+' · '+(accepted?'합격':'불합격'));
  if(!accepted)applyEffects(game,{stress:8});
 }
 if(option.ending)s.ending=option.ending;
 s.ledger.push(event.name+' · '+option.label);
 return prepareSchoolWeek(game);
}
export function schoolGpa(game) {
 const rows=gradeRows(game);
 if(!rows.length)return 0;
 return Math.round(rows.reduce((sum,row)=>sum+row.gpa*row.credits,0)/rows.reduce((sum,row)=>sum+row.credits,0)*100)/100;
}
function scoreToGpa(score){return score>=95?4.3:score>=90?4:score>=85?3.7:score>=80?3.3:score>=75?3:score>=70?2.7:score>=60?2:0;}
export function gradeRows(game){
 return enrolledCourses(game.major).map(course=>{
   const results=game.school.grades.filter(g=>g.courseId===course.id);
   let total=0,weight=0;
   for(const [kind,w] of Object.entries(course.assessmentWeights)){
    const scores=results.filter(g=>g.kind===kind);
    if(scores.length){total+=scores.reduce((sum,g)=>sum+g.score,0)/scores.length*w;weight+=w;}
   }
   const score=weight?round(total/weight):null;
   return {id:course.id,name:course.name,credits:course.credits,score,gpa:score===null?0:scoreToGpa(score)};
 }).filter(row=>row.score!==null);
}
function study(game,key,factor=1){
 const value=Object.hasOwn(game.school.abilities,key)?game.school.abilities[key]:game.stats[key];
 const efficiency=(.45+game.stats.focus/100)*(game.school.fatigueWeeks?.65:1)*factor;
 const gain=3*efficiency*(1-value/140);
 applyEffects(game,{[key]:gain,hp:-2,stress:key.includes('seminar')?3:2});
}
function addGrade(game,courseId,kind,score,name){
 game.school.grades.push({courseId,kind,score:round(clamp(score)),name,week:game.week});
}
function examScore(game,courseId,roll){
 const ability=game.school.abilities[courseId]??(game.stats.math*.35+game.stats.reputation*.65);
 // Baseline thresholds: ability 50 -> 80, 65 -> 90, 80 -> 100.
 return clamp(ability<50?ability*1.6:80+(ability-50)*2/3)+roll;
}
function completeTask(game,task){
 const definition=definitionForTask(task);
 task.status='complete';task.resolvedWeek=game.week;
 applyEffects(game,definition.onComplete);
 if(task.courseId){
   if(Object.hasOwn(game.school.abilities,task.courseId))study(game,task.courseId,1.5);
   addGrade(game,task.courseId,'task',examScore(game,task.courseId,5),task.name);
   game.school.affinity[task.courseId==='math_seminar'?'math':'major']++;
 } else game.school.affinity.homeroom++;
 game.school.ledger.push(task.name+' · 완료');
}
export function advanceSchoolWeek(input,draw=null) {
 if(input.ended||!input.enrolled||pendingChoices(input).length)return input;
 const game=prepareSchoolWeek(input),s=game.school,roll=()=>draw?draw():random(game);
 const before=s.startStats||snapshotStats(input),moneyBefore=s.startMoney;
 const daily=[],locked=lockedDays(game);
 const calendar=calendarAt(game.week);
 let reserved=s.reserved,workCount=0;
 let fine=0,reward=0,expenses=0;
 let factor=1;
 if(calendar.term==='summer'){
  const price=s.studyPlace==='managed'?4000:s.studyPlace==='cafe'?1500:0;
  if(game.money>=price){expenses+=spend(game,price);factor=s.studyPlace==='managed'?1.5:s.studyPlace==='cafe'?1.1:.8;}
  else{s.ledger.push('잔액 부족 · 집에서 학습');factor=.8;}
  if(s.studyPlace==='home'){game.money+=1000;reward+=1000;}
  if(s.summer==='academy'&&game.money>=2500){expenses+=spend(game,2500);reserved+=4;applyEffects(game,{math:3,stress:4});}
 }
 for(let day=0;day<7;day++){
  const dayBefore=snapshotStats(game),results=[];
  const late=s.lateNight&&roll()<.5;
  s.lateNight=false;
  if(locked.includes(day)){
    results.push('🍊 자연 탐사');applyEffects(game,{hp:-3,stress:-1});
  } else for(const slot of SLOTS){
    const action=s.schedule[day][slot];
    if(slot==='morning'&&late&&action!=='off'){results.push('아침 자습 · 늦잠');applyEffects(game,{reputation:-1,stress:2});continue;}
    if(['first','second'].includes(slot)&&reserved>0){reserved--;results.push('행사 참여');continue;}
    if(action==='off'){results.push('아침 자습 · 불참');continue;}
    if(action==='sleep'){applyEffects(game,{hp:5,stress:-3});results.push('연장 · 잠자기');continue;}
    if(action==='rest')applyEffects(game,{hp:5,stress:-4});
    else if(action==='game')applyEffects(game,{hp:-2,stress:-7});
    else if(action==='exercise')applyEffects(game,{hp:5,stress:1});
    else if(action.startsWith('task:')){
      const task=s.tasks.find(t=>t.id===action.slice(5)&&t.status==='active');
      if(task){
       const def=definitionForTask(task);
       task.progress=Math.min(task.target,task.progress+(def.reputationProgress&&game.stats.reputation>=60?2:1));
       applyEffects(game,{hp:-2,stress:2});workCount++;
       if(task.progress>=task.target)completeTask(game,task);
      } else {applyEffects(game,{hp:3,stress:-2});results.push('완료 과제 시간 · 휴식');continue;}
    }else if(action==='math'){study(game,'math',factor);workCount++;}
    else if(action.startsWith('course:')&&Object.hasOwn(s.abilities,action.slice(7))){study(game,action.slice(7),factor);workCount++;}
    if(slot==='extension')s.lateNight=true;
    results.push(actionLabel(action,game));
  }
  syncStats(game);
  const now=snapshotStats(game);
  daily.push({day:DAYS[day],label:results.join(' / '),summary:'',delta:Object.fromEntries(Object.keys(now).map(k=>[k,round(now[k]-dayBefore[k])]))});
 }
 for(const task of s.tasks.filter(t=>t.status==='active'&&t.deadline<=game.week)){
  task.status='expired';task.resolvedWeek=game.week;const def=definitionForTask(task);
  applyEffects(game,def.onExpire);
  if(task.courseId){applyEffects(game,{[task.courseId]:-3});addGrade(game,task.courseId,'task',0,task.name);}
  if(task.definitionId==='study_work'){fine+=spend(game,500);}
  s.ledger.push(task.name+' · 미완료');
 }
 for(const event of eventsForWeek(game)){
  if(event.kind==='natural'){
   if(event.condition==='dirty'&&s.tasks.some(t=>t.definitionId==='clean'&&t.issued===game.week&&t.status==='complete'))continue;
   applyEffects(game,event.effects);fine+=spend(game,event.cost||0);
   reward+=event.reward||0;game.money+=event.reward||0;s.ledger.push(event.name);
  }
  if(event.kind==='exam'){
   const score=examScore(game,event.courseId,(roll()*2-1)*(event.grade.randomness||0));
   addGrade(game,event.courseId,event.grade.assessmentId,score,event.name);
   s.ledger.push((COURSE_MAP[event.courseId]?.name||'')+' · '+event.name+' '+Math.round(clamp(score))+'점');
  }
 }
 applyEffects(game,{math:-1.5});
 if(workCount>16)applyEffects(game,{hp:-(workCount-16)*.6,stress:(workCount-16)*.8});
 s.fatigueWeeks=s.fatigueWeeks>0?0:(game.stats.stress>=80&&game.stats.hp<=35?1:0);
 if(s.fatigueWeeks)s.ledger.push('만성피로 · 다음 1주 학습량 감소');
 const allowance=2000,bonus=Math.max(0,Math.floor((game.stats.reputation-40)/10))*500;
 game.money+=allowance+bonus;syncStats(game);
 const after=snapshotStats(game);
 const entry={week:game.week,label:calendarAt(game.week).label,plan:[...game.plan],major:game.major,
   before,after,delta:Object.fromEntries(Object.keys(after).map(k=>[k,round(after[k]-(before[k]??after[k]))])),
   daily,notes:[],events:[...s.ledger],courseIds:Object.keys(s.abilities),
   taskResults:s.tasks.filter(t=>t.resolvedWeek===game.week).map(t=>({name:t.name,status:t.status})),
   economy:{allowance,bonus,reward,fine,expenses,net:game.money-moneyBefore},
   assessments:s.grades.filter(g=>g.week===game.week)};
 game.history=[...game.history,entry].slice(-100);
 game.week++;game.ended=game.week>=YEAR_WEEKS;
 return prepareSchoolWeek(game);
}
