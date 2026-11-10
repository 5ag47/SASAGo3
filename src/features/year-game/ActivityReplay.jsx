import { characterImage } from '../../assets.js';
import { useEffect, useState } from 'react';
import { DAYS, STATS } from '../../domain/catalog.js';
import { ActivityIcon, activityName, Delta, SESSIONS } from './ui.jsx';
export default function ActivityReplay({ actions = [], character = 'boy' }) {
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || index >= actions.length - 1) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 450);
    return () => clearTimeout(timer);
  }, [playing, index, actions.length]);
  const a = actions[index];
  if (!a) return null;
  return (
    <section className="activity-replay" aria-label="일정별 활동 재생">
      <div className={`activity-animation activity-${a.activity}`} key={index}>
        <img src={characterImage(character)} alt="" />
        <ActivityIcon id={a.activity} size={32} />
      </div>
      <div>
        <small>
          {DAYS[Math.floor(a.index / 3)]} · {a.night ? '연장 자습' : SESSIONS[a.index % 3]}
        </small>
        <h3>{activityName(a.activity)}</h3>
        <p>
          {Object.entries(a.delta ?? {})
            .filter(
              ([k, v]) =>
                ['hp', 'focus', 'reputation', 'stress', 'math', 'science'].includes(k) && v !== 0,
            )
            .map(([k, v]) => (
              <span key={k}>
                {STATS[k].name} <Delta value={v} stat={k} />{' '}
              </span>
            ))}
        </p>
      </div>
      <button onClick={() => setPlaying((v) => !v)}>{playing ? '일시정지' : '재생'}</button>
      <button
        onClick={() => {
          setIndex(actions.length - 1);
          setPlaying(false);
        }}
      >
        넘기기
      </button>
      <input
        type="range"
        min="0"
        max={actions.length - 1}
        value={index}
        aria-label="활동 기록 시점"
        onChange={(e) => {
          setIndex(Number(e.target.value));
          setPlaying(false);
        }}
      />
    </section>
  );
}
