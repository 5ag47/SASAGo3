import { useEffect, useState } from 'react';
import { TASK_MODULES } from '../../src/domain/task-modules/registry.js';
export default function ModulePicker({ value, onChange, optional = true }) {
  const [text, setText] = useState(JSON.stringify(value?.params ?? {}, null, 2));
  const [error, setError] = useState('');
  useEffect(() => {
    setText(JSON.stringify(value?.params ?? {}, null, 2));
    setError('');
  }, [value?.id, JSON.stringify(value?.params)]);
  return (
    <fieldset>
      <legend>처리 모듈</legend>
      <label>
        모듈
        <select
          value={value?.id ?? ''}
          onChange={(event) => {
            if (!event.target.value) onChange(undefined);
            else
              onChange({
                id: event.target.value,
                params:
                  event.target.value === 'mastery_v1' ? { ability: 'math', passScore: 60 } : {},
              });
          }}
        >
          {optional && <option value="">그룹 설정 상속 · 없으면 기본 과제 미니게임</option>}
          {!optional && !value && <option value="">모듈 선택</option>}
          {Object.values(TASK_MODULES)
            .filter((module) => module.session || module.id === value?.id)
            .map((module) => (
              <option key={module.id} value={module.id}>
                {module.name} ({module.id})
              </option>
            ))}
        </select>
      </label>
      {value && TASK_MODULES[value.id]?.session && (
        <div className="session-config">
          <label>
            주간 도전 상한 (비워두면 제한 없음)
            <input
              type="number"
              min="1"
              max="1000"
              value={value.params.weeklyLimit ?? ''}
              onChange={(event) =>
                onChange({
                  ...value,
                  params: {
                    ...value.params,
                    weeklyLimit: event.target.value === '' ? null : Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label>
            부담이 증가하기 시작하는 도전 횟수
            <input
              type="number"
              min="0"
              max="21"
              value={value.params.overloadAfter ?? 2}
              onChange={(event) =>
                onChange({
                  ...value,
                  params: { ...value.params, overloadAfter: Number(event.target.value) },
                })
              }
            />
          </label>
          <label>
            작업 품질 난수 범위 ±
            <input
              type="number"
              min="0"
              max="10"
              value={value.params.variance ?? 0}
              onChange={(event) =>
                onChange({
                  ...value,
                  params: { ...value.params, variance: Number(event.target.value) },
                })
              }
            />
          </label>
          <p className="field-note">
            아래 JSON에서 cost·success·mistake·failure·earlyEffect의 능력치 변화와 반복 부담을
            지정합니다. 예: cost: hp -0.5, focus -0.25, stress +1.
          </p>
        </div>
      )}
      {value && (
        <label>
          모듈 설정 JSON
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              try {
                const params = JSON.parse(event.target.value);
                onChange({ ...value, params });
                setError('');
              } catch {
                setError('JSON 문법을 확인하세요. 유효한 마지막 설정을 유지합니다.');
              }
            }}
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="field-note">
        등록된 코드 모듈만 선택할 수 있습니다. 과제에 직접 지정한 모듈이 그룹보다 우선합니다. 새
        코드 등록 방법은 docs/task-authoring.md를 참고하세요.
      </p>
    </fieldset>
  );
}
