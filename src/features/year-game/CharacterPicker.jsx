import { Check } from 'lucide-react';
import { useState } from 'react';
import { CHARACTERS } from '../../domain/catalog.js';
import { characterImage } from '../../assets.js';

function CharacterOption({ id, name, selected, disabled, onChange }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  return (
    <button
      type="button"
      className={selected ? 'selected' : ''}
      disabled={disabled}
      onClick={() => {
        if (failed) {
          setFailed(false);
          setRetry((value) => value + 1);
        } else onChange(id);
      }}
      aria-label={failed ? `${name} 이미지 다시 불러오기` : `${name} 선택`}
      aria-pressed={selected}
    >
      <img
        src={characterImage(id) + (retry ? `?reload=${retry}` : '')}
        alt={name}
        draggable={false}
        onError={() => setFailed(true)}
        onLoad={() => setFailed(false)}
      />
      {failed && <span role="alert">이미지 불러오기 실패 · 눌러서 다시 불러오기</span>}
      <span className="avatar-selected">{selected && <Check size={14} />}</span>
    </button>
  );
}

export default function CharacterPicker({ value, disabled = false, onChange }) {
  return (
    <div className="avatar-options" role="group" aria-label="캐릭터 선택">
      {Object.entries(CHARACTERS).map(([id, character]) => (
        <CharacterOption
          key={id}
          id={id}
          name={character.name}
          selected={value === id}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
