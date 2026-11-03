import { schoolRecord } from '../../domain/school-record.js';
import { courses, period } from '../../domain/catalog.js';
const names = {
  coursework: '교과 활동',
  exploration: '탐구 활동',
  participation: '동아리·협업',
  continuity: '지속성',
};
export default function SchoolRecordPanel({ state }) {
  const record = schoolRecord(state);
  const evidence = {
    coursework: `${record.completed}건`,
    exploration: `${record.explorationCount}건`,
    participation: `${record.community}칸`,
    continuity: `${record.activeWeeks}주`,
  };
  return (
    <details className="school-record-panel">
      <summary>학교생활기록 보기 · 교과 활동 {record.completed}건</summary>
      <div className="record-scores">
        {Object.entries(evidence).map(([id, value]) => (
          <div key={id}>
            <span>{names[id]}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <p>
        동아리·협업 {record.community}칸 · 벌점 {state.discipline}점
      </p>
      {record.entries.length ? (
        <table>
          <thead>
            <tr>
              <th>활동</th>
              <th>과목</th>
              <th>완료</th>
              <th>품질</th>
            </tr>
          </thead>
          <tbody>
            {record.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.name}</td>
                <td>{courses[entry.course].short}</td>
                <td>{period(entry.week).name}</td>
                <td>{entry.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>완료한 교과 활동이 쌓이면 여기에 기록됩니다.</p>
      )}
    </details>
  );
}
