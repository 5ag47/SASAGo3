import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Backpack, Bell, BookOpen, CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Coffee, FlaskConical, GraduationCap, Heart, HelpCircle, Leaf, Moon, Play, Save, Settings, ShoppingBag, Sparkles, Sun, Wallet, X } from 'lucide-react';
import boy from '../남자초안.png';
import girl from '../여자초안.png';
import dayRoom from '../배경낮.png';
import nightRoom from '../배경밤.png';
import { ACTIVITIES, DAYS, ITEMS, SAVE_KEY, STATS, dateLabel, initialGame, validSave, weekDate } from './game.js';

function readSave() {
  try { const data = JSON.parse(localStorage.getItem(SAVE_KEY)); return validSave(data) ? data : initialGame(); }
  catch { return initialGame(); }
}
const money = value => value.toLocaleString('ko-KR');
const locations = [...new Set(Object.values(ACTIVITIES).map(a => a.place))];

function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className={`modal ${wide ? 'wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <div className="modal-inner">
      <header className="modal-heading"><div>{subtitle && <p className="eyebrow">{subtitle}</p>}<h2 id={titleId}>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X size={21} /></button></header>
      {children}
    </div>
  </dialog>;
}

function StatBars({ stats, all = false }) {
  return <div className={`stat-list ${all ? 'all-stats' : ''}`}>{STATS.slice(0, all ? 8 : 6).map(stat => <div className="stat-row" key={stat.key}>
    <span>{stat.label}</span><div className="stat-track" role="meter" aria-label={stat.label} aria-valuenow={stats[stat.key]} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${stats[stat.key]}%`, background: stat.color }} /></div><b>{stats[stat.key]}</b>
  </div>)}</div>;
}

function CharacterChoices({ value, onChange }) {
  return <div className="character-choices">{[['boy', boy, '남학생'], ['girl', girl, '여학생']].map(([id, img, label]) => <button type="button" key={id} className={`character-choice ${value === id ? 'chosen' : ''}`} aria-pressed={value === id} onClick={() => onChange(id)}><span className="choice-check">{value === id && <Check size={14} />}</span><img src={img} alt={label} /><span>{label}</span></button>)}</div>;
}

function Onboarding({ onCreate }) {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState('boy');
  return <main className="welcome" style={{ '--room-image': `url("${dayRoom}")` }}>
    <div className="welcome-intro"><a className="brand" href="./">SASA<span>Go3!</span><i>사사 고3 키우기</i></a><div className="welcome-copy"><span className="eyebrow">우리의 마지막 학교생활</span><h1>어른이 되기<br />한 학기 전.</h1><p>조금은 서툴러도 괜찮아.<br />사사의 마지막 일 년, 나만의 속도로.</p><span className="intro-tag"><GraduationCap size={16} /> 세종과학예술영재학교 육성 시뮬레이션</span></div></div>
    <form className="welcome-card" onSubmit={e => { e.preventDefault(); if (name.trim()) onCreate(name.trim(), character); }}>
      <span className="eyebrow">HELLO, NEW SENIOR</span><h2>반가워, 예비 어른!</h2><p className="muted">우리의 이야기를 시작할 주인공을 골라주세요.</p>
      <CharacterChoices value={character} onChange={setCharacter} />
      <label className="field-label" htmlFor="student-name">어떻게 불러줄까요? <span>최대 12자</span></label>
      <input id="student-name" placeholder="이름을 입력해주세요" value={name} onChange={e => setName(e.target.value)} maxLength={12} required autoComplete="off" />
      <button className="primary welcome-submit" disabled={!name.trim()} type="submit">나의 고3 시작하기 <ArrowRight size={18} /></button>
      <p className="local-note"><Save size={13} /> 이 브라우저에 이름과 일정이 저장돼요.</p>
    </form><span className="welcome-footer">SASAGo3! <span>작은 선택들이 모여, 나의 내일이 된다.</span></span>
  </main>;
}

