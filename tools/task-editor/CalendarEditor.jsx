import { useState } from 'react';
import { calendar, weekDate } from '../../src/domain/calendar-date.js';
import { CALENDAR_SOURCE_IDS } from '../../src/domain/calendar-entries.js';
import { buildCalendarPatch, applyCalendarPatch } from '../../src/domain/calendar-edits.js';
import { DAYS, courses } from '../../src/domain/catalog.js';

export default function CalendarEditor({ initial = calendar }) {
  const [catalog, setCatalog] = useState(() => structuredClone(initial));
  const [selected, setSelected] = useState(
    Object.keys(initial).find((id) => initial[id].kind === 'entry') ?? null,
  );
  const [message, setMessage] = useState('');
  const record = catalog[selected];
  const patch = buildCalendarPatch(initial, catalog),
    changed = Object.keys(patch.changes).length;
  const validation = applyCalendarPatch(initial, patch);
  const entries = Object.entries(catalog).filter(([, item]) => item.kind === 'entry');
  function edit(value) {
    setCatalog((all) => ({ ...all, [selected]: { ...all[selected], ...value } }));
  }
  function switchMode(mode) {
    const next = { ...record };
    if (mode === 'date') {
      delete next.week;
      delete next.day;
      next.date = weekDate(0);
    } else {
      delete next.date;
      next.week = 0;
      next.day = 0;
    }
    setCatalog((all) => ({ ...all, [selected]: next }));
  }
  function add() {
    const id = crypto.randomUUID();
    setCatalog((all) => ({
      ...all,
      [id]: { kind: 'entry', name: '', type: 'note', date: weekDate(0) },
    }));
    setSelected(id);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(patch, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sasago3-calendar-changes.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('변경 파일을 내려받았습니다. 적용 명령으로 검사한 뒤 반영하세요.');
  }
  return (
    <main className="authoring-app">
      <header>
        <div>
          <h1>학사 달력 편집</h1>
          <p>날짜별 표시와 기존 일정의 발생일을 편집합니다.</p>
        </div>
        <button disabled={!changed || !validation.next} onClick={download}>
          변경 {changed}개 내보내기
        </button>
      </header>
      <div className="editor-layout">
        <aside>
          <button onClick={add}>일정 추가</button>
          {entries.map(([id, item]) => (
            <button
              key={id}
              className={id === selected ? 'selected' : ''}
              onClick={() => setSelected(id)}
            >
              {item.name || '이름 없는 일정'}
              {item.enabled === false || item.deleted ? ' · 비활성' : ''}
            </button>
          ))}
          {!entries.length && <p>일정을 추가해 날짜와 내용을 정해 주세요.</p>}
        </aside>
        <section className="authoring-form">
          {record ? (
            <>
              <small>{selected}</small>
              <label>
                일정 이름
                <input
                  value={record.name}
                  maxLength={100}
                  onChange={(event) => edit({ name: event.target.value })}
                />
              </label>
              <label>
                종류
                <select
                  value={record.type}
                  onChange={(event) => edit({ type: event.target.value })}
                >
                  {Object.entries({
                    event: '행사',
                    deadline: '마감',
                    class: '수업',
                    note: '메모',
                  }).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                날짜 입력 방식
                <select
                  value={record.date !== undefined ? 'date' : 'week'}
                  onChange={(event) => switchMode(event.target.value)}
                >
                  <option value="date">날짜 직접 지정</option>
                  <option value="week">게임 주차·요일 지정</option>
                </select>
              </label>
              {record.date !== undefined ? (
                <label>
                  날짜
                  <input
                    type="date"
                    value={record.date}
                    onChange={(event) => edit({ date: event.target.value })}
                  />
                </label>
              ) : (
                <>
                  <label>
                    게임 주차 (겨울방학 0)
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={record.week}
                      onChange={(event) => edit({ week: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    요일
                    <select
                      value={record.day}
                      onChange={(event) => edit({ day: Number(event.target.value) })}
                    >
                      {DAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}요일
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label>
                기존 일정 연결
                <select
                  value={record.source ?? ''}
                  onChange={(event) => edit({ source: event.target.value || undefined })}
                >
                  <option value="">표시만 추가</option>
                  {CALENDAR_SOURCE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              {record.source && (
                <p>연결된 일정의 실제 발생일도 바뀝니다. 이미 발생한 과제의 마감은 보존합니다.</p>
              )}
              <label>
                관련 과목
                <select
                  value={record.course ?? ''}
                  onChange={(event) => edit({ course: event.target.value || undefined })}
                >
                  <option value="">공통</option>
                  {Object.entries(courses).map(([id, item]) => (
                    <option key={id} value={id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                내용
                <textarea
                  value={record.description ?? ''}
                  maxLength={1000}
                  onChange={(event) => edit({ description: event.target.value })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={record.enabled !== false && !record.deleted}
                  onChange={(event) => edit({ enabled: event.target.checked, deleted: false })}
                />
                일정 활성화
              </label>
            </>
          ) : (
            <p>왼쪽에서 일정을 선택하거나 추가해 주세요.</p>
          )}
          {message && <p role="status">{message}</p>}
          <h3>입력 검사</h3>
          {validation.issues.length ? (
            <ul>
              {validation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p>입력 문제 없음</p>
          )}
          <h3>적용 방법</h3>
          <p>변경 파일을 다운로드한 후 프로젝트 터미널에서 아래 명령을 실행하세요.</p>
          <code>npm run calendar:apply -- "다운로드한 파일의 전체 경로"</code>
        </section>
      </div>
    </main>
  );
}
