import { yearReport } from '../../domain/year-report.js';
import { Delta } from './ui.jsx';
import './year-report.css';
export default function YearReportPanel({ state }) {
  const report = yearReport(state);
  return (
    <section className="year-report">
      <h3>
        {state.name}의 {report.weeks}주
      </h3>
      <div className="year-report-summary">
        {report.terms.map(({ term, gpa }) => (
          <div key={term}>
            <small>{term}학기 학점</small>
            <b>{gpa === null ? '—' : gpa.toFixed(2)}</b>
            <span>/ 4.30</span>
          </div>
        ))}
        <div>
          <small>과제 완료</small>
          <b>{report.tasks.completed}</b>
          <span>
            마감 {report.tasks.expired} · 진행 중 {report.tasks.active}
          </span>
        </div>
      </div>
      <h4>능력치 변화</h4>
      <table>
        <thead>
          <tr>
            <th>능력치</th>
            <th>시작</th>
            <th>현재</th>
            <th>변화</th>
          </tr>
        </thead>
        <tbody>
          {report.stats.map((stat) => (
            <tr key={stat.id}>
              <th>{stat.name}</th>
              <td>{stat.start}</td>
              <td>{Math.round(stat.end * 10) / 10}</td>
              <td>
                <Delta value={stat.delta} stat={stat.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>내가 보낸 시간</h4>
      {report.activities.length ? (
        <div className="year-activity-bars">
          {report.activities.map((activity) => (
            <div key={activity.id}>
              <span>{activity.name}</span>
              <i style={{ width: `${(activity.count / (report.weeks * 21)) * 100}%` }} />
              <b>{activity.count}칸</b>
            </div>
          ))}
        </div>
      ) : (
        <p>아직 진행한 주가 없습니다.</p>
      )}
      <h4>주요 기록</h4>
      <ul>
        {report.milestones.map((task) => (
          <li key={task.id}>
            <span>{task.name}</span>
            <b>
              {
                {
                  completed: '완료',
                  expired: '마감 지남',
                  active: '진행 중',
                  unavailable: '미진행',
                }[task.status]
              }
              {task.target ? ` · ${task.progress}/${task.target}` : ''}
            </b>
          </li>
        ))}
        <li>
          <span>외부대회 수상</span>
          <b>{state.awards}회</b>
        </li>
        <li>
          <span>면접</span>
          <b>
            {state.minigames.interview?.phase === 'finished' || state.interviewScore > 0
              ? `${state.interviewScore}점`
              : '미응시'}
          </b>
        </li>
        <li>
          <span>잔액</span>
          <b>{state.money.toLocaleString()}원</b>
        </li>
      </ul>
      <h4>합격 결과</h4>
      {report.accepted.length ? (
        <ul>
          {report.accepted.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : (
        <p>합격한 전형이 없습니다.</p>
      )}
    </section>
  );
}
