import { useState } from 'react';
import CharacterChoices from '../CharacterChoices.jsx';

export default function SettingsModal({ game, onSave }) {
  const [name, setName] = useState(game.name);
  const [character, setCharacter] = useState(game.character);

  function submit(e) {
    e.preventDefault();
    if (name.trim()) onSave(name.trim(), character);
  }

  return (
    <form onSubmit={submit}>
      <CharacterChoices value={character} onChange={setCharacter} />
      <label className="field-label" htmlFor="profile-name">이름</label>
      <input id="profile-name" maxLength={12} required value={name} onChange={e => setName(e.target.value)} />
      <p className="info-note">캐릭터에 따른 능력치 차이는 없어요. 배경은 상단의 해·달 아이콘으로 바꿀 수 있어요.</p>
      <button className="primary full-width" disabled={!name.trim()}>설정 저장하기</button>
    </form>
  );
}
