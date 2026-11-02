import { Wallet } from 'lucide-react';
import { ITEMS } from '../../data/items.js';
export default function ShopModal({
  game,
  onBuy,
  onOpenBag
}) {
  return <><div className="shop-balance"><span><Wallet size={16} /> 나의 용돈</span><b>{game.money.toLocaleString('ko-KR')}원</b></div>
    <div className="shop-items">{ITEMS.map(item => <div className="shop-item" key={item.id}>
      <span className="item-emoji">{item.emoji}</span><div><h3>{item.name}</h3><b>{item.price.toLocaleString('ko-KR')}원 · 보유 {game.inventory[item.id] || 0}개</b></div>
      <button className="secondary" disabled={game.money < item.price || (game.inventory[item.id] || 0) >= 99} onClick={() => onBuy(item.id)}>{game.money < item.price ? '잔액 부족' : (game.inventory[item.id] || 0) >= 99 ? '보유 한도' : '구매'}</button>
    </div>)}</div>
    <button className="primary full-width" onClick={onOpenBag}>가방에서 아이템 사용하기</button>
  </>;
}
