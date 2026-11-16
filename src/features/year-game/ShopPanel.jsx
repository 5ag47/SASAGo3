import { BookOpen, Coffee, Cookie, Milk, Pill, ShoppingBag } from 'lucide-react';
import { effectText, items } from '../../domain/catalog.js';
const ICONS = { book: BookOpen, coffee: Coffee, cookie: Cookie, milk: Milk, pill: Pill };
export default function ShopPanel({ state, busy, onBuy }) {
  return (
    <>
      <div className="shop-wallet">
        <span>
          <ShoppingBag size={18} /> 쉬는 시간, 매점 들르기
        </span>
        <b>
          {state.money.toLocaleString()}
          <small> 원</small>
        </b>
      </div>
      <p className="dialog-lead">
        구매하면 바로 사용해요. 부족한 체력과 스트레스를 살펴보고 골라 주세요.
      </p>
      <div className="shop-list">
        {Object.entries(items).map(([id, item]) => {
          const Icon = ICONS[item.icon];
          return (
            <article key={id}>
              <span className={`shop-icon ${item.icon}`}>
                <Icon size={25} strokeWidth={1.5} />
              </span>
              <div>
                <h3>{item.name}</h3>
                <small>{effectText(item.effect)}</small>
              </div>
              <button
                disabled={busy || state.money < item.price || Boolean(state.ending)}
                onClick={() => onBuy(id)}
              >
                {item.price.toLocaleString()}원<span>구매·사용</span>
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
