import { GraduationCap } from 'lucide-react';
import { gpa } from '../../domain/grades.js';
import { admissionProjection, admissionThreshold } from '../../domain/admissions.js';
import {
  admissionDefinitions,
  ADMISSION_DIRECTIONS,
  schoolRecord,
} from '../../domain/school-record.js';
import { endingAvailable, ENDINGS } from '../../domain/engine.js';
import { ChoiceButton, Empty, Progress } from './ui.jsx';
import { resources, events, period } from '../../domain/catalog.js';
import SchoolRecordPanel from './SchoolRecordPanel.jsx';
import RecommendationPanel from './RecommendationPanel.jsx';
import './admissions.css';

export function AdmissionsPanel({ state, busy, onEnding, onDirection, onSchedule }) {
  const finished = state.week > 40;
  return (
    <>
      <div className="grade-summary">
        <span>
          <GraduationCap size={26} />
          1학기 학점
        </span>
        <b>
          {gpa(state).toFixed(2)}
          <small> / 4.30</small>
        </b>
      </div>
      <div className="record-summary">
        <b>
          학교생활기록 · 교과 활동{' '}
          {state.documents?.recordCounts?.coursework ?? schoolRecord(state).completed}건
        </b>
        <span>
          {state.documents ? `${period(state.documents.week).label} 제출` : '현재까지의 활동'}
        </span>
      </div>
      <SchoolRecordPanel state={state} />
      <RecommendationPanel state={state} onSchedule={onSchedule} />
      <div className="admission-milestones">
        {[
          ['자기소개서', state.tasks.essay],
          ['서류 점검', state.tasks.application_form],
        ].map(([label, task]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{task ? `${Math.round((task.progress / task.target) * 100)}%` : '예정'}</b>
            <Progress value={task?.progress ?? 0} max={task?.target ?? 1} label={label} />
          </div>
        ))}
      </div>
      <p className="submission-state">
        {state.documents
          ? '원서 제출 완료'
          : '자소서·서류 점검·지원 방향을 모두 준비하면 제출됩니다.'}
      </p>
      {!state.documents && state.recommendation && state.recommendation.status !== 'ready' && (
        <p className="submission-state">추천서 준비 중</p>
      )}
      <h3 className="section-label">지원 방향</h3>
      <div className="admission-directions">
        {Object.entries(ADMISSION_DIRECTIONS).map(([id, direction]) => (
          <button
            key={id}
            aria-pressed={(state.documents?.direction ?? state.flags.target) === id}
            disabled={
              busy || !onDirection || state.week < 25 || state.week > 28 || Boolean(state.documents)
            }
            onClick={() => onDirection(id)}
          >
            {direction.name}
          </button>
        ))}
      </div>
      {!state.documents && state.week >= 25 && state.week <= 28 && (
        <small>제출 전 변경 가능 · 다시 정하면 스트레스 +2</small>
      )}
      <div className="route-comparison">
        {Object.entries(admissionDefinitions)
          .filter(([, item]) => item.kind === 'route')
          .map(([id]) => {
            const event = Object.values(events).find((event) => event.profile === id),
              projection = admissionProjection(state, id);
            return (
              <article key={id}>
                <h3>{event.name}</h3>
                <p>
                  준비 {projection.score} · 기준 {admissionThreshold(event)}
                </p>
                <span>
                  {projection.applied ? '현재 지원 방향에 포함' : '현재 지원 방향에 미포함'}
                </span>
                <details>
                  <summary>평가 항목</summary>
                  <table>
                    <tbody>
                      {projection.contributions.map((part) => (
                        <tr key={part.id}>
                          <th>{part.name}</th>
                          <td>{Math.round(part.weight * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <small>
                    게임용 평가 · 실전 변동 ±6점 · 서류는 제출 시점의 기록으로 평가합니다.
                  </small>
                </details>
              </article>
            );
          })}
      </div>
      <h3 className="section-label">전형 결과</h3>
      {Object.entries(resources)
        .filter(([, resource]) => resource.path)
        .map(([id, resource]) => (
          <a
            className="subtle"
            key={id}
            href={resource.path}
            target="_blank"
            rel="noopener noreferrer"
          >
            {resource.name} PDF 열기
          </a>
        ))}
      {state.admissions.length ? (
        <div className="admission-results">
          {state.admissions.map((a) => (
            <article key={`${a.name}-${a.week}`}>
              <span
                className={
                  a.applied === false ? 'not-applied' : a.accepted ? 'accepted' : 'rejected'
                }
              >
                {a.applied === false ? '미지원' : a.accepted ? '합격' : '불합격'}
              </span>
              <div>
                <h3>{a.name}</h3>
                <p>{a.reason}</p>
              </div>
              <b>{a.applied === false ? '—' : `${a.score}점`}</b>
            </article>
          ))}
        </div>
      ) : (
        <Empty>10월부터 전형 결과를 확인할 수 있습니다.</Empty>
      )}
      <div className="info-box">
        외부대회 수상 {state.awards}회 · 면접 {state.interviewScore}점 · 벌점 {state.discipline}점
        <br />
        1학기 학점 {gpa(state).toFixed(2)} / 4.30 · 종합 지원{' '}
        {{ dream: '상향', balanced: '균형', safe: '안정' }[state.flags.target]}
      </div>
      {finished && (
        <>
          <h3 className="section-label">다음 길을 선택하세요</h3>
          {Object.entries(ENDINGS)
            .filter(([id]) => id !== 'leave')
            .map(([id, ending]) => (
              <ChoiceButton
                key={id}
                title={ending.title}
                description={
                  endingAvailable(state, id)
                    ? ending.subtitle
                    : id === 'university'
                      ? '전형 합격이 필요해요.'
                      : id === 'startup'
                        ? '과학 55·평판 40 이상이 필요해요.'
                        : id === 'prison'
                          ? '위험한 편법·반복된 규칙 위반 시 등장해요.'
                          : '현재 선택할 수 없어요.'
                }
                disabled={busy || !endingAvailable(state, id)}
                onClick={() => onEnding(id)}
              />
            ))}
        </>
      )}
    </>
  );
}
