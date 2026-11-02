import StatBars from '../StatBars.jsx';
export default function StatsModal({
  game
}) {
  return <StatBars stats={game.stats} major={game.major} all />;
}
