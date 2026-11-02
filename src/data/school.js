import catalog from './courses.json' with { type: 'json' };
import definitions from './events.json' with { type: 'json' };
export const COURSE_DATA = catalog;
export const COURSE_MAP = Object.fromEntries(catalog.courses.map(course => [course.id, course]));
export const SCHOOL_EVENTS = definitions;
export const YEAR_WEEKS = 41;
export const SLOTS = ['morning', 'first', 'second', 'extension'];
export const SLOT_NAMES = { morning: '아침 자습', first: '1자', second: '2자', extension: '연장 자습' };
export const MAJOR_NAMES = { '물리': '수학·물리', '화학': '화학', '생명과학': '생물', '정보과학': '정보' };
export const STUDY_NAMES = {friends:'찐친들 스터디',serious:'열심히 하는 스터디',play:'노는 스터디',none:'참여 안 함'};
export const ENDINGS = {university:'대학 진학',retry:'재수',job:'알바',startup:'창업',prison:'감옥'};
export const ROLES = [
 {id:'balanced',name:'균형형',effect:{}},
 {id:'scholar',name:'탐구형',effect:{math:7,hp:-5}},
 {id:'social',name:'친화형',effect:{reputation:10,math:-3}},
 {id:'active',name:'체력형',effect:{hp:12,math:-4}}
];
export function enrolledCourses(major) {
 return [...(catalog.majors[major] || []), ...catalog.required].map(id => COURSE_MAP[id]);
}
export function calendarAt(week) {
 if (week === 0) return {month:2,week:1,term:'winter',label:'겨울방학 · 튜토리얼'};
 const month = 3 + Math.floor((Math.min(week,40)-1)/4);
 const w = (Math.min(week,40)-1)%4+1;
 return {month,week:w,term:month<=6?'semester_1':month<=8?'summer':'semester_2',
   label:(month===7||month===8?'여름방학 · ':'')+month+'월 '+w+'주'};
}
export const defaultSchedule = () => Array.from({length:7},()=>({morning:'off',first:'math',second:'rest',extension:'sleep'}));
export const STUDY_TASK = {id:'study_work',name:'스터디활동',kind:'task',work:{targetProgress:2,perAction:1},onComplete:{math:4},onExpire:{math:-2,reputation:-2,stress:3}};
export function definitionForTask(task) { return task.definitionId==='study_work' ? STUDY_TASK : definitions.find(e=>e.id===task.definitionId); }
export function eventsForWeek(game) {
 const calendar=calendarAt(game.week), courses=enrolledCourses(game.major).map(c=>c.id);
 if (!game.enrolled || game.ended) return [];
 const events=definitions.filter(event=>{
   if(event.courseId && !courses.includes(event.courseId) || event.major && event.major!==game.major) return false;
   const trigger=event.trigger;
   if(trigger.repeat==='weekly') return game.week>0;
   if(trigger.repeat==='monthly') return calendar.week===1 && trigger.months.includes(calendar.month);
   return trigger.week===game.week;
 });
 if(game.week>0 && (game.school.study==='serious' || game.school.study==='friends' && calendar.week===2)) events.push({...STUDY_TASK,deadline:{duration:0}});
 if(game.week>0 && (game.school.study==='friends' && calendar.week===4 || game.school.study==='play' && calendar.week%2===0))
   events.push({id:'study_dinner',name:'스터디 회식',kind:'choice',choices:[{label:'참여',cost:1500,effects:{stress:-10}},{label:'불참',effects:{}}]});
 if([6,16].includes(game.week)) for(const course of enrolledCourses(game.major)) events.push({id:game.week===6?'mid_'+course.id:'final_'+course.id,name:course.name+' '+(game.week===6?'중간고사':'기말고사'),kind:'exam',courseId:course.id,grade:{assessmentId:game.week===6?'midterm':'final',randomness:5}});
 return events;
}
export function taskDeadline(event,week) {
 if(event.deadline?.monthEnd) return week+4-calendarAt(week).week;
 return event.deadline?.at ?? week+(event.deadline?.duration??0);
}
export const eventKey = (event,week) => event.id+'@'+week;
