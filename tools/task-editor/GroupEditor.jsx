import { useState } from 'react';
import ModulePicker from './ModulePicker.jsx';
export default function GroupEditor({ group, catalog, onChange }) {
  const [query, setQuery] = useState('');
  return (
    <>
      <label>
        그룹 이름
        <input value={group.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <ModulePicker
        value={group.module}
        optional={false}
        onChange={(module) => onChange({ module })}
      />
      <label>
        묶을 과제 검색
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <p>{group.members.length}개 과제에 모듈 적용</p>
      <div className="group-members">
        {Object.entries(catalog)
          .filter(([id, task]) => task.kind === 'task' && `${id} ${task.name}`.includes(query))
          .map(([id, task]) => (
            <label className="check" key={id}>
              <input
                type="checkbox"
                checked={group.members.includes(id)}
                onChange={(event) =>
                  onChange({
                    members: event.target.checked
                      ? [...group.members, id]
                      : group.members.filter((member) => member !== id),
                  })
                }
              />
              <span>
                {task.name}
                <small>{id}</small>
              </span>
            </label>
          ))}
      </div>
      <p className="field-note">
        다른 그룹과 서로 다른 모듈을 지정하면 검사에서 충돌을 알려줍니다. 개별 과제에서 모듈을
        지정하면 해당 과제만 덮어씁니다.
      </p>
    </>
  );
}
