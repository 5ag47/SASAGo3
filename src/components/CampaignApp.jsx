import { useEffect, useState } from 'react';
import { Bell, BookOpen, CalendarDays, ChevronRight, GraduationCap, Moon, Save, ShoppingBag, Sun } from 'lucide-react';
import { characterImage, dayRoom, nightRoom } from '../assets.js';
import { INTERVIEW, LABELS, MAJORS, SHOP, TRAITS, UNIVERSITIES } from '../data/campaign.js';
import { activityOptions, admissionScore, answerInterview, buyItem, chooseEvent, courseScore, defaultPlan, END_WEEK, enrolled, gpa, newCampaign, notices, resolveCampaign, SAVE_KEY, submitApplication, term, validCampaign } from '../systems/campaign.js';
import CharacterChoices from './CharacterChoices.jsx';
import Modal from './Modal.jsx';
import '../campaign.css';

const DAYS = ['월','화','수','목','금','토','일'];
const STUDIES = {friends:'찐친들',serious:'열공팀',play:'노는 팀',solo:'혼자 공부'};
function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {game:null,error:''};
    const game = JSON.parse(raw);
    return validCampaign(game) ? {game,error:''} : {game:null,error:'저장 형식을 읽을 수 없습니다. 기존 데이터는 새 게임을 시작하기 전까지 보존됩니다.'};
  } catch { return {game:null,error:'브라우저 저장소를 읽을 수 없습니다. 저장 기능을 확인해 주세요.'}; }
}
function Meter({value,label}) {
  return <div className="c-meter"><span>{label}</span><progress max="100" value={value} aria-label={label}/><b>{Math.round(value)}</b></div>;
}
function Setup({onCreate,error}) {
  const [name,setName] = useState('');
  const [character,setCharacter] = useState('boy');
  const [major,setMajor] = useState('physics');
  const [trait,setTrait] = useState('steady');
  const [difficulty,setDifficulty] = useState('normal');
  return <main className="welcome c-welcome" style={{'--room-image':`url("${dayRoom}")`}}>
    <div className="welcome-intro"><a href="./" className="brand">SASA<span>Go3!</span></a><div className="welcome-copy"><span className="eyebrow">나의 마지막 학교생활, 첫 번째 선택</span><h1>우리의 고3은<br/>어떤 모습일까?</h1><p>겨울방학의 첫 스터디부터 12월의 합격 발표까지.<br/>공부하고, 쉬고, 가끔은 조금 헤매기도 하는<br/>사사의 일 년을 만들어 주세요.</p><span className="intro-tag"><GraduationCap size={18}/> 38주 · 한 주에 14번의 선택 · 여러 갈래의 미래</span></div></div>
    <form className="welcome-card" onSubmit={e => {e.preventDefault();onCreate(newCampaign({name,character,major,trait,difficulty}));}}>
      <span className="eyebrow">NEW CHAPTER</span><h2>나의 고3 시작하기</h2><CharacterChoices value={character} onChange={setCharacter}/>
      <label className="c-field">이름<input value={name} onChange={e => setName(e.target.value)} maxLength={12} placeholder="어떻게 불러줄까?" required/></label>
      <div className="c-form-row"><label className="c-field">전공<select value={major} onChange={e => setMajor(e.target.value)}>{Object.entries(MAJORS).map(([id,v]) => <option key={id} value={id}>{v}</option>)}</select></label><label className="c-field">지난 학기<select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="normal">보통 · 이전 학점 3.1</option><option value="easy">여유롭게 · 이전 학점 3.8</option></select></label></div>
      <label className="c-field">나의 특성<select value={trait} onChange={e => setTrait(e.target.value)}>{Object.entries(TRAITS).map(([id,t]) => <option key={id} value={id}>{t.name}</option>)}</select></label><p className="muted">{TRAITS[trait].description}</p>
      <p className="c-course-preview">수강신청은 전공 프리셋 + 교양필수 4과목으로 자동 완료됩니다. 능력치는 특성으로 결정돼요.</p>
      {error && <p role="alert" className="c-warning">{error}</p>}
      <button className="primary welcome-submit" disabled={!name.trim()}>겨울방학으로 <ChevronRight size={18}/></button><p className="local-note">자동 저장 · 기존 2학기 저장 슬롯과 별도로 진행</p>
    </form>
  </main>;
}

