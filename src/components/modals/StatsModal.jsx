import { characterImage } from '../../assets.js';
import { dateLabel } from '../../game.js';
import { HP_LIMIT, STRESS_LIMIT } from '../../systems/week.js';
import StatBars from '../StatBars.jsx';

export default function StatsModal({ game }) {
  return (
    <>
      <div className="student-summary">
        <img src={characterImage(game.character)} alt="" />
        <div>
          <span className="eyebrow">세종과학예술영재학교</span>
          <h3>{game.name} <small>3학년</small></h3>
          <p>{dateLabel(game.week)}</p>
        </div>
      </div>
      <StatBars stats={game.stats} all />
      <p className="info-note">
        스트레스가 {STRESS_LIMIT} 이상이거나 건강이 {HP_LIMIT} 미만이면 학습 능력치가 덜 오릅니다.
        집중력이 높을수록 더 많이 오릅니다.
      </p>
    </>
  );
}
