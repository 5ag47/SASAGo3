import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { characterImage, dayRoom } from '../../assets.js';
import CharacterPicker from './CharacterPicker.jsx';
import { MAJORS, REQUIRED, courses, roles, ELECTIVES } from '../../domain/catalog.js';
import { ChoiceButton } from './ui.jsx';
import './enrollment.css';

export default function Setup({ onCreate, busy, mode, onLogin, loginRequired }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    character: 'boy',
    role: 'steady',
    major: 'math',
    electives: [],
  });
  const change = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  return (
    <main className="setup-page" style={{ '--setup-bg': `url("${dayRoom}")` }}>
      <header className="setup-header">
        <a href="./" className="logo">
          SASA<span>Go3</span>
          <i>!</i>
        </a>
        <span>고3 생활 시뮬레이션</span>
      </header>
      <div className="setup-layout">
        <section className="setup-story">
          <span className="eyebrow">사사 고3 키우기</span>
          <h1>
            기숙사 복귀.
            <br />
            이제 진짜 고3<span>.</span>
          </h1>
          <p>
            자습 신청하고, 과제 내고, 시험 보고.
            <br />
            틈틈이 놀면서 12월까지 버텨 보자.
          </p>
          <div className="setup-illustration" style={{ backgroundImage: `url("${dayRoom}")` }}>
            <img src={characterImage(profile.character)} alt="기숙사 캐릭터" draggable={false} />
          </div>
        </section>
        <section className="setup-card">
          {loginRequired ? (
            <>
              <span className="eyebrow">SASAGO3 / LOGIN</span>
              <h2>게임 시작</h2>
              <p className="muted">Google 계정으로 로그인하면 진행 기록을 불러옵니다.</p>
              <div className="login-illustration">
                <LockKeyhole size={52} strokeWidth={1} />
              </div>
              <button className="primary full" onClick={onLogin} disabled={busy}>
                Google로 로그인 <ArrowRight size={17} />
              </button>
              <p className="fine-print">게임에는 닉네임만 표시됩니다.</p>
            </>
          ) : (
            <>
              <div className="step-indicator">
                <span className={step === 0 ? 'active' : 'done'}>
                  01 <i>나의 모습</i>
                </span>
                <b />
                <span className={step === 1 ? 'active' : ''}>
                  02 <i>나의 방향</i>
                </span>
              </div>
              <h2>{step === 0 ? '새 게임' : '특성·전공 선택'}</h2>
              <p className="muted">
                {step === 0
                  ? '캐릭터와 닉네임을 정해 주세요.'
                  : '특성은 초기 능력치, 전공은 수강 과목에 영향을 줍니다.'}
              </p>
              {step === 0 ? (
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
                    onChange={(e) => change('name', e.target.value)}
                    placeholder="나의 닉네임"
                    maxLength={12}
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && profile.name.trim()) setStep(1);
                    }}
                  />
                  <button
                    className="primary full"
                    disabled={!profile.name.trim()}
                    onClick={() => setStep(1)}
                  >
                    다음으로 <ArrowRight size={17} />
                  </button>
                </>
              ) : (
                <>
                  <label className="input-label">나의 특성</label>
                  <div className="role-grid">
                    {Object.entries(roles).map(([id, role]) => (
                      <button
                        key={id}
                        title={role.description}
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
                  <label className="input-label">전공 선택</label>
                  <div className="major-grid">
                    {Object.entries(MAJORS).map(([id, major]) => (
                      <button
                        key={id}
                        onClick={() => change('major', id)}
                        className={profile.major === id ? 'selected' : ''}
                        aria-pressed={profile.major === id}
                      >
                        <span>{major.icon}</span>
                        {major.name}
                      </button>
                    ))}
                  </div>
                  <div className="course-preview">
                    <b>자동 수강신청</b>
                    <p>{MAJORS[profile.major].courses.map((id) => courses[id].name).join(' · ')}</p>
                    <small>교양필수: {REQUIRED.map((id) => courses[id].short).join(' · ')}</small>
                  </div>
                  {ELECTIVES.map((id) => (
                    <label className="elective-choice" key={id}>
                      <input
                        type="checkbox"
                        checked={profile.electives.includes(id)}
                        onChange={(event) =>
                          change(
                            'electives',
                            event.target.checked
                              ? [...profile.electives, id]
                              : profile.electives.filter((course) => course !== id),
                          )
                        }
                      />
                      <span>
                        교양선택 · {courses[id].name}
                        <small>학기 중 매주 프로젝트 1칸</small>
                      </span>
                    </label>
                  ))}
                  <div className="setup-submit">
                    <button className="subtle" onClick={() => setStep(0)}>
                      <ArrowLeft size={16} /> 이전
                    </button>
                    <button className="primary" disabled={busy} onClick={() => onCreate(profile)}>
                      나의 고3 시작하기 <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
