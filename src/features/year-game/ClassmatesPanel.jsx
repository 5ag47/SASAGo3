import { Users } from 'lucide-react';
import { applicationBoard, classmateList, classmateResults } from '../../domain/classmates.js';

// Friends, the school's application board and their results. All content is data/classmates.json.
export default function ClassmatesPanel({ state }) {
  const board = applicationBoard(state);
  const results = classmateResults(state);
  return (
    <>
      {results ? (
        <>
          <h3 className="section-label">동기들의 결과</h3>
          <ul className="classmate-results">
            {results.map((mate) => (
              <li key={mate.id}>
                <b>
                  {mate.name} <small>{mate.relation}</small>
                </b>
                <span className={mate.accepted ? 'accepted' : 'rejected'}>
                  {mate.accepted ? '합격' : '다음 길'}
                </span>
                <p>{mate.text}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {board && (
        <>
          <h3 className="section-label">교내 원서 현황</h3>
          <table className="application-board">
            <thead>
              <tr>
                <th>전형</th>
                <th>우리 학교</th>
                <th>아는 친구</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row) => (
                <tr key={row.id} className={row.you ? 'mine' : ''}>
                  <td>
                    {row.label}
                    {row.you && <small> · 나도 지원</small>}
                  </td>
                  <td>{row.total}명</td>
                  <td>{row.mates.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {!results && (
        <>
          <h3 className="section-label">
            <Users size={13} /> 같이 준비하는 친구들
          </h3>
          <ul className="classmate-list">
            {classmateList().map((mate) => (
              <li key={mate.id}>
                <b>
                  {mate.name}{' '}
                  <small>
                    {mate.relation} · {mate.major}
                  </small>
                </b>
                <p>{mate.profile}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
