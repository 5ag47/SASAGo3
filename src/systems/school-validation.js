import {COURSE_MAP,SLOTS,definitionForTask,enrolledCourses,ROLES} from '../data/school.js';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0,max=100000)=>Number.isInteger(value)&&value>=min&&value<=max;
const score=value=>Number.isFinite(value)&&value>=0&&value<=100;
export function validSchool(game){
 try {
  const s=game.school;
  if(!object(s)||s.schema!==1||!ROLES.some(r=>r.id===s.role)||!object(s.abilities)||!Array.isArray(s.schedule)||s.schedule.length!==7)return false;
  const expected=enrolledCourses(game.major).filter(c=>c.ability).map(c=>c.id);
  if(Object.keys(s.abilities).length!==expected.length||!expected.every(id=>score(s.abilities[id])))return false;
  if(!Array.isArray(s.tasks)||s.tasks.length>1000||new Set(s.tasks.map(t=>t.id)).size!==s.tasks.length)return false;
  for(const t of s.tasks) {
   if(!object(t)||typeof t.id!=='string'||typeof t.name!=='string'||!definitionForTask(t)||!integer(t.target,1,100)||!integer(t.progress,0,t.target)||!integer(t.issued,0,5200)||!integer(t.deadline,t.issued,5200)||!['active','complete','expired'].includes(t.status)||!(t.resolvedWeek===null||integer(t.resolvedWeek,0,5200)))return false;
   if(t.status==='complete'&&t.progress!==t.target)return false;
   if(t.courseId!==null&&!enrolledCourses(game.major).some(c=>c.id===t.courseId))return false;
  }
  for(const day of s.schedule) {
   if(!object(day)||Object.keys(day).length!==4)return false;
   for(const slot of SLOTS){
    const action=day[slot];
    if(typeof action!=='string')return false;
    if(action==='math'||slot==='morning'&&action==='off'||slot==='extension'&&action==='sleep')continue;
    if(['first','second'].includes(slot)&&['rest','game','exercise'].includes(action))continue;
    if(action.startsWith('course:')&&expected.includes(action.slice(7)))continue;
    if(slot!=='morning'&&action.startsWith('task:')&&s.tasks.some(t=>t.id===action.slice(5)))continue;
    return false;
   }
  }
  if(!object(s.choices)||!Object.values(s.choices).every(v=>integer(v,0,10))||!Array.isArray(s.failedStudy)||!s.failedStudy.every(v=>integer(v,0,3)))return false;
  if(![null,'friends','serious','play','none'].includes(s.study)||!integer(s.fatigueWeeks,0,1)||typeof s.lateNight!=='boolean'||!integer(s.seed,0,4294967295)||!integer(s.preparedWeek,-1,5200)||!integer(s.reserved,0,100))return false;
  if(!Array.isArray(s.ledger)||!s.ledger.every(v=>typeof v==='string')||!['home','cafe','managed'].includes(s.studyPlace)||!['self','academy','rest'].includes(s.summer))return false;
  if(!score(s.interview)||!integer(s.awards)||!integer(s.violations)||![null,'math','major','homeroom'].includes(s.teacher)||!object(s.affinity)||!['math','major','homeroom'].every(k=>integer(s.affinity[k])))return false;
  if(![null,'university','retry','job','startup','prison'].includes(s.ending)||!Number.isFinite(s.volume)||s.volume<0||s.volume>1||!Number.isFinite(s.startMoney)||s.startMoney<0)return false;
  if(s.startStats!==null&&(!object(s.startStats)||!Object.values(s.startStats).every(score)))return false;
  if(!Array.isArray(s.offers)||!s.offers.every(o=>object(o)&&typeof o.id==='string'&&typeof o.accepted==='boolean'&&integer(o.week,0,5200)))return false;
  if(!Array.isArray(s.grades)||!s.grades.every(g=>object(g)&&Object.hasOwn(COURSE_MAP,g.courseId)&&['task','quiz','midterm','final'].includes(g.kind)&&score(g.score)&&typeof g.name==='string'&&integer(g.week,0,5200)))return false;
  return true;
 }catch{return false;}
}
