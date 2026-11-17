import { useState } from 'react';
import { LAST_WEEK } from '../../domain/catalog.js';
import { weekDate } from '../../domain/calendar-date.js';
import { DEVELOPER_LAST_DATE, EDITABLE_STATS } from '../../domain/developer.js';
import { developerTime, gameClockPosition } from '../../domain/game-time.js';
import './developer.css';

export default function DeveloperPanel({ game, onProgress }) {
  const { state, busy, send, notify } = game;
  const current = developerTime(state);
  const [at, setAt] = useState(current);
  const [time, setTime] = useState(current.slice(11));
  const replay = Boolean(state.ending) || at < gameClockPosition(state);

  async function advance(command) {
    const next = await send(command);
    if (!next) return;
    const arrived = developerTime(next);
    setAt(arrived);
    setTime(arrived.slice(11));
    notify(`${arrived.replace('T', ' ')}까지 진행했어요.`);
    onProgress(next);
  }

  return (
    <div className="developer-panel">
      <p className="dialog-lead">이 브라우저의 테스트 저장을 사용합니다.</p>
      <section>
        <h3>게임 일시</h3>
        <p>현재 {current.replace('T', ' ')}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            advance({ type: 'developer_advance', at, replay });
          }}
        >
          <label>
            목표 일시
            <input
              type="datetime-local"
              value={at}
              min={`${weekDate(0)}T00:00`}
              max={`${DEVELOPER_LAST_DATE}T23:59`}
              required
              onChange={(event) => setAt(event.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || !at}>
            {replay ? '처음부터 이 일시까지 다시 진행' : '이 일시까지 자동 진행'}
          </button>
          <small>
            {replay
              ? '현재 테스트의 선택과 스탯 변경을 초기화하고 같은 캐릭터로 다시 진행해요.'
              : '현재 일정으로 진행해요. 미니게임은 중단하고 선택이 필요한 이벤트는 마감까지 남겨 둬요.'}
          </small>
        </form>
        <div className="developer-actions">
          <button
            className="subtle"
            disabled={busy || Boolean(state.ending) || state.week > LAST_WEEK}
            onClick={() => advance({ type: 'developer_skip_week' })}
          >
            자습신청 건너뛰고 다음 주로
          </button>
          <button
            className="subtle"
            disabled={busy}
            onClick={() =>
              state.week > LAST_WEEK
                ? onProgress(state)
                : advance({
                    type: 'developer_advance',
                    at: `${DEVELOPER_LAST_DATE}T00:00`,
                    replay: Boolean(state.ending),
                  })
            }
          >
            {state.week > LAST_WEEK ? '최종 결과 보기' : '자동 진행하고 최종 결과 보기'}
          </button>
        </div>
      </section>
      <section>
        <h3>기숙사 시각</h3>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send({ type: 'developer_clock', time })) {
              notify('기숙사 시각을 바꿨어요.');
            }
          }}
        >
          <label>
            낮·밤 배경 확인
            <input
              type="time"
              value={time}
              required
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          <button className="subtle" disabled={busy || !time}>
            시각만 바꾸기
          </button>
        </form>
      </section>
      <section>
        <h3>스탯 조정</h3>
        <form
          key={state.revision}
          onSubmit={async (event) => {
            event.preventDefault();
            const values = Object.fromEntries(
              [...new FormData(event.currentTarget)].map(([id, value]) => [id, Number(value)]),
            );
            if (await send({ type: 'developer_stats', values })) notify('스탯을 적용했어요.');
          }}
        >
          <div className="developer-stats">
            {Object.entries(EDITABLE_STATS).map(([id, { name, max, step }]) => (
              <label key={id}>
                {name}
                <input
                  name={id}
                  type="number"
                  min={0}
                  max={max}
                  step={step}
                  required
                  defaultValue={state.stats[id] ?? state[id]}
                />
              </label>
            ))}
          </div>
          <small>집중력 {state.stats.focus} · 건강과 스트레스에 따라 자동 계산</small>
          <button className="primary" disabled={busy}>
            스탯 적용
          </button>
        </form>
      </section>
    </div>
  );
}
