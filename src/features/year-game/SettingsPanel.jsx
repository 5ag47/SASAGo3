import { useRef, useState } from 'react';
import { Download, FileUp, LogOut, ShieldCheck, Volume2 } from 'lucide-react';
export default function SettingsPanel({ game, audio, onClose, onLeave }) {
  const [confirmation, setConfirmation] = useState('');
  const fileRef = useRef(null);
  return (
    <div className="settings-panel">
      <div className="settings-row">
        <span>
          <Volume2 size={18} />
          <span>
            <b>작은 피아노 소리</b>
          </span>
        </span>
        <button
          className={`toggle ${audio.playing ? 'on' : ''}`}
          role="switch"
          aria-checked={audio.playing}
          aria-label="배경음 켜기"
          onClick={audio.toggle}
        >
          <i />
        </button>
      </div>
      <label className="volume-label" htmlFor="volume">
        음량<span>{audio.volume}%</span>
      </label>
      <input
        id="volume"
        type="range"
        min="0"
        max="100"
        value={audio.volume}
        onChange={(e) => audio.setVolume(Number(e.target.value))}
      />
      <div className="settings-info">
        <ShieldCheck size={19} />
        <p>
          {game.mode === 'server'
            ? '계정에 진행 기록이 저장됩니다.'
            : '이 브라우저에 진행 기록이 저장됩니다. 브라우저 데이터를 지우기 전에 백업하세요.'}
        </p>
      </div>
      <div className="settings-actions">
        <button onClick={game.backup}>
          <Download size={16} />
          <span>
            저장 파일 내보내기
            <small>
              {game.mode === 'server'
                ? '참고용 사본 · 서버에 재업로드 불가'
                : '다른 브라우저에서 복원할 수 있어요'}
            </small>
          </span>
        </button>
        {game.mode === 'local' && (
          <button onClick={() => fileRef.current.click()}>
            <FileUp size={16} />
            <span>
              저장 파일 복원<small>기존 기록은 직전 백업에 보관돼요</small>
            </span>
          </button>
        )}
        <button onClick={game.diagnostics}>
          <ShieldCheck size={16} />
          <span>
            진단 보고서 다운로드<small>오류 코드·행동·주차·버전 · 이름은 가려져요</small>
          </span>
        </button>
        <button
          disabled={game.busy}
          onClick={async () => {
            if (await game.logout()) onClose();
          }}
        >
          <LogOut size={16} />
          <span>
            {game.mode === 'server' ? 'Google 로그아웃' : '플레이 화면 잠그기'}
            <small>
              {game.mode === 'server'
                ? '서버 기록을 유지하고 로그인 화면으로 돌아가요'
                : '인증 기능 없이 시작 화면으로 나가요'}
            </small>
          </span>
        </button>
      </div>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          if (e.target.files?.[0]) game.importSave(e.target.files[0]);
          e.target.value = '';
        }}
      />
      {!game.state.ending && game.state.created && (
        <button className="subtle leave-button" onClick={onLeave}>
          잠시 쉬어가기 · 휴학 결말 보기
        </button>
      )}
      <div className="reset-box">
        <b>새로 시작하기</b>
        <p>
          현재 진행을 초기화해요. 먼저 저장 파일을 내보내세요. 확인란에 ‘새로 시작’을 입력하면
          버튼이 활성화돼요.
        </p>
        <div>
          <input
            aria-label="초기화 확인 문구"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="새로 시작"
          />
          <button
            className="danger"
            disabled={confirmation !== '새로 시작' || game.busy}
            onClick={async () => {
              if (await game.reset()) onClose();
            }}
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
