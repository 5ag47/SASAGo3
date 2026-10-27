import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { TUTORIAL_LESSONS } from './tutorial.js';
export default function TutorialPanel({ tutorial, state, onLesson }) {
  const [selected, setSelected] = useState(() =>
    TUTORIAL_LESSONS.some((l) => l.id === tutorial.active)
      ? tutorial.active
      : (TUTORIAL_LESSONS.find((l) => !tutorial.completed[l.id])?.id ?? 'profile'),
  );
  const lesson = TUTORIAL_LESSONS.find((l) => l.id === selected);
  const courseNext =
    lesson.id === 'profile' &&
    tutorial.visited.includes('stats') &&
    !tutorial.visited.includes('courses');
  const target = courseNext
    ? 'courses'
    : lesson.id === 'results' && state.week > 0
      ? 'records'
      : lesson.target;
  const action = courseNext
    ? '수강 과목 보기'
    : lesson.id === 'results' && state.week > 0
      ? '주간 기록 보기'
      : lesson.action;
  return (
    <div className="tutorial-course">
      <div className="tutorial-course-heading">
        <h3>{state.week === 0 ? '겨울방학 연습 주간' : '게임 도움말'}</h3>
        <span>
          {tutorial.count} / {tutorial.total}
        </span>
      </div>
      {state.week === 0 && (
        <p className="tutorial-intro">
          새 학기를 앞두고 기숙사에 돌아왔다. 이번 주는 공부와 과제, 쉬는 시간을 직접 정해 본다.
        </p>
      )}
      <div className="tutorial-workbook">
        <nav aria-label="튜토리얼 단원">
          {TUTORIAL_LESSONS.map((item) => (
            <button
              key={item.id}
              className={`${item.id === selected ? 'selected' : ''} ${tutorial.completed[item.id] ? 'complete' : ''}`}
              aria-pressed={item.id === selected}
              onClick={() => setSelected(item.id)}
            >
              <span className="lesson-complete">
                {tutorial.completed[item.id] && <Check size={12} />}
              </span>
              {item.title}
            </button>
          ))}
        </nav>
        <section className="lesson-content">
          <h4>{lesson.title}</h4>
          <p>{lesson.description}</p>
          <div className="lesson-practice">
            <b>직접 해보기</b>
            <p>{lesson.practice}</p>
          </div>
          <button className="primary full" onClick={() => onLesson({ ...lesson, target })}>
            직접 찾아보기
            <ChevronRight size={15} />
          </button>
        </section>
      </div>
    </div>
  );
}
