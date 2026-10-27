import { Backpack } from 'lucide-react';
import { ITEMS } from '../../data/items.js';
import { formatEffect } from '../../data/stats.js';
export default function BagModal({
  game,
  onUse,
  onOpenShop
}) {
  const items = ITEMS.filter(item => game.inventory[item.id] > 0);
  return <>{items.length === 0 ? <div className="empty-state"><Backpack size={40} /><h3>가방이 비어 있어요</h3><p>매점에서 간식과 학습 아이템을 구입해보세요.</p></div> : <div className="shop-items">{items.map(item => <div className="shop-item" key={item.id}><span className="item-emoji">{item.emoji}</span><div><h3>{item.name} × {game.inventory[item.id]}</h3><p>{formatEffect(item.effect)}</p></div><button className="secondary" onClick={() => onUse(item.id)}>사용</button></div>)}</div>}
    <button className="primary full-width" onClick={onOpenShop}>매점 가기</button><p className="info-note">아이템은 한 번 사용하면 사라져요. 능력치의 범위는 0~100이에요.</p>
  </>;
}
