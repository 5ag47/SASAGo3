import { useEffect, useState } from 'react';
import { Bell, BookOpen, CalendarDays, Check, ChevronRight, GraduationCap, HelpCircle, Moon, Save, Settings, ShoppingBag, Sun } from 'lucide-react';
import { characterImage, dayRoom, nightRoom } from '../assets.js';
import { LABELS, MAJORS } from '../data/campaign.js';
import { activityOptions, courseStats, isLearning, isTrip, notices, PERIODS, slotLocked, term, validSlot } from '../systems/campaign.js';
import './game-screen.css';

const DAYS = ['월','화','수','목','금','토','일'];
const STUDIES = {friends:'찐친들 스터디',serious:'열공 스터디',play:'노는 스터디',solo:'혼자 공부'};
const modeFor = id => ['skip','sleep'].includes(id) ? id : isLearning(id) ? 'study' : 'rest';
const daySummary = id => id.startsWith('quest:') ? '과제' : id.startsWith('course:') ? '내신' : ({math:'수학',science:'과학',rest:'휴식',play:'게임',exercise:'운동',interview:'면접',csat:'수능',academy:'학원',clean:'청소',work:'알바'}[id] || '계획');
function Meter({label,value}) {
  return <div className="g-meter"><span>{label}</span><progress aria-label={label} value={value} max="100"/><b>{Math.round(value)}</b></div>;
}

