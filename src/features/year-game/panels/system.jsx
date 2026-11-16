import TutorialPanel from '../TutorialPanel.jsx';
import ShopPanel from '../ShopPanel.jsx';
import SettingsPanel from '../SettingsPanel.jsx';
import { ChoiceButton } from '../ui.jsx';
import { NAV } from './navigation.js';
export default function SystemPanels(context) {
  const { state, modal, game, audio, tutorial, ui } = context;
  const { busy, send, notify } = context.game;
  const { close, open, lesson } = ui;
  return (
    <>
      {modal.type === 'shop' && (
        <ShopPanel
          state={state}
          busy={busy}
          onBuy={async (item) => {
            if (await send({ type: 'buy', item })) notify('사용했습니다.');
          }}
        />
      )}
      {modal.type === 'settings' && (
        <SettingsPanel game={game} audio={audio} onClose={close} onLeave={() => open('leave')} />
      )}
      {['help', 'tutorial'].includes(modal.type) && (
        <TutorialPanel tutorial={tutorial} state={state} onLesson={lesson} />
      )}
      {modal.type === 'menu' &&
        NAV.map(([id, Icon, label]) => (
          <ChoiceButton
            key={id}
            anchor={id}
            title={label}
            icon={<Icon size={17} />}
            onClick={() => open(id)}
          />
        ))}
      {modal.type === 'leave' && (
        <>
          <p className="dialog-lead">
            휴학을 선택하면 이번 게임의 진행을 마칩니다. 기록은 보존됩니다.
          </p>
          <ChoiceButton
            title="휴학하기"
            onClick={async () => {
              if (await send({ type: 'ending', ending: 'leave' })) close();
            }}
          />
          <button className="subtle full" onClick={close}>
            취소
          </button>
        </>
      )}
    </>
  );
}
