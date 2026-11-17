import { useState } from 'react';
import { ArrowRight, Lightbulb, X } from 'lucide-react';
const steps = [
  [
    '이번 주는 준비됐어요',
    '할 일을 자동으로 시간표에 넣어 두었어요. 그대로 한 주를 시작해도 괜찮아요.',
  ],
  [
    '한 번 눌러 배정하기',
    '바꾸고 싶은 시간 칸을 누른 뒤 오른쪽 할 일을 누르세요. 다음 칸은 자동으로 선택돼요.',
  ],
  [
    '쉴 시간도 챙겨요',
    '휴식·운동·놀기도 같은 방법으로 넣어요. 아래 주말 예상에서 건강과 스트레스를 확인하세요.',
  ],
  [
    '이야기를 골라 보세요',
    '스터디·학원 신청은 메인 화면에 나타나요. 선택지를 바꾸어 본 뒤 확정하세요.',
  ],
  [
    '이제 한 주를 시작해요',
    '과제는 배정한 시간에 자동으로 진행돼요. 결과 화면에서 성공 여부와 능력치 변화를 확인하세요.',
  ],
];
export default function TutorialGuide({ tutorial, state, modal, onDismiss }) {
  const [step, setStep] = useState(0);
  if (state.week > 2 || tutorial.active === 'dismissed' || modal) return null;
  return (
    <aside className="inline-tutorial" aria-label="플레이 화면 조작 안내">
      <Lightbulb size={24} />
      <div>
        <b>
          {step + 1}/{steps.length} · {steps[step][0]}
        </b>
        <p>{steps[step][1]}</p>
      </div>
      <button onClick={() => (step === steps.length - 1 ? onDismiss() : setStep(step + 1))}>
        {step === steps.length - 1 ? '시작해 볼게요' : '다음'}
        <ArrowRight size={16} />
      </button>
      <button onClick={onDismiss} aria-label="안내 닫기">
        <X size={18} />
      </button>
    </aside>
  );
}
