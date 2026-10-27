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
      <button className="hint-try" onClick={onTry}>
        시간 골라보기 <ArrowUpRight size={13} />
      </button>
    </aside>
  );
}