export default function GameScreen({game,setGame,saved,onSave,onOpen,onPlay,playLabel}) {
  const [day,setDay] = useState(0);
  const [period,setPeriod] = useState(1);
  const [draft,setDraft] = useState(game.plan[1]);
  const [message,setMessage] = useState('요일을 선택해 하루의 일정을 정해주세요.');
  const options = activityOptions(game);
  const slot = day * 4 + period;
  useEffect(() => {setDraft(game.plan[slot]);},[game.plan,slot]);
  useEffect(() => {setDay(0);setPeriod(1);},[game.week]);
  const currentMode = modeFor(draft);
  const locked = slotLocked(game,slot);
  const choices = options.filter(a => {
    if (!validSlot(a.id,slot)) return false;
    if (currentMode === 'study') return isLearning(a.id);
    if (currentMode === 'rest') return ['rest','play','exercise',...(day >= 5 ? ['work'] : [])].includes(a.id);
    return a.id === currentMode;
  });
  const pending = notices(game);
  const tasks = game.quests.filter(q => q.status === 'active' || q.due === game.week || q.completedWeek === game.week - 1);
  const time = term(game.week);
  function selectMode(mode) {
    setDraft(mode === 'study' ? 'math' : mode === 'rest' ? 'rest' : mode);
  }
  function applyDraft() {
    setGame(g => ({...g,plan:g.plan.map((id,i) => i === slot ? draft : id)}));
    setMessage(`${DAYS[day]}요일 ${PERIODS[period]} 신청 완료`);
  }
  return <main className={`g-screen ${game.night ? 'night' : ''}`} style={{'--room-image':`url("${game.night ? nightRoom : dayRoom}")`}}>
    <header className="g-toolbar"><div className="g-date"><CalendarDays size={18}/><strong>{time.label}</strong><small>{game.week + 1} / 38주</small></div><div className="g-tools"><span role="status">{saved}</span><button aria-label="플레이 가이드" title="플레이 가이드" onClick={() => onOpen('guide')}><HelpCircle size={18}/></button><button aria-label="낮 밤 전환" onClick={() => setGame(g => ({...g,night:!g.night}))}>{game.night ? <Moon size={18}/> : <Sun size={18}/>}</button><button aria-label="저장" title="저장" onClick={onSave}><Save size={18}/></button><button aria-label="설정" title="설정" onClick={() => onOpen('settings')}><Settings size={18}/></button></div></header>
    <div className="g-scene">
      <aside className="g-left">
        <section className="g-paper"><div className="g-tape"/><header><h2>이번 주 할 일</h2><small>{tasks.filter(q => q.status === 'complete').length}/{tasks.length}</small></header><p>일정에 배정하면 자동으로 완료돼요.</p><div className="g-task-list" aria-label="할 일 목록">{tasks.length ? tasks.map(q => <article key={q.id} className={`g-task ${q.status}`}><span aria-label={q.status === 'complete' ? '완료' : q.status === 'expired' ? '기한 초과' : '진행 중'}>{q.status === 'complete' ? '☑' : q.status === 'expired' ? '⊠' : '☐'}</span><div><b>{q.name}</b><small>{q.status === 'complete' ? '완료!' : q.status === 'expired' ? '기한 초과' : `${q.due === game.week ? '이번 주 마감' : `${term(q.due).month}월 ${term(q.due).part}주 마감`} · ${q.progress}/${q.target}`}</small><progress aria-label={`${q.name} 진행도`} max={q.target} value={q.progress}/></div></article>) : <p className="g-empty">아직 할 일이 없어요.<br/>이번 주는 고3 생활에 적응해볼까요?</p>}</div></section>
        <section className="g-stats"><header><h2>나의 능력치</h2><button aria-label="능력치와 성적표" onClick={() => onOpen('grades')}>더보기 ›</button></header><div className="g-stat-list">{['hp','focus','reputation','stress','math'].map(k => <Meter key={k} label={LABELS[k]} value={game.stats[k]}/>)}<div className="g-stat-divider">전공 · 내신</div>{courseStats(game).map(c => <Meter key={c.id} label={c.name} value={game.mastery[c.id]}/>)}{game.csatUnlocked && <Meter label="수능" value={game.stats.csat}/>}</div><p>{game.fatigue ? '만성피로 · 학습 효율 −35%' : '집중력 = 건강 − 스트레스'}<span>벌점 {game.penalties}</span></p></section>
      </aside>
      <section className="g-character" aria-label="나의 캐릭터"><div className="g-speech">{game.ending ? '우리, 정말 여기까지 왔네.' : game.fatigue ? '오늘은 조금 쉬어도 괜찮겠지?' : game.week === 0 ? '고3이라니… 계획부터 세워볼까?' : '오늘도 내 속도로, 하나씩 해보자.'}</div><img src={characterImage(game.character)} alt={`${game.name} 캐릭터`} className={game.inventory.includes('outfit') ? 'dressed' : ''}/><div className="g-name">{game.name}<small>{MAJORS[game.major]} 전공</small></div>{isTrip(game) && <div className="g-trip"><img src="/jeju.svg" alt="한라산과 바다, 한라봉이 있는 제주도 탐사 일러스트"/><span>금·토·일 제주도 자연 탐사</span></div>}</section>
      <aside className="g-right"><section className="g-planner"><header><h2>나의 일주일</h2><button aria-label="학사 일정" title="학사 일정" onClick={() => onOpen('calendar')}><CalendarDays size={18}/></button></header><div className="g-days" role="group" aria-label="요일 선택">{DAYS.map((label,i) => <button key={label} disabled={isTrip(game) && i >= 4} aria-label={`${label}요일${isTrip(game) && i >= 4 ? ' 제주도 탐사' : ''}`} aria-pressed={day === i} onClick={() => setDay(i)}><span>{isTrip(game) && i >= 4 ? '🍊' : label}</span><small>{isTrip(game) && i >= 4 ? '탐사' : daySummary(game.plan[i * 4 + 1])}</small></button>)}</div><div className="g-application-title"><BookOpen size={15}/><h3>자율학습 신청</h3><b>{DAYS[day]}요일</b></div><div className="g-editor"><div className="g-periods" role="group" aria-label="자습 시간">{PERIODS.map((label,i) => <button key={label} aria-pressed={period === i} onClick={() => setPeriod(i)}>{label}</button>)}</div><fieldset disabled={locked || !!game.ending}><legend>{period === 0 ? '아침자습 참여' : '활동 구분'}</legend><div className="g-modes">{(period === 0 ? [['study','참여'],['skip','불참여']] : period === 3 ? [['study','학습'],['sleep','잠']] : [['study','학습'],['rest','요양']]).map(([id,label]) => <button key={id} aria-pressed={currentMode === id} onClick={() => selectMode(id)}>{label}</button>)}</div>{!['skip','sleep'].includes(currentMode) && <label className="g-activity-label">{currentMode === 'study' ? '학습 · 할 일 선택' : '요양 활동 선택'}<select aria-label={`${DAYS[day]}요일 ${PERIODS[period]} 활동`} value={draft} onChange={e => setDraft(e.target.value)}>{choices.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}<p className="g-hint">{locked ? '학교 행사에 사용하는 시간입니다.' : options.find(a => a.id === draft)?.hint}</p></fieldset><p className="g-sleep-note">{period === 3 ? '연장 학습 시 다음 날 50% 확률로 늦잠!' : period === 0 ? '아침은 공부만 가능해요. 연장 학습 다음 날은 늦잠 주의!' : '할 일은 학습에서, 잠·게임·운동은 요양에서 선택해요.'}</p><p role="status" className="g-editor-status">{message}</p></div><button className="primary g-apply" disabled={locked || !!game.ending} onClick={applyDraft}>{draft === game.plan[slot] ? '신청하기' : '변경한 일정 신청하기'}<Check size={16}/></button><footer><span>{STUDIES[game.study] || '스터디 모집 중'}</span><button onClick={() => onOpen('confirm')}>주간 계획 보기 ›</button></footer></section><button className="g-notice" disabled={!pending.length} onClick={() => onOpen('notice')}><Bell size={20}/><span><small>알림장 {pending.length > 0 && <b>!</b>}</small>{pending.length ? pending[0].title : '이번 주 새 알림이 없어요'}</span><ChevronRight size={17}/></button></aside>
    </div>
    <footer className="g-bottom"><nav><button onClick={() => onOpen('grades')}><BookOpen size={22}/><span>성적표</span></button><button onClick={() => onOpen('shop')}><ShoppingBag size={22}/><span>매점</span></button><button onClick={() => onOpen('admission')}><GraduationCap size={22}/><span>진학실</span></button><button onClick={() => onOpen('records')}><CalendarDays size={22}/><span>기록</span></button></nav><div className="g-feedback" role="status">{game.feedback || 'SASAGo3! · 나의 마지막 학교생활'}</div><div className="g-money"><small>나의 용돈</small><b>{game.money.toLocaleString()}원</b></div><button className="primary g-play" onClick={onPlay}>{playLabel}<ChevronRight size={18}/></button></footer>
  </main>;
}
