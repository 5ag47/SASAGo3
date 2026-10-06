import { ArrowRight, Backpack } from 'lucide-react';

export default function BagModal({ onOpenShop }) {
  return (
    <div className="empty-state">
      <Backpack size={40} />
      <h3>가방이 비어 있어요</h3>
      <p>아직 가지고 있는 아이템이 없어요.</p>
      <button className="secondary" onClick={onOpenShop}>매점 보기 <ArrowRight size={16} /></button>
    </div>
  );
}
