import { Check } from 'lucide-react';
import { boy, girl } from '../assets.js';

const CHOICES = [
  ['boy', boy, '캐릭터 1'],
  ['girl', girl, '캐릭터 2'],
];

export default function CharacterChoices({ value, onChange }) {
  return (
    <div className="character-choices">
      {CHOICES.map(([id, img, label]) => (
        <button
          type="button"
          key={id}
          className={`character-choice ${value === id ? 'chosen' : ''}`}
          aria-label={label}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <span className="choice-check">{value === id && <Check size={14} />}</span>
          <img src={img} alt="" />
        </button>
      ))}
    </div>
  );
}
