import { ITEMS } from '../data/items.js';
export function buyItem(game, id) {
  const item = ITEMS.find(entry => entry.id === id);
  if (!item || game.money < item.price || (game.inventory[id] || 0) >= 99) return game;
  return {
    ...game,
    money: game.money - item.price,
    inventory: {
      ...game.inventory,
      [id]: (game.inventory[id] || 0) + 1
    }
  };
}
export function useItem(game, id) {
  const item = ITEMS.find(entry => entry.id === id);
  if (!item || !game.inventory[id]) return game;
  const stats = {
    ...game.stats
  };
  for (const [key, amount] of Object.entries(item.effect)) stats[key] = Math.min(100, Math.max(0, stats[key] + amount));
  return {
    ...game,
    stats,
    inventory: {
      ...game.inventory,
      [id]: game.inventory[id] - 1
    }
  };
}
