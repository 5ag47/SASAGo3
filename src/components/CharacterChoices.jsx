import { Check } from 'lucide-react';
import { boy, girl } from '../assets.js';

const CHOICES = [
  ['boy', boy, '남학생'],
  ['girl', girl, '여학생'],
];

export default function CharacterChoices({ value, onChange }) {
  return (
    <div className="character-choices">
      {CHOICES.map(([id, img, label]) => (
        <button
          type="button"
          key={id}
          className={`character-choice ${value === id ? 'chosen' : ''}`}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <span className="choice-check">{value === id && <Check size={14} />}</span>
          <img src={img} alt={label} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
