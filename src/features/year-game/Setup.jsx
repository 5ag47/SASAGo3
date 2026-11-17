import { createGame } from '../../domain/engine.js';
import { StatList } from './ui.jsx';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { dayRoom } from '../../assets.js';
import CharacterPicker from './CharacterPicker.jsx';
import { MAJORS, REQUIRED, courses, roles, ELECTIVES } from '../../domain/catalog.js';
import './enrollment.css';
import { publicText } from './public-text.js';

export default function Setup({
  onCreate,
  busy,
  onLogin,
  loginRequired,
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
        {developer && <p>개발자 모드 · 테스트 저장</p>}
        {developerAvailable && !developer && (
          <a
            className="setup-developer-entry"
            href="?developer=1"
            target="_blank"
            rel="noopener noreferrer"
          >
            개발자 모드로 시작
            <small>자습 건너뛰기 · 날짜 이동 · 스탯 조정</small>
          </a>
        )}
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
                      <small>{publicText(role.tag)}</small>
                    </button>
                  ))}
                </div>
                <StatList
                  stats={preview.stats}
                  keys={['hp', 'reputation', 'stress', 'math', 'science']}
                />
                <label className="gpa-input">
                  이전 학점 <small>기본 4.00 / 4.30 · 원하는 경우 직접 입력</small>
                  <input
                    aria-label="이전 학점"
                    type="number"
                    min="0"
                    max="4.3"
                    step="0.01"
                    placeholder="4.00"
                    value={priorGpa}
                    onChange={(e) => setPriorGpa(e.target.value)}
                    disabled={busy}
                  />
                </label>
                {!gpaValid && <p role="alert">0.00~4.30 사이로 입력해 주세요.</p>}
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
                        <label key={id} className={profile.major === id ? 'selected' : ''}>
                          <input
                            type="radio"
                            name="major"
                            checked={profile.major === id}
                            onChange={() => change('major', id)}
                          />
                          {id === 'math' ? '수학·물리' : major.name}
                        </label>
                      ))}
                  </div>
                </fieldset>
                <div className="course-preview">
                  <b>수강 과목</b>
                  <p>{MAJORS[profile.major].courses.map((id) => courses[id].name).join(' · ')}</p>
                  <small>공통 필수 · {REQUIRED.map((id) => courses[id].name).join(' · ')}</small>
                </div>
                <fieldset className="elective-options" disabled={busy}>
                  <legend>교양 선택 · 선택하지 않아도 괜찮아요</legend>
                  <label
                    className={`elective-choice ${!profile.electives.length ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="elective"
                      checked={!profile.electives.length}
                      onChange={() => change('electives', [])}
                    />
                    <span>
                      추가 교양 없음<small>전공과 공통 필수에 집중해요.</small>
                    </span>
                  </label>
                  {ELECTIVES.map((id) => (
                    <label className="elective-choice" key={id}>
                      <input
                        type="radio"
                        name="elective"
                        disabled={busy}
                        checked={profile.electives.includes(id)}
                        onChange={(e) =>
                          change(
                            'electives',
                            e.target.checked
                              ? [...profile.electives, id]
                              : profile.electives.filter((course) => course !== id),
                          )
                        }
                      />
                      <span>
                        {courses[id].name}
                        <small>{courses[id].credits}학점 · 추가 과제 없음</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <p className="enrollment-lock-note">
                  게임 시작 전에는 이전 단계로 돌아가 선택을 바꿀 수 있어요.
                </p>
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
      </section>
    </main>
  );
}
