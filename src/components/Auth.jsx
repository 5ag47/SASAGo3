import { useState } from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { dayRoom } from '../assets.js';
import { authenticate } from '../systems/accounts.js';
export default function Auth({
  onLogin
}) {
  const [mode, setMode] = useState('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && password !== confirm) {
      setError('비밀번호가 서로 달라요.');
      return;
    }
    setBusy(true);
    try {
      onLogin(await authenticate(mode, username, password));
    } catch (err) {
      setError(err.message || '계정을 저장할 수 없어요. 브라우저 저장 공간을 확인해주세요.');
    } finally {
      setBusy(false);
    }
  }
  return <main className="welcome" style={{
    '--room-image': `url("${dayRoom}")`
  }}>
    <div className="welcome-intro">
      <a className="brand" href="./">SASA<span>Go3!</span><i>사사 고3 키우기</i></a>
      <div className="welcome-copy"><span className="eyebrow">나만의 속도로, 함께 자라는</span><h1>우리의 마지막<br />가을 학기</h1>
        <p>공부도, 친구도, 가끔의 딴짓도.<br />작은 선택으로 채워가는 나의 고3 이야기.</p>
        <span className="intro-tag"><GraduationCap size={16} /> 세종과학예술영재학교 육성 시뮬레이션</span>
      </div>
    </div>
    <form className="welcome-card auth-card" onSubmit={submit}>
      <span className="eyebrow">WELCOME TO SASA</span><h2>{mode === 'signup' ? '이야기를 시작해볼까?' : '다시 만나서 반가워!'}</h2>
      <div className="auth-tabs" role="group" aria-label="계정 메뉴">{[['signup', '회원가입'], ['login', '로그인']].map(([id, label]) => <button type="button" key={id} disabled={busy} aria-pressed={mode === id} className={mode === id ? 'active' : ''} onClick={() => {
          setMode(id);
          setError('');
        }}>{label}</button>)}</div>
      <label className="field-label" htmlFor="username">아이디 <span>영문·숫자 3~24자</span></label>
      <input id="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]{3,24}" value={username} onChange={e => setUsername(e.target.value)} />
      <label className="field-label" htmlFor="password">비밀번호 <span>8자 이상</span></label>
      <input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
      {mode === 'signup' && <><label className="field-label" htmlFor="confirm-password">비밀번호 확인</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary welcome-submit" disabled={busy}>{busy ? '확인하는 중…' : mode === 'signup' ? '계정 만들기' : '로그인'}<ArrowRight size={17} /></button>
      <p className="info-note">이 브라우저에서 사용하는 로컬 계정이에요. 다른 기기와 연동되지 않으며, 브라우저 데이터를 지우면 계정도 사라져요.</p>
    </form>
  </main>;
}
