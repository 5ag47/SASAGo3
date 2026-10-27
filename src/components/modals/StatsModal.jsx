import { characterImage } from '../../assets.js';
import { dateLabel } from '../../game.js';
import { studyEfficiency } from '../../systems/week.js';
import StatBars from '../StatBars.jsx';
export default function StatsModal({
  game
}) {
  return <><div className="student-summary"><img src={characterImage(game.character)} alt="" /><div><span className="eyebrow">세종과학예술영재학교</span><h3>{game.name} <small>3학년</small></h3><p>{dateLabel(game.week)} · 주요선택1 {game.major}</p></div></div>
    <div className="efficiency large"><span>현재 학습 능률</span><b>{Math.round(studyEfficiency(game.stats).value * 100)}%</b></div>
    <StatBars stats={game.stats} major={game.major} all />
    <p className="info-note">능률은 신체와 멘탈을 함께 반영해요. 스트레스 70 이상, 신체 30 미만이면 각각 20% 감소해요. 실제 학습량은 반복 횟수와 하루별 컨디션에 따라 달라져요.</p>
    <p className="muted">서술·구술 능력치는 보류 중이에요.</p></>;
}
