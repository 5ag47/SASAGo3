import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { dayRoom } from '../../assets.js';
import CharacterPicker from './CharacterPicker.jsx';
import { MAJORS, REQUIRED, courses, roles, ELECTIVES } from '../../domain/catalog.js';
import './enrollment.css';

export default function Setup({ onCreate, busy, onLogin, loginRequired }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    character: 'boy',
    role: 'steady',
    major: 'math',
    electives: [],
  });
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
                <p className="role-detail">{roles[profile.role].description}</p>
              </>
            )}
            {step === 2 && (
              <>
                <fieldset className="enrollment-majors" disabled={busy}>
                  <legend>전공 선택</legend>
                  <div className="major-grid">
                    {Object.entries(MAJORS).map(([id, major]) => (
                      <label key={id} className={profile.major === id ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="major"
                          checked={profile.major === id}
                          onChange={() => change('major', id)}
                        />
                        {major.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="course-preview">
                  <b>수강 과목</b>
                  <p>{MAJORS[profile.major].courses.map((id) => courses[id].name).join(' · ')}</p>
                  <small>공통 필수 · {REQUIRED.map((id) => courses[id].name).join(' · ')}</small>
                </div>
                {ELECTIVES.map((id) => (
                  <label className="elective-choice" key={id}>
                    <input
                      type="checkbox"
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
                      <small>교양 선택</small>
                    </span>
                  </label>
                ))}
                <p className="enrollment-lock-note">확정한 수강 과목은 변경할 수 없습니다.</p>
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
                  disabled={busy || !profile.name.trim()}
                  onClick={() => setStep(step + 1)}
                >
                  다음으로 <ArrowRight size={17} />
                </button>
              ) : (
                <button className="primary" disabled={busy} onClick={() => onCreate(profile)}>
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
