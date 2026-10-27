import { CARD_ROUNDS, cardMonth, cardScore } from '../../domain/card-game.js';
import './minigames.css';

const FLOWERS = ['松', '梅', '桜', '藤', '菖', '牡', '萩', '芒', '菊', '紅', '柳', '桐'];
function Card({ id, match, onPlay, disabled }) {
  const month = cardMonth(id);
  const content = (
    <>
      <span>{month}월</span>
      <i aria-hidden="true">{FLOWERS[month - 1]}</i>
      {match && <small>짝 있음</small>}
    </>
  );
  const className = `flower-card flower-${month % 4} ${match ? 'has-match' : ''}`;
  return onPlay ? (
    <button
      className={className}
      aria-label={`${month}월 패 내기${match ? ' · 짝 있음' : ''}`}
      onClick={onPlay}
      disabled={disabled}
    >
      {content}
    </button>
  ) : (
    <div className={className} aria-label={`${month}월 패`}>
      {content}
    </div>
  );
}
export default function CardGamePanel({ game, busy, onChoose, onDone }) {
  const complete = ['finished', 'abandoned'].includes(game.phase);
  const mine = cardScore(game.mine);
  const friend = cardScore(game.friend);
  const result = { won: '승리', lost: '패배', draw: '무승부' }[game.result];
  const reason = {
    stop: '스톱으로 마무리',
    rounds: `${CARD_ROUNDS}턴 종료`,
    friend: '친구가 먼저 3점 도달',
    deadline: '참여 기한 종료',
  }[game.reason];
  return (
    <section className="card-game">
      <span className="event-kicker">기숙사 고스톱 · 미니 규칙</span>
      <header className="card-scoreboard">
        <div>
          <small>나</small>
          <b>
            {mine}
            <em>점</em>
          </b>
          {game.go > 0 && <span>고 보너스 +{game.go}</span>}
        </div>
        <p>{complete ? reason : `${game.turn + 1} / ${CARD_ROUNDS}턴`}</p>
        <div>
          <small>친구</small>
          <b>
            {friend}
            <em>점</em>
          </b>
        </div>
      </header>
      {complete ? (
        <div className="card-result" role="status">
          <h3>{result ?? '판 종료'}</h3>
          <p>
            나 {mine + game.go}점 · 친구 {friend}점
          </p>
          <button className="primary full" onClick={onDone}>
            확인
          </button>
        </div>
      ) : (
        <>
          <div className="card-table" aria-label="바닥 패">
            {game.table.map((id) => (
              <Card key={id} id={id} />
            ))}
            {!game.table.length && <p>바닥 패 없음</p>}
          </div>
          {game.phase === 'decision' ? (
            <div className="card-decision">
              <h3>고, 스톱?</h3>
              <p>지금 멈추면 {mine + game.go}점입니다.</p>
              <div>
                <button className="primary" disabled={busy} onClick={() => onChoose('stop')}>
                  스톱 · 마무리
                </button>
                <button className="secondary" disabled={busy} onClick={() => onChoose('go')}>
                  고 · 보너스 +1
                </button>
              </div>
              <small>계속하다 친구가 3점에 도달하면 패배합니다.</small>
            </div>
          ) : (
            <>
              <h3 className="card-hand-title">
                낼 패를 고르세요 <small>같은 달끼리 모으면 1점</small>
              </h3>
              <div className="card-hand" aria-label="내 손패">
                {game.hand.map((id) => (
                  <Card
                    key={id}
                    id={id}
                    match={game.table.some((other) => cardMonth(other) === cardMonth(id))}
                    disabled={busy}
                    onPlay={() => onChoose(`card:${id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
      {game.log.length > 0 && (
        <ol className="card-move-log" aria-label="최근 카드 기록">
          {game.log.slice(0, 3).map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ol>
      )}
      <details className="card-rules">
        <summary>미니 규칙 보기</summary>
        <p>
          손패 한 장을 내고 한 장을 뒤집습니다. 같은 달의 패가 바닥에 있으면 두 장을 가져와 1점을
          얻습니다. 친구는 매 턴 한 장을 뒤집습니다. 손패는 세 장으로 보충됩니다.
        </p>
        <p>
          3점부터 새 점수를 얻을 때마다 고·스톱을 선택합니다. 고는 최종 점수에 1점을 더합니다.
          친구가 먼저 3점에 도달하면 친구가 이깁니다. 8턴이 끝나면 보너스를 포함한 점수를
          비교합니다.
        </p>
      </details>
    </section>
  );
}
