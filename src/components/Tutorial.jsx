const STEPS = [['나의 방에 온 걸 환영해!', '가운데 캐릭터를 눌러봐. 신체와 멘탈, 스트레스에 따라 다른 혼잣말을 들을 수 있어.'], ['수강신청부터 해볼까?', '수학은 공통 과목이야. 주요선택1을 고르면 해당 과목을 학습할 수 있어.'], ['이번 주를 내 손으로', '오른쪽에서 월~토 활동을 고르고 신청해. 수학 2회와 휴식·운동 1회 목표를 달성하면 보상을 받아.'], ['준비가 됐다면 한 주 시작!', '계획 확인 → 스토리 선택 → 일별 결과와 정산 순서로 진행돼. 번 돈으로 매점에서 아이템을 사서 가방에서 사용해봐.']];
export default function Tutorial({
  game,
  onStep,
  onEnroll
}) {
  if (game.tutorialStep >= STEPS.length) return null;
  const [title, text] = STEPS[game.tutorialStep];
  return <section className="tutorial-panel" aria-label="튜토리얼">
    <div><span className="eyebrow">FIRST WEEK · {game.tutorialStep + 1} / 4</span><h2>{title}</h2><p>{text}</p></div>
    <div className="tutorial-actions">
      {game.tutorialStep === 1 && !game.enrolled ? <button className="primary" onClick={onEnroll}>수강신청하기</button> : <button className="primary" onClick={() => onStep(game.tutorialStep + 1)}>{game.tutorialStep === 3 ? '준비 완료' : '다음'}</button>}
      <button className="text-button" onClick={() => onStep(4)}>나중에 보기</button>
    </div>
  </section>;
}
