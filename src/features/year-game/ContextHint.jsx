import { useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
export default function ContextHint({ state, onTry }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || state.week !== 0 || state.flags.editedSchedule) return null;
  return (
    <aside className="context-hint">
      <button
        className="hint-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="자습 안내 닫기"
      >
        <X size={12} />
      </button>
      <b>첫 자습: 수학 공부 1칸</b>
      <span>아래 시간 칸을 눌러 활동을 골라보세요.</span>
    </aside>
  );
}