export default function App() {
  const [game, setGame] = useState(readSave);
  const [modal, setModal] = useState(null);
  const [selectedDay, setSelectedDay] = useState(3);
  const [draft, setDraft] = useState(game.plan[3]);
  const [toast, setToast] = useState('');
  const [saveStatus, setSaveStatus] = useState('저장됨');
  const [dialogue, setDialogue] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [profileName, setProfileName] = useState(game.name);
  const [profileCharacter, setProfileCharacter] = useState(game.character);
  const dirty = draft !== game.plan[selectedDay];
  const activity = ACTIVITIES[draft];
  const notify = text => setToast(text);
  useEffect(() => {
    if (!game.created) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); setSaveStatus('저장됨'); }
    catch { setSaveStatus('저장 실패'); }
  }, [game]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id); } }, [toast]);
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); setSaveStatus('저장됨'); notify('지금까지의 설정과 일정을 저장했어요.'); }
    catch { setSaveStatus('저장 실패'); notify('저장 공간을 사용할 수 없어요. 브라우저 설정을 확인해주세요.'); }
  }
  function selectDay(index) {
    if (dirty) { notify('변경한 활동을 먼저 신청하거나 취소해주세요.'); return; }
    setSelectedDay(index); setDraft(game.plan[index]);
  }
  function applyPlan() {
    setGame(old => ({ ...old, plan: old.plan.map((id, index) => index === selectedDay ? draft : id) }));
    notify(`${DAYS[selectedDay]}요일 ${activity.label} 일정을 신청했어요.`);
  }
  function openSettings() { setProfileName(game.name); setProfileCharacter(game.character); setModal('settings'); }
  const lines = game.stats.stress >= 70 ? ['오늘은 조금 쉬고 싶다…', '괜찮아, 잠깐 쉬어가도 돼.'] : ['침대 보고 싶다… 이미 앞에 있지만.', '이번 주의 나는, 조금 더 멋질지도?', '딱 한 문제만 더 풀고 매점 가자.'];
  if (!game.created) return <Onboarding onCreate={(name, character) => { setGame(old => ({ ...old, name, character, created: true })); notify('반가워요! 오른쪽 요일을 눌러 이번 주를 계획해보세요.'); }} />;

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="./">SASA<span>Go3!</span><i>사사 고3 키우기</i></a><div className="header-right"><span className="semester"><span /> 3학년 2학기</span><button className="help-button" onClick={() => setModal('help')}><HelpCircle size={16} /> 플레이 가이드</button></div></header>
    <main>
      <section className="page-heading"><div><p className="eyebrow">MY LITTLE SENIOR YEAR</p><h1>오늘도, 사사로운 하루<span>.</span></h1></div><p>조급해하지 말고, 우리만의 속도로 <Leaf size={16} /></p></section>
      <section className={`game-frame ${game.night ? 'night' : ''}`} aria-label="나의 기숙사">
        <header className="game-toolbar"><div className="date-display"><CalendarDays size={18} /><strong>{dateLabel(game.week)}</strong><span className="date-divider" /><span className="dday">D - 27 <span>모의 면접</span></span></div><div className="toolbar-actions"><span className="save-state"><CheckCheck size={14} /> {saveStatus}</span><button aria-label={game.night ? '낮 배경으로 변경' : '밤 배경으로 변경'} title="낮 / 밤 배경" onClick={() => setGame(old => ({ ...old, night: !old.night }))}>{game.night ? <Moon size={19} /> : <Sun size={19} />}</button><button aria-label="설정" onClick={openSettings}><Settings size={19} /></button><button aria-label="저장" onClick={save}><Save size={19} /></button></div></header>
        <div className="room" style={{ '--room-image': `url("${game.night ? nightRoom : dayRoom}")` }}>
          <div className="room-shade" />
          <aside className="left-panels">
            <section className="task-paper"><span className="tape tape-left" /><span className="tape tape-right" /><div className="paper-heading"><h2>이번 주 할 일</h2><span>TO DO</span></div><p className="paper-caption">하나씩, 차근차근 해보자.</p>{['모의 면접 준비하기', '원서 초안 작성하기'].map((task, index) => <label className={`task-check ${game.tasks[index] ? 'completed' : ''}`} key={task}><input type="checkbox" checked={game.tasks[index]} onChange={() => setGame(old => ({ ...old, tasks: old.tasks.map((v, i) => i === index ? !v : v) }))} /><span>{task}</span></label>)}<div className="paper-footer"><span>{game.tasks.filter(Boolean).length} / 2 완료</span><Sparkles size={16} /></div></section>
            <section className="stats-card"><div className="card-heading"><h2><Heart size={15} /> 나의 컨디션</h2><button onClick={() => setModal('stats')} aria-label="전체 능력치 보기"><ChevronRight size={17} /></button></div><StatBars stats={game.stats} /><div className="stats-note"><span className="status-dot" /> 아직은 해볼 만한 하루!</div></section>
          </aside>
          <div className="character-area"><button className="speech-bubble" onClick={() => setDialogue(old => old + 1)} title="다른 혼잣말 듣기"><span>···</span>{lines[dialogue % lines.length]}</button><button className="character-button" onClick={() => setDialogue(old => old + 1)} aria-label={`${game.name}의 혼잣말 듣기`}><img src={game.character === 'boy' ? boy : girl} alt={`${game.name} ${game.character === 'boy' ? '남학생' : '여학생'} 캐릭터`} /></button><span className="character-name"><span /> {game.name} <small>고3 · 2학기</small></span></div>
          <aside className="right-panels"><section className="planner"><div className="planner-heading"><h2>나의 일주일</h2><button aria-label="주간 달력 열기" onClick={() => { setMonthOffset(0); setModal('calendar'); }}><CalendarDays size={17} /></button></div><div className="day-tabs">{DAYS.map((day, index) => <button key={day} className={index === selectedDay ? 'active' : ''} aria-pressed={index === selectedDay} onClick={() => selectDay(index)}><span>{day}</span><b>{ACTIVITIES[game.plan[index]].label}</b><i className={ACTIVITIES[game.plan[index]].type} /></button>)}</div><div className="application-title"><BookOpen size={15} /><h3>자율학습 신청</h3><span>{DAYS[selectedDay]}요일</span></div><div className="application-body"><label className="field-label" htmlFor="place">장소</label><select id="place" value={activity.place} onChange={e => setDraft(Object.keys(ACTIVITIES).find(id => ACTIVITIES[id].place === e.target.value))}>{locations.map(place => <option key={place}>{place}</option>)}</select><label className="field-label" htmlFor="reason">사유</label><select id="reason" value={draft} onChange={e => setDraft(e.target.value)}>{Object.entries(ACTIVITIES).filter(([, a]) => a.place === activity.place).map(([id, a]) => <option key={id} value={id}>{a.reason}</option>)}</select><p className="activity-hint">{activity.type === 'rest' ? <Coffee size={14} /> : <BookOpen size={14} />}{activity.type === 'rest' ? '잘 쉬는 것도 실력이니까.' : '오늘의 작은 노력이 내일의 나를 만들어.'}</p><button className="primary apply-button" onClick={applyPlan}>{dirty ? '변경한 일정 신청하기' : '신청하기'}<Check size={16} /></button>{dirty && <button className="cancel-edit" onClick={() => setDraft(game.plan[selectedDay])}>변경 취소</button>}</div><div className="planner-foot"><span /> 일요일은 자유롭게 쉬는 날이에요.</div></section><button className="notice-card" onClick={() => setModal('notice')}><span className="notice-icon"><Bell size={16} /></span><span><small>사사 알림장 <i>NEW</i></small><b>2학기, 다시 시작해볼까?</b></span><ChevronRight size={17} /></button></aside>
          <div className="room-label"><span /> {game.night ? 'NIGHT' : 'AFTER SCHOOL'} <i /> 나의 기숙사</div>
        </div>
        <footer className="game-bottom"><nav aria-label="게임 메뉴">{[[ClipboardList, '기록', 'records'], [FlaskConical, '능력치', 'stats'], [Backpack, '가방', 'bag'], [ShoppingBag, '매점', 'shop']].map(([Icon, label, value]) => <button key={value} onClick={() => setModal(value)}><Icon size={22} strokeWidth={1.65} /><span>{label}</span></button>)}</nav><div className="bottom-right"><div className="allowance"><Wallet size={17} /><span>나의 용돈<b>{money(game.money)} <small>원</small></b></span></div><button className="start-week" onClick={() => { if (dirty) { notify('변경한 일정을 먼저 신청해주세요.'); return; } setModal('week'); }}><Play size={22} fill="currentColor" /><span>한 주 시작<small>이번 주 계획 확인하기</small></span><ChevronRight size={22} /></button></div></footer>
      </section>
      <footer className="page-footer"><span><Leaf size={14} /> 쉬어가는 날도, 성장하는 날이야.</span><span>SASAGo3! <i>·</i> 우리의 고3은 지금부터</span></footer>
    </main>
    {toast && <div role="status" className="toast"><Check size={17} />{toast}</div>}
    {modal && <Modal title={{ settings: '나의 학교생활 설정', stats: '지금의 나', records: '사사로운 기록', bag: '나의 가방', shop: '방과 후 매점', calendar: '나의 학교 달력', notice: '사사 알림장', week: '이번 주, 이렇게 보내볼까?', help: '조금씩 알아가는 고3 생활' }[modal]} subtitle={{ settings: 'MY PROFILE', stats: 'MY STATUS', records: 'MY SCHOOL DAYS', bag: 'MY LITTLE THINGS', shop: 'SASA STORE', calendar: 'SCHOOL CALENDAR', notice: 'YOU HAVE A MESSAGE', week: 'WEEKLY PLAN', help: 'HOW TO PLAY' }[modal]} onClose={() => setModal(null)} wide={modal === 'week' || modal === 'calendar'}>
      {modal === 'settings' && <form onSubmit={e => { e.preventDefault(); if (!profileName.trim()) return; setGame(old => ({ ...old, name: profileName.trim(), character: profileCharacter })); setModal(null); notify('프로필을 변경했어요.'); }}><CharacterChoices value={profileCharacter} onChange={setProfileCharacter} /><label className="field-label" htmlFor="profile-name">이름</label><input id="profile-name" maxLength={12} required value={profileName} onChange={e => setProfileName(e.target.value)} /><p className="info-note">캐릭터에 따른 능력치 차이는 없어요. 배경은 상단의 해·달 아이콘으로 바꿀 수 있어요.</p><button className="primary full-width" disabled={!profileName.trim()}>설정 저장하기</button></form>}
      {modal === 'stats' && <><div className="student-summary"><img src={game.character === 'boy' ? boy : girl} alt="" /><div><span className="eyebrow">세종과학예술영재학교</span><h3>{game.name} <small>3학년</small></h3><p>작은 가능성이 자라는 중</p></div></div><StatBars stats={game.stats} all /><p className="info-note">현재는 화면 구성을 위한 예시 능력치예요. 주간 결과 계산과 스탯 변화는 다음 단계에서 연결됩니다. 수능은 상담 시스템 도입 후 활성화될 예정이에요.</p></>}
      {modal === 'records' && <div className="empty-state"><ClipboardList size={38} /><h3>아직 채워지지 않은 페이지</h3><p>앞으로의 한 주, 한 주가 여기에 쌓일 거예요.<br />지금은 이번 주 일정을 먼저 계획해보세요.</p><span className="soft-tag">주간 진행 기록 · 준비 중</span></div>}
      {modal === 'bag' && <div className="empty-state"><Backpack size={40} /><h3>가방을 가볍게, 시작은 산뜻하게</h3><p>아직 가지고 있는 아이템이 없어요.<br />매점에 어떤 물건이 있는지 구경해볼까요?</p><button className="secondary" onClick={() => setModal('shop')}>매점 구경하기 <ArrowRight size={16} /></button></div>}
      {modal === 'shop' && <><div className="shop-balance"><span><Wallet size={16} /> 나의 용돈</span><b>{money(game.money)}원</b></div><div className="shop-items">{ITEMS.map(item => <div className="shop-item" key={item.id}><span className="item-emoji">{item.emoji}</span><div><h3>{item.name}</h3><p>{item.desc}</p><b>{money(item.price)}원</b></div><span className="soft-tag">준비 중</span></div>)}</div><p className="info-note">매점 미리보기예요. 아이템 구매·사용과 용돈 변화는 추후 연결됩니다.</p></>}
      {modal === 'calendar' && <Calendar game={game} offset={monthOffset} setOffset={setMonthOffset} />}
      {modal === 'notice' && <><article className="notice-message"><span className="soft-tag">학교생활 안내 · 9월 7일</span><h3>우리의 마지막 2학기가 시작됐어요.</h3><p>모의 면접도, 원서 작성도 어느새 코앞! 너무 조급해하지 말고 이번 주에 할 수 있는 것부터 하나씩 해봐요.</p><p>오른쪽의 요일을 선택하고 장소와 사유를 신청하면 나만의 주간 계획을 만들 수 있어요. 요양 시간도 꼭 챙겨두기!</p><span className="notice-sign">너의 새로운 학기를 응원하며, 사사 알림장</span></article><button className="primary full-width" onClick={() => setModal(null)}>확인했어요 <Check size={16} /></button></>}
      {modal === 'week' && <><p className="modal-description">{dateLabel(game.week)} · 공부도 휴식도, 균형 있게.</p><div className="week-review">{DAYS.map((day, index) => <div key={day}><span>{day}<small>요일</small></span><b>{ACTIVITIES[game.plan[index]].label}</b><p>{ACTIVITIES[game.plan[index]].place}</p><Check size={16} /></div>)}</div><div className="preview-note"><Sparkles size={21} /><div><strong>이번 주 계획이 준비됐어요!</strong><p>현재는 일정 입력까지 가능한 메인페이지 버전이에요.<br />스토리 진행과 주간 결과 계산은 아직 연결되지 않았어요.</p></div></div><button className="primary full-width" onClick={() => setModal(null)}>계획 확인 완료 <Check size={16} /></button></>}
      {modal === 'help' && <><ol className="guide-list"><li><b>나의 일주일 계획하기</b><p>월~토 요일을 누르고 장소와 사유를 골라 신청해주세요. 일요일은 휴식일이에요.</p></li><li><b>작은 목표 체크하기</b><p>왼쪽 할 일을 체크하고, 캐릭터를 눌러 혼잣말도 들어보세요.</p></li><li><b>한 주 계획 확인하기</b><p>‘한 주 시작’에서 신청한 일정을 한눈에 확인할 수 있어요. 실제 시간 진행과 능력치 계산은 준비 중이에요.</p></li></ol><p className="info-note">입력 내용은 현재 브라우저에 자동 저장돼요. 브라우저 데이터를 삭제하면 저장 내용도 사라집니다. 계정 로그인과 기기 간 연동은 아직 제공하지 않아요.</p></>}
    </Modal>}
  </div>;
}

