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
    <p className="modal-description">수학은 공통 과목, 주요선택1은 내가 고르는 탐구 과목이에요.</p>
    <div className="course-fixed"><b>공통 · 수학</b><span className="soft-tag">필수</span></div>
    <fieldset className="course-options" disabled={game.week > 0}><legend>주요선택1</legend>{COURSES.map(course => <label key={course} className={major === course ? 'selected' : ''}>
      <input type="radio" name="major" checked={major === course} onChange={() => setMajor(course)} /><span>{course}</span>
    </label>)}</fieldset>
    <p className="info-note">선택 과목의 성장 속도는 같아요. 첫 주 시작 전까지 변경할 수 있어요. 서술·구술은 보류 중이라 수강신청에서 제외했어요.</p>
    <button className="primary full-width">{game.week > 0 ? '확인' : '수강신청 완료'}</button>
  </form>;
}