export default function CampaignApp() {
  const [loaded] = useState(readSave);
  const [game,setGame] = useState(loaded.game);
  const [modal,setModal] = useState(null);
  const [saved,setSaved] = useState('');
  const [tab,setTab] = useState('plan');
  const [result,setResult] = useState(null);
  const [university,setUniversity] = useState('kaist');
  const [department,setDepartment] = useState('공학');
  function save(value = game) {
    try { localStorage.setItem(SAVE_KEY,JSON.stringify(value));setSaved('저장됨'); }
    catch {setSaved('저장 실패 · 저장 공간 확인');}
  }
  useEffect(() => {if (game) save(game);},[game]);
  if (!game) return <Setup error={loaded.error} onCreate={g => {setGame(g);setModal('guide');}}/>;
  const time = term(game.week);
  const pending = notices(game);
  const options = activityOptions(game);
  const activeTasks = game.quests.filter(q => q.status === 'active');
  const last = game.lastResult;
  const change = fn => setGame(g => fn(g));
  const close = () => setModal(null);
  const editSlot = (i,value) => setGame(g => ({...g,plan:g.plan.map((v,n) => n === i ? value : v)}));
  const upcoming = game.week <= 8 ? '4월 4주 · 중간고사' : game.week <= 16 ? '6월 4주 · 기말고사' : game.week <= 28 ? '9월 4주 · 원서 마감' : game.week <= 34 ? '11월 2주 · 면접' : '12월 · 결과 발표';
  function advance() {
    const next = resolveCampaign(game);
    if (next === game) return;
    setResult(next.lastResult);setGame(next);setModal('result');
  }
  const reset = () => {setGame(null);setModal(null);setTab('plan');setResult(null);try {localStorage.removeItem(SAVE_KEY);} catch {setSaved('저장 삭제 실패');}};
  return <div className="app-shell c-shell">
    <header className="site-header"><a className="brand" href="./">SASA<span>Go3!</span><i>사사 고3 키우기</i></a><div className="header-right"><span className="semester"><span/>{time.name}</span><button className="help-button" onClick={() => setModal('guide')}>플레이 가이드</button></div></header>
    <main><section className="page-heading"><div><span className="eyebrow">MY SENIOR YEAR / {String(game.week + 1).padStart(2,'0')}</span><h1>{game.name}의 마지막 학교생활</h1></div><span className="c-next">{upcoming}</span></section>
      <div className="c-timeline" aria-label="학년 진행"><span className={game.week === 0 ? 'current' : ''}>겨울방학</span><span className={game.week > 0 && game.week <= 16 ? 'current' : ''}>1학기</span><span className={game.week >= 17 && game.week <= 24 ? 'current' : ''}>여름방학</span><span className={game.week >= 25 && game.week <= 36 ? 'current' : ''}>2학기</span><span className={game.week === END_WEEK ? 'current' : ''}>새로운 시작</span></div>
      <section className={`game-frame ${game.night ? 'night' : ''}`}><header className="game-toolbar"><div className="date-display"><CalendarDays size={18}/><strong>{time.label}</strong><span className="c-week-count">{game.week + 1} / 38주</span></div><div className="toolbar-actions"><span className="c-save" role="status">{saved}</span><button aria-label="낮 밤 전환" onClick={() => change(g => ({...g,night:!g.night}))}>{game.night ? <Moon size={18}/> : <Sun size={18}/>}</button><button aria-label="저장" onClick={() => save()}><Save size={18}/></button></div></header>
        <div className="c-room" style={{'--room-image':`url("${game.night ? nightRoom : dayRoom}")`}}>
          <aside className="c-profile c-panel"><span className="eyebrow">STUDENT STATUS</span><h2>{game.name} <small>{MAJORS[game.major]}</small></h2><div className="c-status-tags"><span>{TRAITS[game.trait].name}</span><span>벌점 {game.penalties}</span></div>{Object.entries(LABELS).filter(([key]) => key !== 'csat' || game.csatUnlocked).map(([key,label]) => <Meter key={key} label={label} value={game.stats[key]}/>)}<p className={game.fatigue ? 'c-warning' : 'c-profile-note'}>{game.fatigue ? '만성피로 · 이번 주 학습 효율 −35%' : '너의 속도로, 꾸준히 가보자.'}</p><button className="secondary" onClick={() => setModal('grades')}>수강 과목 · 성적표</button></aside>
          <section className="c-character"><div className="speech-bubble"><span>···</span>{game.ending ? '우리, 정말 여기까지 왔네.' : game.week === 0 ? '고3이라니… 일단 계획부터 세워볼까?' : game.fatigue ? '오늘은 조금 쉬어도 괜찮겠지?' : game.stats.stress > 65 ? '할 일이 많네. 잠깐 숨 좀 돌리자.' : '오늘의 작은 선택이 내일을 만들 거야.'}</div><img className={game.inventory.includes('outfit') ? 'dressed' : ''} src={characterImage(game.character)} alt={`${game.name} 캐릭터`}/><div className="character-name">{game.name}<small>{game.inventory.includes('outfit') ? '졸사 컨셉 의상 ✦' : 'SASA 3학년'}</small></div></section>
          <aside className="c-diary c-panel"><span className="eyebrow">TODAY'S NOTE</span><h2>오늘의 알림장 <span className="c-badge">{pending.length}</span></h2><button className="c-notice" onClick={() => setModal('notice')}><Bell size={19}/><span>{pending.length ? pending[0].title : '새 알림을 모두 확인했어요'}<small>{pending.length ? '확인하고 이번 주를 시작하세요' : '할 일과 마감일을 확인해 주세요'}</small></span><ChevronRight size={16}/></button><h3>진행 중인 할 일 <small>{activeTasks.length}</small></h3><div className="c-quests">{activeTasks.length ? activeTasks.map(q => <div className="c-quest" key={q.id}><b>{q.name}</b><small className={q.due === game.week ? 'c-due' : ''}>{q.due === game.week ? '이번 주 마감!' : `${term(q.due).month}월 ${term(q.due).part}주까지`} · {q.progress}/{q.target}</small><progress max={q.target} value={q.progress} aria-label={`${q.name} 진행도`}/><button disabled={!!game.ending || !game.plan.some((v,i) => i >= game.lockedSlots && v === 'rest')} onClick={() => {setTab('plan');const slot = game.plan.findIndex((v,i) => i >= game.lockedSlots && v === 'rest'); if (slot >= 0) editSlot(slot,`quest:${q.id}`);}}>빈 휴식 칸에 배정 +</button></div>) : <p className="muted">급한 과제는 없어요.<br/>알림 확인 후 자습 계획을 세워보세요.</p>}</div><div className="c-study">스터디 <b>{STUDIES[game.study] || '알림에서 모집 참여'}</b></div></aside>
        </div>
        <div className="c-dock"><nav><button onClick={() => setModal('notice')}><Bell size={18}/>알림 {pending.length > 0 && <b>{pending.length}</b>}</button><button onClick={() => setModal('shop')}><ShoppingBag size={18}/>매점</button><button onClick={() => setModal('admission')}><GraduationCap size={18}/>진학실</button><button onClick={() => setModal('records')}><BookOpen size={18}/>기록</button></nav><span className="c-money">나의 용돈 <b>{game.money.toLocaleString()}원</b></span><button className="primary c-next-button" disabled={pending.length > 0} onClick={() => setModal(game.ending ? 'ending' : 'confirm')}>{game.ending ? '엔딩 다시 보기' : pending.length ? '먼저 알림을 확인하세요' : game.week === END_WEEK ? '12월 결과 확인하기' : '한 주 시작하기'}<ChevronRight size={17}/></button></div>
      </section>
      {game.feedback && <p className="c-feedback" role="status">✦ {game.feedback}</p>}
      <section className="c-planning"><header><div><span className="eyebrow">ONE WEEK AT A TIME</span><h2>이번 주, 어떻게 보낼까?</h2></div><div className="c-tabs"><button aria-pressed={tab === 'plan'} onClick={() => setTab('plan')}>주간 계획</button><button aria-pressed={tab === 'year'} onClick={() => setTab('year')}>학사 일정</button></div></header>
        {tab === 'plan' ? <><p className="muted">월~일, 1자와 2자에 활동을 배정해요. 선택은 자동 저장되고 ‘한 주 시작하기’에서 실행됩니다.</p><div className="c-plan-tools"><button className="secondary" disabled={!!game.ending} onClick={() => change(g => ({...g,plan:defaultPlan()}))}>균형 계획</button><button className="secondary" disabled={!!game.ending} onClick={() => change(g => ({...g,plan:Array(14).fill('rest')}))}>전부 휴식</button><span>매주 용돈 +10,000원 · 과제 완료 후 남는 과제 칸은 휴식</span></div><div className="c-week-grid">{DAYS.map((day,d) => <div className="c-day" key={day}><h3>{day}<small>{d >= 5 ? '주말' : '자습'}</small></h3>{[0,1].map(s => { const i = d * 2 + s;const option = options.find(a => a.id === game.plan[i]);return <label key={s} className="c-slot"><span>{s + 1}자 {i < game.lockedSlots && '· 행사 참여'}</span><select aria-label={`${day}요일 ${s + 1}자`} value={game.plan[i]} disabled={!!game.ending || i < game.lockedSlots} onChange={e => editSlot(i,e.target.value)}>{options.map(a => <option key={a.id} value={a.id} disabled={a.id === 'work' && d < 5}>{a.name}</option>)}</select><small>{i < game.lockedSlots ? '알림에서 선택한 행사에 사용됩니다.' : option?.hint || '완료한 과제'}</small></label>;})}</div>)}</div>{game.week === 0 && <p className="c-tip">첫 주 안내: ‘수학 심층’으로 수학을 올리고, ‘내신’으로 과목 숙련도를 올려요. 과제는 ‘할 일’을 선택해야 진행됩니다. 일요일도 직접 계획할 수 있어요.</p>}</> : <YearCalendar week={game.week}/>}
      </section><footer className="page-footer"><span>SASAGo3! · 플레이 가능한 기획 초안</span><button onClick={() => setModal('reset')}>새 게임</button></footer>
    </main>
    {modal && <Modal title={{guide:'사사의 고3 생활 안내',notice:'알림장',grades:'수강 과목 · 성적표',shop:'기숙사 앞 매점',admission:'진학실',records:'나의 일 년',confirm:'이번 주를 시작할까요?',result:'이번 주의 기록',ending:'12월, 우리의 다음 장',reset:'새로운 고3 시작하기'}[modal]} wide={['grades','records','admission','result','guide'].includes(modal)} onClose={close}>
      {modal === 'guide' && <Guide/>}
      {modal === 'notice' && <div className="c-events">{pending.length ? pending.map(event => <article key={event.id}><span className="eyebrow">{term(event.week).label}</span><h3>{event.title}</h3><p>{event.text}</p>{event.kind === 'interview' ? <div><b>{game.interviewAnswers.length + 1}/3 · {INTERVIEW[game.interviewAnswers.length].question}</b>{INTERVIEW[game.interviewAnswers.length].options.map((label,i) => <button className="c-choice" key={label} onClick={() => change(g => answerInterview(g,i))}>{label}</button>)}</div> : event.choices ? event.choices.map((choice,i) => <button className="c-choice" key={choice.label} disabled={(choice.cost || 0) > game.money || (event.id === 'study' && game.failedStudies.includes(choice.kind))} onClick={() => change(g => chooseEvent(g,event.id,i))}>{choice.label}<small>{choice.detail || Object.entries(choice.effects || {}).map(([k,v]) => `${LABELS[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ')}</small></button>) : <button className="primary" onClick={() => change(g => chooseEvent(g,event.id))}>확인 · 할 일에 추가</button>}</article>) : <p className="info-note">모든 알림을 확인했어요. 이번 주 일정을 준비해 주세요.</p>}{game.feedback && <p role="status" className="c-tip">{game.feedback}</p>}</div>}
      {modal === 'grades' && <><p className="info-note">{MAJORS[game.major]} 전공 자동 수강신청 완료 · 교양필수 포함<br/>3-1 학점 {gpa(game).toFixed(2)} / 4.3 {game.week <= 16 && '(진행 중 · 미응시 항목은 0점)'}<br/>시험 점수 = 40 + (숙련도 × 0.65 + 관련 능력 × 0.35) × 0.6 ± 5. 합산 능력 100에서 약 95~100점, 85에서 약 86~96점, 70에서 약 77~87점입니다.</p><div className="c-table-scroll"><table className="c-table"><thead><tr><th>과목</th><th>학점</th><th>숙련도</th><th>중간</th><th>기말</th><th>종합점수</th></tr></thead><tbody>{enrolled(game).map(c => <tr key={c.id}><td>{c.name}<small>퀴즈/중간/기말/수행 {Object.values(c.weights).map(v => Math.round(v * 100)).join('/') }%</small></td><td>{c.credits}</td><td>{Math.round(game.mastery[c.id])}</td><td>{game.grades[c.id].midterm ?? '—'}</td><td>{game.grades[c.id].final ?? '—'}</td><td>{courseScore(game,c).toFixed(1)}</td></tr>)}</tbody></table></div></>}
      {modal === 'shop' && <><p className="shop-balance">나의 용돈 <b>{game.money.toLocaleString()}원</b></p>{SHOP.map(item => <div className="shop-item" key={item.id}><div><h3>{item.name}</h3><p>{item.description}</p><b>{item.price.toLocaleString()}원</b></div><button className="secondary" disabled={!!game.ending || game.money < item.price || game.purchases.includes(item.id) || game.inventory.includes(item.id)} onClick={() => change(g => buyItem(g,item.id))}>{game.inventory.includes(item.id) ? '장착 중' : game.purchases.includes(item.id) ? '이번 주 구매 완료' : '구매 · 사용'}</button></div>)}<p className="info-note">각 상품은 한 주에 한 번 구매할 수 있습니다. 간식과 노트는 즉시 사용돼요. 의상은 장착 표시와 졸사 이벤트에 반영됩니다.</p></>}
      {modal === 'admission' && <><p className="info-note">9월 1~4주에 목표 대학 한 곳을 접수할 수 있어요. 3-1 학점은 학업 평가의 80%, 이전 학점은 20%를 반영합니다. 모든 평가 수치와 경쟁률은 게임용 가상 규칙입니다.</p><div className="c-universities">{Object.entries(UNIVERSITIES).map(([id,u]) => <div key={id}><b>{u.name}</b><p>{u.description}</p><small>교내 지원 {game.stats.reputation >= 60 ? `${u.competition + (department === '공학' ? 2 : 0)}명 / 1자리` : '평판 60부터 공개'} · 현재 평가 {admissionScore(game,id)}점</small></div>)}</div><div className="c-form-row"><label className="c-field">목표 대학<select value={university} onChange={e => setUniversity(e.target.value)}>{Object.entries(UNIVERSITIES).map(([id,u]) => <option key={id} value={id} disabled={id === 'csat' && !game.csatUnlocked}>{u.name}{id === 'csat' && !game.csatUnlocked ? ' · 상담 필요' : ''}</option>)}</select></label><label className="c-field">학과<select value={department} onChange={e => setDepartment(e.target.value)}>{['자연과학','공학','융합'].map(d => <option key={d}>{d}</option>)}</select></label></div><button className="primary full-width" disabled={game.week < 25 || game.week > 28 || (university === 'csat' && !game.csatUnlocked)} onClick={() => change(g => submitApplication(g,university,department))}>원서 접수 · 변경</button><p className="c-tip">{game.application ? `접수 완료: ${UNIVERSITIES[game.application.university].name} ${game.application.department}` : '접수한 원서가 없습니다.'}</p><small>합격 기준: 서울대 80 · KAIST 73 · POSTECH 70 · 고려대 66 · 수능 68. 공학 +3, 융합 −2. 창의도전·자소서·추천서·면접 보너스는 수시에만 반영됩니다.</small></>}
      {modal === 'records' && <>{game.history.length ? [...game.history].reverse().map(r => <Result key={r.week} entry={r}/>) : <p className="info-note">첫 주를 보내면 여기에 기록이 쌓입니다.</p>}</>}
      {modal === 'confirm' && <><p className="info-note">{time.label}의 14개 자습을 순서대로 실행합니다. 주가 지나면 되돌릴 수 없어요. 마감 과제는 완료하지 않으면 불이익이 발생합니다.</p><ul className="c-review">{DAYS.map((day,i) => <li key={day}><b>{day}</b>{[0,1].map(s => i * 2 + s < game.lockedSlots ? '행사 참여' : options.find(o => o.id === game.plan[i * 2 + s])?.name).join(' / ')}</li>)}</ul>{activeTasks.filter(q => q.due === game.week).map(q => <p className="c-warning" key={q.id}>이번 주 마감: {q.name} ({q.progress}/{q.target})</p>)}{game.week === 28 && !game.application && <p className="c-warning">원서 마감 주입니다. 진학실에서 접수하지 않으면 대학 전형에 지원하지 않습니다.</p>}<button className="primary full-width" onClick={advance}>계획대로 한 주 보내기</button></>}
      {modal === 'result' && <>{(result || last) && <Result entry={result || last}/>}<button className="primary full-width" onClick={() => setModal(game.ending ? 'ending' : null)}>{game.ending ? '엔딩 확인하기' : '다음 주 준비하기'}</button></>}
      {modal === 'ending' && game.ending && <div className="c-ending"><GraduationCap size={50}/><span className="eyebrow">THE NEXT CHAPTER</span><h2>{game.ending.title}</h2><p>{game.ending.description}</p>{game.ending.score !== undefined && <p>최종 평가 {game.ending.score}점 / 합격선 {game.ending.threshold}점</p>}<p>3-1 학점 {gpa(game).toFixed(2)} · 완수한 과제 {game.quests.filter(q => q.status === 'complete').length}개<br/>벌점 {game.penalties} · 남은 용돈 {game.money.toLocaleString()}원</p><button className="primary full-width" onClick={() => setModal('reset')}>다른 선택으로 다시 시작</button></div>}
      {modal === 'reset' && <><p className="info-note">현재 학년의 자동 저장을 지우고 새로 시작합니다. 이전 버전의 2학기 저장은 유지됩니다.</p><button className="primary full-width" onClick={reset}>새 게임 시작</button><button className="secondary full-width" onClick={close}>취소</button></>}
    </Modal>}
  </div>;
}
function Result({entry}) {
  return <article className="c-result"><h3>{term(entry.week).label}</h3><div className="c-deltas">{Object.entries(entry.delta).filter(([,v]) => v !== 0).map(([k,v]) => <span key={k} className={(k === 'stress' ? v < 0 : v > 0) ? 'good' : 'bad'}>{LABELS[k]} {v > 0 ? '+' : ''}{v}</span>)}</div><ul>{entry.notes.map((note,i) => <li key={i}>{note}</li>)}</ul><p className="muted">주간 용돈이 지급되었습니다.</p></article>;
}
function Guide() {
  return <div className="c-guide"><p className="info-note">겨울방학 1주 + 3~11월 매달 4주 + 12월 결과 발표로 구성된 38주 초안입니다. 학생의 일 년을 압축한 게임이며 실제 학교 평가나 입시 결과를 예측하지 않습니다.</p><ol className="guide-list"><li><b>알림을 확인하고 스터디 선택</b><p>첫 주에는 4가지 중 선택하세요. 열공팀에 거절되면 다시 지원할 수 없고 다른 팀을 고릅니다. 선택한 팀이 매주 생활에 영향을 줍니다.</p></li><li><b>월~일 1자·2자 계획</b><p>심층은 기본 능력, 내신은 선택한 과목 숙련도를 올립니다. 과제는 ‘할 일’에 시간을 배정해야 진척도가 올라가요. 행사에 참여하면 앞쪽 자습 칸이 사용됩니다.</p></li><li><b>성적과 몸 상태 관리</b><p>3월·5월 마지막 주 퀴즈, 4월 중간고사, 6월 기말고사. 건강 25 미만 또는 스트레스 80 이상이면 다음 주 만성피로가 생깁니다. 방 청소를 빼먹으면 벌점, 아침스터디에서 휴식이 2칸 미만이면 벌금!</p></li><li><b>여름방학과 원서</b><p>상담으로 수능 루트를 해금할 수 있어요. 9월에 자소서를 완성하고 진학실에서 원서를 접수하세요. 11월 면접 미니게임을 마치면 12월에 결과를 확인합니다.</p></li></ol><p className="muted">변경은 이 브라우저에 자동 저장됩니다. 기존 그림·캐릭터·폰트를 이어 사용했습니다. 의상은 현재 장착 표시와 능력치 효과만 제공됩니다.</p></div>;
}
function YearCalendar({week}) {
  const entries = [['겨울방학','튜토리얼 · 수강신청 · 스터디',0],['3월','해냄 숙제 · 졸논 시작 · 과목 퀴즈',1],['4월','중간고사 · 생일 · 회복',5],['5월','인예주 · 강연 · 졸사 · 제주도',9],['6월','추천서 · 졸논 마감 · 기말고사',13],['7월','상담 · 수능 해금 · 공부 장소',17],['8월','방 배정 · 외부대회',21],['9월','원서 접수 · 자소서 · 추석',25],['10월','창의도전 · 면접 준비',29],['11월','면접 미니게임 · 수능',33],['12월','결과 발표 · 엔딩',37]];
  return <div className="c-year">{entries.map(([month,text,start]) => <div className={week >= start && week < start + (start === 0 ? 1 : 4) ? 'current' : ''} key={month}><b>{month}</b><p>{text}</p></div>)}</div>;
}

