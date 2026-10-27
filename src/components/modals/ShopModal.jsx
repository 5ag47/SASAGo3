import { Wallet } from 'lucide-react';
import { ITEMS } from '../../data/items.js';

const won = value => value.toLocaleString('ko-KR');

export default function ShopModal({ money }) {
  return (
    <>
      <div className="shop-balance"><span><Wallet size={16} /> 나의 용돈</span><b>{won(money)}원</b></div>
      <div className="shop-items">
        {ITEMS.map(item => (
          <div className="shop-item" key={item.id}>
            <span className="item-emoji">{item.emoji}</span>
            <div><h3>{item.name}</h3><p>{item.desc}</p><b>{won(item.price)}원</b></div>
            <span className="soft-tag">준비 중</span>
          </div>
        ))}
      </div>
      <p className="info-note">구매와 아이템 사용은 아직 지원하지 않아요.</p>
    </>
  );
}
