import { createGame } from '../../domain/engine.js';
import { StatList } from './ui.jsx';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { dayRoom } from '../../assets.js';
import CharacterPicker from './CharacterPicker.jsx';
import { MAJORS, REQUIRED, courses, roles, ELECTIVES } from '../../domain/catalog.js';
import './enrollment.css';

export default function Setup({
  onCreate,
  busy,
  onLogin,
  loginRequired,
  mode,
  developer,
  developerAvailable,
  seed = 20261013,
}) {
  const [step, setStep] = useState(0);
  const [priorGpa, setPriorGpa] = useState('');
  const gpaValid =
    priorGpa === '' ||
    (Number.isFinite(Number(priorGpa)) && Number(priorGpa) >= 0 && Number(priorGpa) <= 4.3);
  const [profile, setProfile] = useState({
    name: '',
    character: 'boy',
    role: 'steady',
    major: 'math',
    electives: [],
  });
  const preview = createGame({ ...profile, name: profile.name.trim() || '사사' }, seed);
  const change = (key, value) => setProfile((previous) => ({ ...previous, [key]: value }));
  return (
    <main className="setup-page integrated-setup" style={{ '--setup-bg': `url("${dayRoom}")` }}>
      <section className="setup-card">
        <h1 className="logo">
          SASA<span>Go3</span>
        </h1>
        {loginRequired ? (
          <>
            <h2>게임 시작</h2>
            <div className="login-illustration">
              <LockKeyhole size={52} strokeWidth={1} />
            </div>
            <button className="primary full" onClick={onLogin} disabled={busy}>
              Google로 로그인 <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
            <div className="step-indicator">
              {['나의 모습', '나의 특성', '수강신청'].map((label, index) => (
                <span
                  key={label}
                  className={step === index ? 'active' : step > index ? 'done' : ''}
                >
                  {label}
                </span>
              ))}
            </div>
            <h2>{['새 게임', '나의 특성', '수강신청'][step]}</h2>
            {step === 0 && (
              <>
                <CharacterPicker
                  value={profile.character}
                  disabled={busy}
                  onChange={(id) => change('character', id)}
                />
                <label htmlFor="nickname" className="input-label">
                  닉네임<small>최대 12자</small>
                </label>
                <input
                  id="nickname"
                  value={profile.name}
                  disabled={busy}
                  onChange={(e) => change('name', e.target.value)}
                  maxLength={12}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && profile.name.trim()) setStep(1);
                  }}
                />
              </>
            )}
            {step === 1 && (
              <>
                <div className="role-grid">
                  {Object.entries(roles).map(([id, role]) => (
                    <button
                      key={id}
                      disabled={busy}
                      className={profile.role === id ? 'selected' : ''}
                      aria-pressed={profile.role === id}
                      onClick={() => change('role', id)}
                    >
                      <span>{role.name}</span>
                      <small>{role.tag}</small>
                    </button>
                  ))}
                </div>
                <StatList
                  stats={preview.stats}
                  keys={['hp', 'reputation', 'stress', 'math', 'science']}
                />
                <label className="prior-gpa">
                  이전 학점 <small>기본 4.00 / 4.30</small>
                  <input
                    aria-label="이전 학점"
                    type="number"
                    min="0"
                    max="4.3"
                    step="0.01"
                    value={priorGpa}
                    placeholder="4.00"
                    onChange={(e) => setPriorGpa(e.target.value)}
                  />
                </label>
                {!gpaValid && <p role="alert">0.00~4.30 사이로 입력하세요.</p>}
              </>
            )}
            {step === 2 && (
              <>
                <fieldset className="enrollment-majors" disabled={busy}>
                  <legend>전공 선택</legend>
                  <div className="major-grid">
                    {Object.entries(MAJORS)
                      .filter(([id]) => id !== 'physics')
                      .map(([id, major]) => (
                        <button
                          key={id}
                          type="button"
                          className={profile.major === id ? 'selected' : ''}
                          aria-pressed={profile.major === id}
                          onClick={() => change('major', id)}
                        >
                          <b>{major.icon}</b>
                          <span>{id === 'math' ? '수학·물리' : major.name}</span>
                          {profile.major === id && <Check size={18} />}
                        </button>
                      ))}
                  </div>
                </fieldset>
                <div className="course-preview">
                  <b>수강 과목</b>
                  <p>{MAJORS[profile.major].courses.map((id) => courses[id].name).join(' · ')}</p>
                  <small>공통 필수 · {REQUIRED.map((id) => courses[id].name).join(' · ')}</small>
                </div>
                <fieldset className="elective-cards" disabled={busy}>
                  <legend>선택 교양</legend>
                  <button
                    type="button"
                    className={!profile.electives.length ? 'selected' : ''}
                    aria-pressed={!profile.electives.length}
                    onClick={() => change('electives', [])}
                  >
                    <b>추가하지 않기</b>
                    <span>필수 과목에 집중</span>
                    {!profile.electives.length && <Check size={20} />}
                  </button>
                  {ELECTIVES.map((id) => (
                    <button
                      type="button"
                      key={id}
                      className={profile.electives.includes(id) ? 'selected' : ''}
                      aria-pressed={profile.electives.includes(id)}
                      onClick={() => change('electives', [id])}
                    >
                      <b>{courses[id].name}</b>
                      <span>{courses[id].credits}학점 · 별도 과제 없음</span>
                      {profile.electives.includes(id) && <Check size={20} />}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
            <div className="setup-submit">
              {step > 0 && (
                <button className="subtle" disabled={busy} onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={16} /> 이전
                </button>
              )}
              {step < 2 ? (
                <button
                  className="primary"
                  disabled={busy || !profile.name.trim() || !gpaValid}
                  onClick={() => setStep(step + 1)}
                >
                  다음으로 <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={busy || !gpaValid}
                  onClick={() =>
                    onCreate({ ...profile, priorGpa: priorGpa === '' ? 4 : Number(priorGpa) })
                  }
                >
                  수강신청 완료 <ArrowRight size={17} />
                </button>
              )}
            </div>
          </>
        )}
        {developer && <p className="test-mode-label">테스트 게임 · 일반 저장과 분리됩니다.</p>}
        {developerAvailable && (
          <a className="developer-entry" href={developer ? '/' : '?developer=1'}>
            {developer ? '일반 모드로 돌아가기' : '개발자 테스트 모드'}
          </a>
        )}
      </section>
    </main>
  );
}
