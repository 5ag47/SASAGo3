import { random } from './random.js';

export const CARD_ROUNDS = 8;
const DECK = Array.from({ length: 48 }, (_, id) => id);
export const cardMonth = (id) => Math.floor(id / 4) + 1;
export const cardScore = (cards) => cards.length / 2;

// Only revealed cards are stored. Each draw samples the remaining pool using the
// current command's server seed; there is no future deck order in a public save.
function draw(state, game) {
  const seen = new Set([...game.hand, ...game.table, ...game.mine, ...game.friend]);
  const pool = DECK.filter((id) => !seen.has(id));
  return pool[Math.floor(random(state) * pool.length)];
}
export function createCardGame(state) {
  const game = {
    hand: [],
    table: [],
    mine: [],
    friend: [],
    turn: 0,
    go: 0,
    lastGoScore: 0,
    phase: 'play',
    result: null,
    reason: null,
    log: [],
  };
  for (let i = 0; i < 8; i++) game.table.push(draw(state, game));
  for (let i = 0; i < 3; i++) game.hand.push(draw(state, game));
  return game;
}
function collect(game, card, owner) {
  const match = game.table.findIndex((id) => cardMonth(id) === cardMonth(card));
  if (match < 0) {
    game.table.push(card);
    return false;
  }
  game[owner].push(card, game.table.splice(match, 1)[0]);
  return true;
}
function finish(game, reason) {
  game.phase = 'finished';
  game.reason = reason;
  const mine = cardScore(game.mine) + game.go;
  const friend = cardScore(game.friend);
  game.result =
    reason === 'friend' ? 'lost' : mine > friend ? 'won' : mine < friend ? 'lost' : 'draw';
}
export function cardOptions(game) {
  if (!game) return [];
  if (game.phase === 'decision')
    return [
      { id: 'stop', label: '스톱' },
      { id: 'go', label: '고' },
    ];
  if (game.phase !== 'play') return [];
  return game.hand.map((id) => ({ id: `card:${id}`, label: `${cardMonth(id)}월 패 내기` }));
}
export function playCardGame(state, game, option) {
  if (!cardOptions(game).some((candidate) => candidate.id === option))
    throw new Error('CARD_MOVE_INVALID');
  if (option === 'stop') {
    finish(game, 'stop');
    return;
  }
  if (option === 'go') {
    game.go++;
    game.lastGoScore = cardScore(game.mine);
    game.phase = 'play';
    game.log.unshift(`고 ${game.go}회 · 최종 점수 +${game.go}`);
    return;
  }
  const card = Number(option.slice(5));
  game.hand.splice(game.hand.indexOf(card), 1);
  const hit = collect(game, card, 'mine');
  const flipped = draw(state, game);
  const flippedHit = collect(game, flipped, 'mine');
  const friendCard = draw(state, game);
  const friendHit = collect(game, friendCard, 'friend');
  game.hand.push(draw(state, game));
  game.turn++;
  game.log.unshift(
    `${game.turn}턴 · ${cardMonth(card)}월 ${hit ? '짝 획득' : '내기'} · 뒤집은 ${cardMonth(flipped)}월 ${flippedHit ? '짝 획득' : '놓기'} · 친구 ${friendHit ? '짝 획득' : '놓기'}`,
  );
  if (cardScore(game.friend) >= 3) finish(game, 'friend');
  else if (game.turn >= CARD_ROUNDS) finish(game, 'rounds');
  else if (cardScore(game.mine) >= 3 && cardScore(game.mine) > game.lastGoScore)
    game.phase = 'decision';
}
export function validCardGame(game) {
  if (game === null) return true;
  if (!game || typeof game !== 'object') return false;
  const piles = [game.hand, game.table, game.mine, game.friend];
  if (
    piles.some(
      (pile) =>
        !Array.isArray(pile) || pile.some((id) => !Number.isInteger(id) || id < 0 || id > 47),
    )
  )
    return false;
  const cards = piles.flat();
  if (
    new Set(cards).size !== cards.length ||
    cards.length !== 11 + game.turn * 3 ||
    game.hand.length !== 3 ||
    game.mine.length % 2 ||
    game.friend.length % 2
  )
    return false;
  if (
    !Number.isInteger(game.turn) ||
    game.turn < 0 ||
    game.turn > CARD_ROUNDS ||
    !Number.isInteger(game.go) ||
    game.go < 0 ||
    game.go > game.turn ||
    !Number.isInteger(game.lastGoScore) ||
    game.lastGoScore < 0 ||
    game.lastGoScore > cardScore(game.mine)
  )
    return false;
  if (
    !['play', 'decision', 'finished', 'abandoned'].includes(game.phase) ||
    !Array.isArray(game.log) ||
    game.log.length > CARD_ROUNDS * 2 ||
    game.log.some((line) => typeof line !== 'string' || line.length > 200)
  )
    return false;
  if (game.phase === 'finished')
    return (
      ['won', 'lost', 'draw'].includes(game.result) &&
      ['stop', 'rounds', 'friend'].includes(game.reason)
    );
  if (game.phase === 'abandoned') return game.result === null && game.reason === 'deadline';
  return (
    game.result === null &&
    game.reason === null &&
    game.turn < CARD_ROUNDS &&
    (game.phase !== 'decision' || cardScore(game.mine) >= 3)
  );
}
