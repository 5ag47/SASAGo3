import { TEACHERS } from '../../domain/catalog.js';
import { Progress, StatList } from './ui.jsx';

export function StatsPanel({ state }) {
  return (
    <>
      <StatList
        stats={state.stats}
        keys={['hp', 'focus', 'reputation', 'stress', 'math', 'science']}
      />
      <p className="muted">집중력 = 건강 − 스트레스</p>
      <h3 className="section-label">선생님과의 관계</h3>
      {Object.entries(TEACHERS).map(([id, name]) => (
        <div className="teacher-line" key={id}>
          <span>
            {name}
            {state.flags.recommender === id && <small>추천서</small>}
          </span>
          <Progress value={state.teachers[id]} label={name} />
          <b>{state.teachers[id]}</b>
        </div>
      ))}
    </>
  );
}
