import { useEffect, useState } from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { dayRoom } from '../assets.js';
import { INTERVIEW, LABELS, MAJORS, SHOP, TRAITS, UNIVERSITIES } from '../data/campaign.js';
import { migrateCampaign, requiredNotices, PERIODS, slotLocked, activityOptions, admissionScore, answerInterview, buyItem, chooseEvent, courseScore, END_WEEK, enrolled, gpa, newCampaign, notices, resolveCampaign, SAVE_KEY, submitApplication, term, validCampaign } from '../systems/campaign.js';
import GameScreen from './GameScreen.jsx';
import CharacterChoices from './CharacterChoices.jsx';
import Modal from './Modal.jsx';
import '../campaign.css';

const DAYS = ['월','화','수','목','금','토','일'];
function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {game:null,error:''};
    const game = migrateCampaign(JSON.parse(raw));
    return validCampaign(game) ? {game,error:''} : {game:null,error:'저장 형식을 읽을 수 없습니다. 기존 데이터는 새 게임을 시작하기 전까지 보존됩니다.'};
  } catch { return {game:null,error:'브라우저 저장소를 읽을 수 없습니다. 저장 기능을 확인해 주세요.'}; }
}
function Setup({onCreate,error}) {
  const [name,setName] = useState('');
  const [character,setCharacter] = useState('boy');
  const [major,setMajor] = useState('physics');
  const [trait,setTrait] = useState('steady');
  const [difficulty,setDifficulty] = useState('normal');
  return <main className="welcome c-welcome" style={{'--room-image':`url("${dayRoom}")`}}>
    <div className="welcome-intro"><a href="./" className="brand">SASA<span>Go3!</span></a><div className="welcome-copy"><span className="eyebrow">나의 마지막 학교생활, 첫 번째 선택</span><h1>우리의 고3은<br/>어떤 모습일까?</h1><p>겨울방학의 첫 스터디부터 12월의 합격 발표까지.<br/>공부하고, 쉬고, 가끔은 조금 헤매기도 하는<br/>사사의 일 년을 만들어 주세요.</p><span className="intro-tag"><GraduationCap size={18}/> 38주 · 요일별로 만드는 나의 일주일 · 여러 갈래의 미래</span></div></div>
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
  const [loggedOut,setLoggedOut] = useState(false);
  const [result,setResult] = useState(null);
  const [university,setUniversity] = useState('kaist');
  const [department,setDepartment] = useState('공학');
  function save(value = game) {
    try { localStorage.setItem(SAVE_KEY,JSON.stringify(value));setSaved('저장됨'); }
    catch {setSaved('저장 실패 · 저장 공간 확인');}
  }
  useEffect(() => {if (game) save(game);},[game]);
  if (!game) return <Setup error={loaded.error} onCreate={g => {setGame(g);setModal('guide');}}/>;
  if (loggedOut) return <main className="g-logged-out" style={{'--room-image':`url("${dayRoom}")`}}><section><h1>SASAGo3!</h1><p>{game.name}의 학교생활이 저장되어 있어요.</p><button className="primary full-width" onClick={() => setLoggedOut(false)}>이어하기</button><p className="muted">로컬 플레이에서 로그아웃한 상태입니다.</p></section></main>;
  const time = term(game.week);
  const pending = notices(game);
  const options = activityOptions(game);
  const activeTasks = game.quests.filter(q => q.status === 'active');
  const last = game.lastResult;
  const change = fn => setGame(g => fn(g));
  const close = () => setModal(null);
  function advance() {
    if (requiredNotices(game).length) {setModal('notice');return;}
    const next = resolveCampaign(game);
    if (next === game) return;
    setResult(next.lastResult);setGame(next);setModal('result');
  }
  const reset = () => {setGame(null);setModal(null);setResult(null);try {localStorage.removeItem(SAVE_KEY);} catch {setSaved('저장 삭제 실패');}};
  return <>
    <GameScreen game={game} setGame={setGame} saved={saved} onSave={() => save()} onOpen={id => {tone(game.volume);setModal(id);}} onPlay={() => {tone(game.volume);setModal(game.ending ? 'ending' : requiredNotices(game).length ? 'notice' : 'confirm');}} playLabel={game.ending ? '엔딩 다시 보기' : game.week === END_WEEK ? '12월 결과 확인하기' : '한 주 시작하기'}/>
    {modal && <Modal title={{settings:'설정',calendar:'학사 일정',guide:'사사의 고3 생활 안내',notice:'알림장',grades:'수강 과목 · 성적표',shop:'기숙사 앞 매점',admission:'진학실',records:'나의 일 년',confirm:'이번 주를 시작할까요?',result:'이번 주의 기록',ending:'12월, 우리의 다음 장',reset:'새로운 고3 시작하기'}[modal]} wide={['calendar','grades','records','admission','result','guide'].includes(modal)} onClose={close}>
      {modal === 'settings' && <><label className="g-setting">효과음 음량 · {Math.round(game.volume * 100)}%<input aria-label="효과음 음량" type="range" min="0" max="1" step="0.05" value={game.volume} onChange={e => change(g => ({...g,volume:Number(e.target.value)}))}/></label><button className="secondary" onClick={() => tone(game.volume)}>소리 확인</button><button className="secondary full-width" onClick={() => setModal('reset')}>초기화 · 새 게임</button><button className="secondary full-width" onClick={() => {save();close();setLoggedOut(true);}}>로그아웃</button><p className="info-note">로그아웃하면 시작 화면으로 돌아갑니다. 저장한 게임은 ‘이어하기’로 복원됩니다.</p></>}
      {modal === 'calendar' && <YearCalendar week={game.week}/>}
      {modal === 'guide'  && <Guide/>}
      {modal === 'notice' && <div className="c-events">{pending.length ? pending.map(event => <article key={event.id}><span className="eyebrow">{term(event.week).label}</span><h3>{event.title}</h3><p>{event.text}</p>{event.kind === 'interview' ? <div><b>{game.interviewAnswers.length + 1}/3 · {INTERVIEW[game.interviewAnswers.length].question}</b>{INTERVIEW[game.interviewAnswers.length].options.map((label,i) => <button className="c-choice" key={label} onClick={() => change(g => answerInterview(g,i))}>{label}</button>)}</div> : event.choices ? event.choices.map((choice,i) => <button className="c-choice" key={choice.label} disabled={(choice.cost || 0) > game.money || (event.id === 'study' && game.failedStudies.includes(choice.kind))} onClick={() => change(g => chooseEvent(g,event.id,i))}>{choice.label}<small>{choice.detail || Object.entries(choice.effects || {}).map(([k,v]) => `${LABELS[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ')}</small></button>) : <button className="primary" onClick={() => change(g => chooseEvent(g,event.id))}>확인</button>}</article>) : <p className="info-note">모든 알림을 확인했어요. 이번 주 일정을 준비해 주세요.</p>}{game.feedback && <p role="status" className="c-tip">{game.feedback}</p>}</div>}
      {modal === 'grades' && <><div className="g-detailed-stats">{Object.entries(LABELS).filter(([k]) => k !== 'csat' || game.csatUnlocked).map(([k,label]) => <span key={k}>{label} <b>{game.stats[k]}</b></span>)}</div><p className="info-note">{MAJORS[game.major]} 전공 자동 수강신청 완료 · 교양필수 포함<br/>3-1 학점 {gpa(game).toFixed(2)} / 4.3 {game.week <= 16 && '(진행 중 · 미응시 항목은 0점)'}<br/>시험 점수 = 40 + (숙련도 × 0.65 + 관련 능력 × 0.35) × 0.6 ± 5. 합산 능력 100에서 약 95~100점, 85에서 약 86~96점, 70에서 약 77~87점입니다.</p><div className="c-table-scroll"><table className="c-table"><thead><tr><th>과목</th><th>학점</th><th>숙련도</th><th>중간</th><th>기말</th><th>종합점수</th></tr></thead><tbody>{enrolled(game).map(c => <tr key={c.id}><td>{c.name}<small>퀴즈/중간/기말/수행 {Object.values(c.weights).map(v => Math.round(v * 100)).join('/') }%</small></td><td>{c.credits}</td><td>{Math.round(game.mastery[c.id])}</td><td>{game.grades[c.id].midterm ?? '—'}</td><td>{game.grades[c.id].final ?? '—'}</td><td>{courseScore(game,c).toFixed(1)}</td></tr>)}</tbody></table></div></>}
      {modal === 'shop' && <><p className="shop-balance">나의 용돈 <b>{game.money.toLocaleString()}원</b></p>{SHOP.map(item => <div className="shop-item" key={item.id}><div><h3>{item.name}</h3><p>{item.description}</p><b>{item.price.toLocaleString()}원</b></div><button className="secondary" disabled={!!game.ending || game.money < item.price || game.purchases.includes(item.id) || game.inventory.includes(item.id)} onClick={() => change(g => buyItem(g,item.id))}>{game.inventory.includes(item.id) ? '장착 중' : game.purchases.includes(item.id) ? '이번 주 구매 완료' : '구매 · 사용'}</button></div>)}<p className="info-note">각 상품은 한 주에 한 번 구매할 수 있습니다. 간식과 노트는 즉시 사용돼요. 의상은 장착 표시와 졸사 이벤트에 반영됩니다.</p></>}
      {modal === 'admission' && <><p className="info-note">9월 1~4주에 목표 대학 한 곳을 접수할 수 있어요. 3-1 학점은 학업 평가의 80%, 이전 학점은 20%를 반영합니다. 모든 평가 수치와 경쟁률은 게임용 가상 규칙입니다.</p><div className="c-universities">{Object.entries(UNIVERSITIES).map(([id,u]) => <div key={id}><b>{u.name}</b><p>{u.description}</p><small>교내 지원 {game.stats.reputation >= 60 ? `${u.competition + (department === '공학' ? 2 : 0)}명 / 1자리` : '평판 60부터 공개'} · 현재 평가 {admissionScore(game,id)}점</small></div>)}</div><div className="c-form-row"><label className="c-field">목표 대학<select value={university} onChange={e => setUniversity(e.target.value)}>{Object.entries(UNIVERSITIES).map(([id,u]) => <option key={id} value={id} disabled={id === 'csat' && !game.csatUnlocked}>{u.name}{id === 'csat' && !game.csatUnlocked ? ' · 상담 필요' : ''}</option>)}</select></label><label className="c-field">학과<select value={department} onChange={e => setDepartment(e.target.value)}>{['자연과학','공학','융합'].map(d => <option key={d}>{d}</option>)}</select></label></div><button className="primary full-width" disabled={game.week < 25 || game.week > 28 || (university === 'csat' && !game.csatUnlocked)} onClick={() => change(g => submitApplication(g,university,department))}>원서 접수 · 변경</button><p className="c-tip">{game.application ? `접수 완료: ${UNIVERSITIES[game.application.university].name} ${game.application.department}` : '접수한 원서가 없습니다.'}</p><small>합격 기준: 서울대 80 · KAIST 73 · POSTECH 70 · 고려대 66 · 수능 68. 공학 +3, 융합 −2. 창의도전·자소서·추천서·면접 보너스는 수시에만 반영됩니다.</small></>}
      {modal === 'records' && <>{game.history.length ? [...game.history].reverse().map(r => <Result key={r.week} entry={r}/>) : <p className="info-note">첫 주를 보내면 여기에 기록이 쌓입니다.</p>}</>}
      {modal === 'confirm' && <><p className="info-note">{time.label}의 요일별 자습을 순서대로 실행합니다. 주가 지나면 되돌릴 수 없어요. 마감 과제는 완료하지 않으면 불이익이 발생합니다.</p><ul className="c-review">{DAYS.map((day,i) => <li key={day}><b>{day}</b>{[0,1,2,3].map(s => `${PERIODS[s]}: ${slotLocked(game,i * 4 + s) ? '학교 행사' : options.find(o => o.id === game.plan[i * 4 + s])?.name}`).join(' / ')}</li>)}</ul>{activeTasks.filter(q => q.due === game.week).map(q => <p className="c-warning" key={q.id}>이번 주 마감: {q.name} ({q.progress}/{q.target})</p>)}{game.week === 28 && !game.application && <p className="c-warning">원서 마감 주입니다. 진학실에서 접수하지 않으면 대학 전형에 지원하지 않습니다.</p>}<button className="primary full-width" onClick={advance}>계획대로 한 주 보내기</button></>}
      {modal === 'result' && <>{(result || last) && <Result entry={result || last}/>}<button className="primary full-width" onClick={() => setModal(game.ending ? 'ending' : null)}>{game.ending ? '엔딩 확인하기' : '다음 주 준비하기'}</button></>}
      {modal === 'ending' && game.ending && <div className="c-ending"><GraduationCap size={50}/><span className="eyebrow">THE NEXT CHAPTER</span><h2>{game.ending.title}</h2><p>{game.ending.description}</p>{game.ending.score !== undefined && <p>최종 평가 {game.ending.score}점 / 합격선 {game.ending.threshold}점</p>}<p>3-1 학점 {gpa(game).toFixed(2)} · 완수한 과제 {game.quests.filter(q => q.status === 'complete').length}개<br/>벌점 {game.penalties} · 남은 용돈 {game.money.toLocaleString()}원</p><button className="primary full-width" onClick={() => setModal('reset')}>다른 선택으로 다시 시작</button></div>}
      {modal === 'reset' && <><p className="info-note">현재 학년의 자동 저장을 지우고 새로 시작합니다. 이전 버전의 2학기 저장은 유지됩니다.</p><button className="primary full-width" onClick={reset}>새 게임 시작</button><button className="secondary full-width" onClick={close}>취소</button></>}
    </Modal>}
  </>;
}
function Result({entry}) {
  return <article className="c-result"><h3>{term(entry.week).label}</h3><div className="c-deltas">{Object.entries(entry.delta).filter(([,v]) => v !== 0).map(([k,v]) => <span key={k} className={(k === 'stress' ? v < 0 : v > 0) ? 'good' : 'bad'}>{LABELS[k]} {v > 0 ? '+' : ''}{v}</span>)}</div><ul>{entry.notes.map((note,i) => <li key={i}>{note}</li>)}</ul><p className="muted">주간 용돈이 지급되었습니다.</p></article>;
}
function Guide() {
  return <div className="c-guide"><p className="info-note">겨울방학 1주 + 3~11월 매달 4주 + 12월 결과 발표로 구성된 38주 초안입니다. 학생의 일 년을 압축한 게임이며 실제 학교 평가나 입시 결과를 예측하지 않습니다.</p><ol className="guide-list"><li><b>알림을 확인하고 스터디 선택</b><p>첫 주에는 4가지 중 선택하세요. 열공팀에 거절되면 다시 지원할 수 없고 다른 팀을 고릅니다. 선택한 팀이 매주 생활에 영향을 줍니다.</p></li><li><b>요일 선택 → 자습 시간 → 활동 신청</b><p>오른쪽 요일 버튼으로 하루를 고르고 아침·1자·2자·연장자습을 신청하세요. 아침은 참여/불참여, 1·2자는 학습/요양, 연장은 학습/잠을 선택합니다. 연장 학습 후 다음 날은 50% 확률로 늦잠을 잡니다. 심층은 기본 능력, 내신은 과목 숙련도를 올립니다. 과제는 주가 시작되면 자동 추가되며, 학습에서 과제를 골라 시간을 써야 진척도가 올라갑니다. 완료 체크도 자동입니다. 행사에 참여하면 앞쪽 자습 칸이 사용됩니다.</p></li><li><b>성적과 몸 상태 관리</b><p>3월·5월 마지막 주 퀴즈, 4월 중간고사, 6월 기말고사. 건강 25 미만 또는 스트레스 80 이상이면 다음 주 만성피로가 생깁니다. 집중력은 건강−스트레스입니다. 매주 기본 스트레스 +4, 방 청소 누락 시 벌점이 적용됩니다.</p></li><li><b>여름방학과 원서</b><p>상담으로 수능 루트를 해금할 수 있어요. 9월에 자소서를 완성하고 진학실에서 원서를 접수하세요. 11월 면접 미니게임을 마치면 12월에 결과를 확인합니다.</p></li></ol><p className="muted">변경은 이 브라우저에 자동 저장됩니다. 기존 그림·캐릭터·폰트를 이어 사용했습니다. 의상은 현재 장착 표시와 능력치 효과만 제공됩니다.</p></div>;
}
function YearCalendar({week}) {
  const entries = [['겨울방학','튜토리얼 · 수강신청 · 스터디',0],['3월','해냄 숙제 · 졸논 시작 · 과목 퀴즈',1],['4월','중간고사 · 생일 · 회복',5],['5월','인예주 · 강연 · 졸사 · 제주도',9],['6월','추천서 · 졸논 마감 · 기말고사',13],['7월','상담 · 수능 해금 · 공부 장소',17],['8월','방 배정 · 외부대회',21],['9월','원서 접수 · 자소서 · 추석',25],['10월','창의도전 · 면접 준비',29],['11월','면접 미니게임 · 수능',33],['12월','결과 발표 · 엔딩',37]];
  return <div className="c-year">{entries.map(([month,text,start]) => <div className={week >= start && week < start + (start === 0 ? 1 : 4) ? 'current' : ''} key={month}><b>{month}</b><p>{text}</p></div>)}</div>;
}


function tone(volume) {
  if (!volume) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(volume * .12,context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,context.currentTime + .09);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .1);
    oscillator.onended = () => context.close();
  } catch { /* 소리를 지원하지 않아도 게임은 계속 진행한다. */ }
}
