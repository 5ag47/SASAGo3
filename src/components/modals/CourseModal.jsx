import { useState } from 'react';
import { COURSES } from '../../data/courses.js';
export default function CourseModal({
  game,
  onEnroll
}) {
  const [major, setMajor] = useState(game.major);
  return <form onSubmit={e => {
    e.preventDefault();
    onEnroll(major);
  }}>
    <div className="course-fixed"><b>공통 · 수학</b><span className="soft-tag">필수</span></div>
    <fieldset className="course-options" disabled={game.week > 0}><legend>주요선택1</legend>{COURSES.map(course => <label key={course} className={major === course ? 'selected' : ''}>
      <input type="radio" name="major" checked={major === course} onChange={() => setMajor(course)} /><span>{course}</span>
    </label>)}</fieldset>
    <button className="primary full-width">{game.week > 0 ? '확인' : '수강신청 완료'}</button>
  </form>;
}
