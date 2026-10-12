import { useState } from 'react';
import { characterImage, characterLabel } from '../assets.js';
import { dialogueLines } from '../data/dialogue.js';

export default function CharacterArea({ game }) {
  const [dialogue, setDialogue] = useState(0);
  const lines = dialogueLines(game.stats);
  const next = () => setDialogue(old => old + 1);

  return (
    <div className="character-area">
      <button className="speech-bubble" onClick={next} title="다른 혼잣말 듣기">
        <span>···</span>{lines[dialogue % lines.length]}
      </button>
      <button className="character-button" onClick={next} aria-label={`${game.name}의 혼잣말 듣기`}>
        <img src={characterImage(game.character)} alt={`${game.name} ${characterLabel(game.character)} 캐릭터`} />
      </button>
      <span className="character-name"><span /> {game.name} <small>고3 · 2학기</small></span>
    </div>
  );
}
