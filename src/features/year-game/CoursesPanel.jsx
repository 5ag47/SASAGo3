import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { courses, MAJORS, period, STATS, ELECTIVES } from '../../domain/catalog.js';
import { courseGrades, gpa, examBaseScore } from '../../domain/grades.js';
import { courseMastery } from '../../domain/course-progress.js';
import { courseSet, secondSemesterCourses } from '../../domain/enrollment.js';
import './enrollment.css';
import './academic.css';

export function CoursesPanel({ state }) {
  const [term, setTerm] = useState(state.week >= 25 ? 2 : 1);
  const grades = courseGrades(state, term);
  const selectedElectives =
    term === 1
      ? state.week >= 25
        ? ELECTIVES.filter((id) => grades.some((grade) => grade.id === id))
        : state.electives
      : state.electives;
  const relevant =
    term === (state.week >= 25 ? 2 : 1)
      ? state.courses
      : term === 2 && state.week < 25
        ? secondSemesterCourses(state.major, selectedElectives)
        : [];
  const rows = [...new Set([...grades.map((grade) => grade.id), ...relevant])].map(
    (id) => grades.find((grade) => grade.id === id) ?? { id, ...courses[id], score: null },
  );
  return (
    <>
      <div className="grade-summary">
        <span>
          <GraduationCap size={25} />
          {MAJORS[state.major].name} 전공
        </span>
        <b>
          {gpa(state, term).toFixed(2)}
          <small> / 4.30</small>
        </b>
      </div>
      <p>
        이전 학점 {state.campaign.priorGpa.toFixed(2)} / 4.30
        {state.campaign.rank ? ` · 1학기 석차 ${state.campaign.rank} / 90` : ''}
      </p>
      <div className="filter-tabs">
        {[1, 2].map((t) => (
          <button key={t} className={term === t ? 'selected' : ''} onClick={() => setTerm(t)}>
            {t}학기 성적
          </button>
        ))}
      </div>
      <p className="dialog-lead">
        퀴즈 20% · 중간 30% · 기말 30% · 수행 20%. 아직 치르지 않은 평가를 제외한 성적은 ‘잠정’으로
        표시해요.
      </p>
      <div className="course-table">
        <div className="table-head">
          <span>과목 / 학점</span>
          <span>점수</span>
          <span>등급</span>
        </div>
        {rows.map((c) => (
          <div key={c.id}>
            <span>
              <b>{c.name}</b>
              <small>
                {c.credits}학점 · {STATS[c.ability].name}
                {c.provisional ? ' · 잠정' : ''}
              </small>
            </span>
            <span>{c.score ?? '—'}</span>
            <b>{c.letter ?? '—'}</b>
          </div>
        ))}
      </div>
      <details className="course-mark-details">
        <summary>평가별 점수 보기</summary>
        {grades.map((grade) => (
          <section key={grade.id}>
            <h3>{grade.name}</h3>
            {grade.marks.map((mark) => (
              <p key={mark.id}>
                {period(mark.week).label} ·{' '}
                {{ quiz: '퀴즈', midterm: '중간', final: '기말', project: '수행' }[mark.kind]}{' '}
                <b>{mark.score}점</b>
              </p>
            ))}
          </section>
        ))}
      </details>
    </>
  );
}
