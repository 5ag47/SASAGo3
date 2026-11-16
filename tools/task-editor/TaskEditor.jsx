import { useState } from 'react';
import {
  assignments,
  courses,
  STATS,
  period,
  storyEvents,
  lifeEvents,
} from '../../src/domain/catalog.js';
import { TASK_FORMATS, expandAssignments } from '../../src/domain/assignments.js';
import { buildAssignmentPatch, applyAssignmentPatch } from '../../src/domain/assignment-edits.js';
import ModulePicker from './ModulePicker.jsx';
import GroupEditor from './GroupEditor.jsx';

const context = {
  courses,
  stats: STATS,
  reservedIds: [...Object.keys(storyEvents), ...Object.keys(lifeEvents)],
};
const number = (event) => (event.target.value === '' ? null : Number(event.target.value));
function Numeric({ label, value, onChange, min = 0, max = 40, step = 1 }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(event) => onChange(number(event))}
      />
    </label>
  );
}
export default function TaskEditor({ initial = assignments }) {
  const [catalog, setCatalog] = useState(() => structuredClone(initial));
  const [selected, setSelected] = useState(Object.keys(initial)[0] ?? null);
  const [query, setQuery] = useState('');
  const [newId, setNewId] = useState('');
  const [message, setMessage] = useState('');
  const draft = catalog[selected];
  const patch = buildAssignmentPatch(initial, catalog);
  const changed = Object.keys(patch.changes).length;
  const validation = applyAssignmentPatch(initial, patch, context);
  const edit = (value) =>
    setCatalog((all) => ({ ...all, [selected]: { ...all[selected], ...value } }));
  const remove = (key) => {
    const next = { ...draft };
    delete next[key];
    setCatalog((all) => ({ ...all, [selected]: next }));
  };
  const stages = draft?.stages ?? [];
  const updateStages = (next) => {
    if (!next.length) remove('stages');
    else edit({ stages: next, target: next.reduce((sum, stage) => sum + (stage.target ?? 0), 0) });
  };
  let preview = [];
  try {
    preview = Object.entries(expandAssignments(catalog))
      .filter(([id]) => id === selected || id.startsWith(`${selected}--w`))
      .map(([, task]) => task);
  } catch {
    /* validation below explains malformed schedules */
  }
  function download() {
    const blob = new Blob([JSON.stringify(patch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sasago3-task-changes.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('변경 파일을 내려받았습니다. 아래 적용 명령으로 검사한 뒤 반영하세요.');
  }
  function add(group = false) {
    if (
      !/^[a-z][a-z0-9_-]{1,79}$/.test(newId) ||
      Object.hasOwn(catalog, newId) ||
      context.reservedIds.includes(newId)
    ) {
      setMessage('사용하지 않는 영문 ID를 입력하세요.');
      return;
    }
    setCatalog((all) => ({
      ...all,
      [newId]: group
        ? { kind: 'group', name: '', members: [], module: { id: 'time_v1', params: {} } }
        : {
            kind: 'task',
            name: '',
            description: '',
            week: 1,
            deadline: 1,
            target: 1,
            reward: {},
            penalty: {},
          },
    }));
    setSelected(newId);
    setNewId('');
    setQuery('');
    setMessage('새 항목은 편집기에만 있습니다. 이름과 일정을 입력한 뒤 변경 파일로 내보내세요.');
  }
  return (
    <main className="authoring-app">
      <header>
        <div>
          <h1>과제 편집</h1>
          <p>원하는 과제를 편집하고 변경 파일로 내보냅니다. 플레이어 저장은 건드리지 않습니다.</p>
        </div>
        <button disabled={!changed || !validation.next} onClick={download}>
          변경 {changed}개 내보내기
        </button>
      </header>
      <aside>
        <label>
          과제 찾기
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름·ID·과목"
          />
        </label>
        <nav aria-label="과제 목록">
          {Object.entries(catalog)
            .filter(([id, task]) =>
              `${id} ${task.name} ${courses[task.course]?.name ?? ''}`.includes(query),
            )
            .map(([id, task]) => (
              <button
                key={id}
                className={id === selected ? 'selected' : ''}
                onClick={() => setSelected(id)}
              >
                <b>{task.name || '(이름 미입력)'}</b>
                <small>
                  {id}
                  {task.enabled === false ? ' · 비활성' : ''}
                </small>
              </button>
            ))}
        </nav>
        <label>
          새 과제·그룹 ID
          <input
            value={newId}
            onChange={(event) => setNewId(event.target.value)}
            placeholder="예: physics_lab_report"
          />
        </label>
        <button onClick={() => add()}>빈 과제 만들기</button>
        <button onClick={() => add(true)}>그룹 만들기</button>
      </aside>
      <section className="authoring-form">
        {draft ? (
          <>
            <h2>{selected}</h2>
            {draft.kind === 'group' ? (
              <GroupEditor key={selected} group={draft} catalog={catalog} onChange={edit} />
            ) : (
              <>
                <label>
                  과제 이름
                  <input
                    value={draft.name}
                    maxLength={100}
                    onChange={(event) => edit({ name: event.target.value })}
                  />
                </label>
                <label>
                  설명
                  <textarea
                    value={draft.description}
                    maxLength={1000}
                    onChange={(event) => edit({ description: event.target.value })}
                  />
                </label>
                <div className="field-row">
                  <label>
                    대상 과목
                    <select
                      value={draft.course ?? ''}
                      onChange={(event) =>
                        event.target.value ? edit({ course: event.target.value }) : remove('course')
                      }
                    >
                      <option value="">공통 과제</option>
                      {Object.entries(courses).map(([id, course]) => (
                        <option key={id} value={id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    표시 유형
                    <select
                      value={draft.format ?? 'custom'}
                      onChange={(event) => edit({ format: event.target.value })}
                    >
                      {Object.entries(TASK_FORMATS).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-row">
                  <Numeric label="발생 주" value={draft.week} onChange={(week) => edit({ week })} />
                  <Numeric
                    label="마감 주"
                    value={draft.deadline}
                    onChange={(deadline) => edit({ deadline })}
                  />
                  {!stages.length && (
                    <Numeric
                      label="필요 분량(칸)"
                      value={draft.target}
                      min={0.1}
                      max={100}
                      step={0.1}
                      onChange={(target) => edit({ target })}
                    />
                  )}
                </div>
                <p className="field-note">
                  0주 겨울 · 1~16주 1학기 · 17~24주 방학 · 25~40주 2학기. 마감 주의 활동을 마친 뒤
                  판정합니다.
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={draft.enabled !== false}
                    onChange={(event) => edit({ enabled: event.target.checked })}
                  />
                  게임에서 발생하도록 설정
                </label>
                <ModulePicker
                  key={selected}
                  value={draft.module}
                  onChange={(module) => (module ? edit({ module }) : remove('module'))}
                />
                <details>
                  <summary>반복 일정</summary>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.repeat)}
                      onChange={(event) =>
                        event.target.checked
                          ? edit({ repeat: { every: 1, until: draft.week } })
                          : remove('repeat')
                      }
                    />
                    같은 과제 반복
                  </label>
                  {draft.repeat && (
                    <div className="field-row">
                      <Numeric
                        label="반복 간격(주)"
                        min={1}
                        value={draft.repeat.every}
                        onChange={(every) => edit({ repeat: { ...draft.repeat, every } })}
                      />
                      <Numeric
                        label="마지막 발생 주"
                        value={draft.repeat.until}
                        onChange={(until) => edit({ repeat: { ...draft.repeat, until } })}
                      />
                    </div>
                  )}
                  <p className="field-note">
                    각 반복은 별도 진척도를 가집니다. 방학도 지정 범위에 포함됩니다.
                  </p>
                </details>
                <details>
                  <summary>과제 안의 단계 {stages.length > 0 && `· ${stages.length}개`}</summary>
                  {stages.map((stage, index) => (
                    <div className="stage-editor" key={stage.id}>
                      <label>
                        단계 이름
                        <input
                          value={stage.name}
                          onChange={(event) =>
                            updateStages(
                              stages.map((s, i) =>
                                i === index ? { ...s, name: event.target.value } : s,
                              ),
                            )
                          }
                        />
                      </label>
                      <Numeric
                        label="분량"
                        value={stage.target}
                        min={0.1}
                        max={100}
                        step={0.1}
                        onChange={(target) =>
                          updateStages(stages.map((s, i) => (i === index ? { ...s, target } : s)))
                        }
                      />
                      <button onClick={() => updateStages(stages.filter((_, i) => i !== index))}>
                        제거
                      </button>
                    </div>
                  ))}
                  <button
                    disabled={stages.length >= 12}
                    onClick={() =>
                      updateStages([
                        ...stages,
                        { id: `stage_${crypto.randomUUID()}`, name: '', target: 1 },
                      ])
                    }
                  >
                    단계 추가
                  </button>
                  <p className="field-note">
                    시간을 투자하면 앞 단계부터 채워집니다. 단계 분량의 합이 전체 분량이며, 전체
                    완료 보상은 한 번 적용합니다.
                  </p>
                </details>
                <details>
                  <summary>완료·미완료 능력치 변화</summary>
                  <div className="effect-editor">
                    {['reward', 'penalty'].map((field) => (
                      <fieldset key={field}>
                        <legend>{field === 'reward' ? '완료' : '미완료'}</legend>
                        {Object.entries(STATS).map(([id, stat]) => (
                          <Numeric
                            key={id}
                            label={stat.name}
                            value={draft[field]?.[id] ?? 0}
                            min={-100}
                            max={100}
                            step={0.1}
                            onChange={(value) =>
                              edit({ [field]: { ...draft[field], [id]: value } })
                            }
                          />
                        ))}
                      </fieldset>
                    ))}
                  </div>
                </details>
                <section className="task-preview" aria-label="과제 미리보기">
                  <h3>미리보기</h3>
                  <b>{draft.name || '(이름 미입력)'}</b>
                  <p>{draft.description}</p>
                  <p>
                    {courses[draft.course]?.name ?? '공통'} · 전체 {draft.target ?? '?'}칸
                    {draft.course ? ' · 수행평가에 반영' : ''}
                  </p>
                  <ol>
                    {stages.map((stage) => (
                      <li key={stage.id}>
                        {stage.name || '(단계 이름 미입력)'} · {stage.target ?? '?'}칸
                      </li>
                    ))}
                  </ol>
                  {preview.slice(0, 5).map((task) => (
                    <p key={task.week}>
                      {period(task.week).label} 발생 → {period(task.deadline).label} 마감
                    </p>
                  ))}
                  {preview.length > 5 && <p>총 {preview.length}회 발생</p>}
                </section>
              </>
            )}
            <details>
              <summary>선택한 항목 JSON</summary>
              <pre>{JSON.stringify(draft, null, 2)}</pre>
            </details>
          </>
        ) : (
          <p>과제를 선택하거나 빈 과제를 만드세요.</p>
        )}
      </section>
      <footer>
        <p role="status">
          {message || `${changed}개 변경 · ${validation.issues.length}개 입력 문제`}
        </p>
        {validation.issues.length > 0 && (
          <ul role="alert">
            {validation.issues.slice(0, 12).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <p>내보낸 후 프로젝트 터미널에서 실행:</p>
        <code>npm run tasks:apply -- "변경 파일의 전체 경로"</code>
        <p>
          다른 사람이 같은 항목을 수정했다면 적용을 멈춥니다. 적용 성공 후 npm run check와 npm
          test를 실행하고 Git 차이를 검토하세요.
        </p>
      </footer>
    </main>
  );
}
