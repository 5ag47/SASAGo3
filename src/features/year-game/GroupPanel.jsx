import { Users } from 'lucide-react';
import { GROUPS } from '../../domain/catalog.js';
import { ChoiceButton } from './ui.jsx';

export function GroupPanel({ state, onRecruit }) {
  return (
    <>
      <div className="group-intro">
        <Users size={35} />
        <h3>{state.group ? GROUPS[state.group].name : '가입한 스터디 없음'}</h3>
      </div>
      {!state.group && state.pending.includes('winter_study') && (
        <button className="primary full" onClick={onRecruit}>
          모집 공고 보기
        </button>
      )}
      <h3 className="section-label">스터디</h3>
      {Object.entries(GROUPS).map(([id, group]) => (
        <ChoiceButton
          key={id}
          title={group.name}
          description={
            id === 'friends'
              ? '스트레스 회복 · 수학 증가 없음'
              : id === 'focused'
                ? '수학·과학 증가 · 스트레스 증가'
                : '스트레스 회복 · 매력 증가'
          }
          selected={state.group === id}
          disabled
        />
      ))}
    </>
  );
}
