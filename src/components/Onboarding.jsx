import { useState } from 'react';
import { ArrowRight, GraduationCap, Save } from 'lucide-react';
import { dayRoom } from '../assets.js';
import CharacterChoices from './CharacterChoices.jsx';

export default function Onboarding({ onCreate }) {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState('boy');

  function submit(e) {
    e.preventDefault();
    if (name.trim()) onCreate(name.trim(), character);
  }

  return (
    <main className="welcome" style={{ '--room-image': `url("${dayRoom}")` }}>
      <div className="welcome-intro">
        <a className="brand" href="./">SASA<span>Go3!</span><i>사사 고3 키우기</i></a>
        <div className="welcome-copy">
          <h1>사사의<br />고3 2학기</h1>
          <p>
            일주일 단위로 일정을 짜서 능력치를 관리하는<br />
            육성 시뮬레이션입니다.
          </p>
          <span className="intro-tag"><GraduationCap size={16} /> 세종과학예술영재학교 육성 시뮬레이션</span>
        </div>
      </div>
      <form className="welcome-card" onSubmit={submit}>
        <h2>새 게임</h2>
        <p className="muted">캐릭터를 고르고 이름을 입력하세요.</p>
        <CharacterChoices value={character} onChange={setCharacter} />
        <label className="field-label" htmlFor="student-name">이름 <span>최대 12자</span></label>
        <input
          id="student-name"
          placeholder="이름을 입력해주세요"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={12}
          required
          autoComplete="off"
        />
        <button className="primary welcome-submit" disabled={!name.trim()} type="submit">시작하기 <ArrowRight size={18} /></button>
        <p className="local-note"><Save size={13} /> 이 브라우저에 이름과 일정이 저장돼요.</p>
      </form>
      <span className="welcome-footer">SASAGo3!</span>
    </main>
  );
}
