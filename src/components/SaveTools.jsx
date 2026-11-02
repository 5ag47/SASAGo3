import { useRef, useState } from 'react';
import { SAVE_KEY, migrateSave, validSave } from '../game.js';
export default function SaveTools({
  game,
  onRestore
}) {
  const input = useRef(null);
  const [pending, setPending] = useState(null),
    [message, setMessage] = useState('');
  function exportSave() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(game, null, 2)], {
      type: 'application/json'
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `SASAGo3-week-${game.week}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function inspect(value) {
    const migrated = migrateSave(value);
    if (!validSave(migrated)) throw new Error('지원하지 않거나 손상된 저장 파일이에요.');
    setPending(migrated);
    setMessage('');
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error('저장 파일은 2MB 이하만 불러올 수 있어요.');
      inspect(JSON.parse(await file.text()));
    } catch (err) {
      setMessage(err.message);
    }
    event.target.value = '';
  }
  return <section className="save-tools"><h3>진행 상황 백업</h3><div className="save-buttons">
    {game && <button type="button" className="secondary" onClick={exportSave}>백업 다운로드</button>}
    <button type="button" className="secondary" onClick={() => input.current.click()}>백업 불러오기</button>
    <button type="button" className="text-button" onClick={() => {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (!raw) throw new Error('이 브라우저에 이전 버전의 저장이 없어요.');
          inspect(JSON.parse(raw));
        } catch (err) {
          setMessage(err.message);
        }
      }}>이전 버전 저장 가져오기</button>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={importFile} />
  </div>
  {pending && <div className="info-note"><p>{pending.name} · {pending.week}주 진행. 현재 계정의 진행 상황을 이 파일로 바꿀까요?</p><div className="save-buttons"><button type="button" className="primary" onClick={() => {
          try {
            onRestore(pending);
            setPending(null);
            setMessage('저장을 불러왔어요.');
          } catch {
            setMessage('저장 공간에 쓸 수 없어요.');
          }
        }}>이 저장으로 바꾸기</button><button type="button" className="secondary" onClick={() => setPending(null)}>취소</button></div></div>}
  {message && <p role="status" className="form-error">{message}</p>}
  </section>;
}
