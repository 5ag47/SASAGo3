import { GraduationCap } from 'lucide-react';
import { gpa, admissionScore } from '../../domain/grades.js';
import { endingAvailable, ENDINGS } from '../../domain/engine.js';
import { ChoiceButton, Empty, Progress } from './ui.jsx';
import { resources } from '../../domain/catalog.js';

export function AdmissionsPanel({ state, busy, onEnding }) {
  const finished = state.week > 40;
  return (
    <>
      <div className="grade-summary">
        <span>
          <GraduationCap size={26} />
          입시 준비도
        </span>
        <b>
          {admissionScore(state)}
          <small> / 100 준비도</small>
        </b>
      </div>
      <p className="dialog-lead">
        게임 속 가상 전형이에요. 종합 준비도: 학점 30% · 실력 30% · 연구 10% · 자소서 10% · 추천서
        8% · 면접 12%.
      </p>
      <div className="admission-milestones">
        {[
          ['졸업논문', state.tasks.thesis],
          ['자기소개서', state.tasks.essay],
          ['원서 제출', state.tasks.application_form],
        ].map(([label, task]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{task ? `${Math.round((task.progress / task.target) * 100)}%` : '예정'}</b>
            <Progress value={task?.progress ?? 0} max={task?.target ?? 1} label={label} />
          </div>
        ))}
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
              <span className={a.accepted ? 'accepted' : 'rejected'}>
                {a.accepted ? '합격' : '불합격'}
              </span>
              <div>
                <h3>{a.name}</h3>
                <p>{a.reason}</p>
              </div>
              <b>{a.score}점</b>
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