function Calendar({ game, offset, setOffset }) {
  const start = weekDate(game.week);
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
  const year = current.getUTCFullYear(), month = current.getUTCMonth();
  const first = (current.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return <><div className="calendar-nav"><button className="icon-button" aria-label="이전 달" onClick={() => setOffset(v => v - 1)}><ChevronLeft size={20} /></button><h3>{year}년 {month + 1}월</h3><button className="icon-button" aria-label="다음 달" onClick={() => setOffset(v => v + 1)}><ChevronRight size={20} /></button></div><div className="calendar-grid">{[...DAYS, '일'].map(d => <strong key={d}>{d}</strong>)}{Array.from({ length: first }, (_, i) => <div key={`empty${i}`} />)}{Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month, i + 1));
    const index = (date - start) / 86400000;
    const thisWeek = index >= 0 && index < 7;
    return <div key={i} className={`${thisWeek ? 'this-week' : ''} ${index === 0 ? 'today' : ''}`}><span>{i + 1}</span>{thisWeek && <small>{index < 6 ? ACTIVITIES[game.plan[index]].label : '휴식'}</small>}{year === 2026 && month === 9 && i === 3 && <small>모의 면접</small>}</div>;
  })}</div><p className="calendar-key"><span /> 이번 주 일정 <small>선택한 활동은 메인 화면에서 변경할 수 있어요.</small></p></>;
}
