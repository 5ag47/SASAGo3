import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  activities,
  activeTasks,
  courses,
  DAYS,
  effectText,
  TEACHERS,
} from '../../domain/catalog.js';
import { activityPreview } from '../../domain/activity-preview.js';
import { courseMastery } from '../../domain/course-progress.js';
import { activityLock } from '../../domain/senior-year.js';
import { ActivityIcon, activityName, SESSIONS } from './ui.jsx';

export default function ActivityPicker({ state, index, busy, onApply }) {
  const [activity, setActivity] = useState(state.plan[index].activity);
  const [target, setTarget] = useState(state.plan[index].target);
  const [category, setCategory] = useState('전체');
  const morning = index % 3 === 0;
  const tasks = activeTasks(state).filter((task) => task.special !== 'tutorial');
  const definition = activities[activity];
  const preview = activityPreview(state, activity, target);
  function select(id) {
    setActivity(id);
    setTarget(
      id === 'study'
        ? state.courses[0]
        : id === 'task'
          ? (tasks[0]?.id ?? null)
          : id === 'teacher'
            ? 'homeroom'
            : null,
    );
  }
  function disabled(id) {
    return (
      (morning && !['study', 'skip'].includes(id)) ||
      (!morning && ['skip', 'field_trip'].includes(id)) ||
      (id === 'task' && !tasks.length) ||
      (id === 'research' && state.tasks.thesis?.status !== 'active') ||
      (id === 'essay' && state.tasks.essay?.status !== 'active') ||
      (id === 'study_group' && !state.group && !state.studyApplication) ||
      Boolean(activityLock(state, id))
    );
  }
  return (
    <div className="activity-picker">
      <p className="dialog-lead">
        {DAYS[Math.floor(index / 3)]}요일 · {SESSIONS[index % 3]}에 무엇을 할까요?
      </p>
      <div className="quick-activities">
        {[
          ['study', '수학 공부'],
          ['game', '놀기'],
          ['sleep', '호실'],
        ]
          .filter(([id]) => !morning || id === 'study')
          .map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                select(id);
                if (id === 'study')
                  setTarget(
                    state.courses.find((c) => courses[c].ability === 'math') ?? state.courses[0],
                  );
              }}
              className={
                activity === id && (id !== 'study' || courses[target]?.ability === 'math')
                  ? 'selected'
                  : ''
              }
            >
              <ActivityIcon id={id} size={21} />
              {label}
            </button>
          ))}
      </div>
      {morning && <p>아침은 과목 공부 또는 불참여를 선택하세요.</p>}
      <div className="filter-tabs">
        {['전체', '학습', '함께', '진로', '생활', '회복'].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={category === c ? 'selected' : ''}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="activity-grid">
        {Object.entries(activities)
          .filter(
            ([id, a]) =>
              (!morning || ['study', 'skip'].includes(id)) &&
              !['field_trip'].includes(id) &&
              (morning || id !== 'skip') &&
              (category === '전체' || a.category === category),
          )
          .map(([id, a]) => (
            <button
              key={id}
              onClick={() => select(id)}
              disabled={disabled(id)}
              className={`${a.color} ${activity === id ? 'selected' : ''}`}
              aria-pressed={activity === id}
              title={
                activityLock(state, id) ||
                (disabled(id) ? '관련 과제 또는 스터디를 먼저 시작하세요.' : a.description)
              }
            >
              <ActivityIcon id={id} />
              <span>{activityName(id)}</span>
              {activity === id && <Check size={13} />}
            </button>
          ))}
      </div>
      {['study', 'task', 'teacher'].includes(activity) && (
        <label className="target-select">
          {activity === 'study'
            ? '공부할 과목'
            : activity === 'task'
              ? '진행할 할 일'
              : '상담 선생님'}
          <select value={target ?? ''} onChange={(e) => setTarget(e.target.value)}>
            {activity === 'study'
              ? state.courses.map((id) => (
                  <option key={id} value={id}>
                    {courses[id].name} · 이해도 {Math.round(courseMastery(state, id))}
                  </option>
                ))
              : activity === 'task'
                ? tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.progress}/{t.target})
                    </option>
                  ))
                : Object.entries(TEACHERS).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name} · 친밀도 {state.teachers[id]}
                    </option>
                  ))}
          </select>
        </label>
      )}
      <details className="activity-detail">
        <summary>효과·비용 보기</summary>
        <p>
          {effectText(preview.effects)}
          {preview.courseGain !== null ? ` · 과목 이해도 +${preview.courseGain}` : ''}
          {definition.cost ? ` · ${definition.cost.toLocaleString()}원` : ''}
          {definition.income ? ` · 용돈 +${definition.income.toLocaleString()}원` : ''}
        </p>
        <small>현재 상태 기준 예상값 · 주중 상태·반복·학습 환경에 따라 달라집니다.</small>
      </details>
      <button
        className="primary full"
        disabled={
          busy || disabled(activity) || (['study', 'task', 'teacher'].includes(activity) && !target)
        }
        onClick={() => onApply(activity, target)}
      >
        신청 <ArrowRight size={16} />
      </button>
    </div>
  );
}
