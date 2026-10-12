import { HP_LIMIT, REPEAT_FREE_DAYS, STRESS_LIMIT } from '../../systems/week.js';

export default function HelpModal() {
  return (
    <>
      <ol className="guide-list">
        <li>
          <b>일정 짜기</b>
          <p>월~토 요일을 누르고 장소와 사유를 골라 신청해요. 일요일은 자동으로 쉽니다.</p>
        </li>
        <li>
          <b>한 주 진행</b>
          <p>&lsquo;한 주 시작&rsquo;을 누르면 활동이 순서대로 반영되어 능력치가 바뀌고 다음 주로 넘어가요. 결과는 기록에서 다시 볼 수 있어요.</p>
        </li>
        <li>
          <b>컨디션 관리</b>
          <p>
            스트레스가 {STRESS_LIMIT} 이상이거나 건강이 {HP_LIMIT} 미만이면 학습 효율이 떨어져요.
            같은 공부를 {REPEAT_FREE_DAYS + 1}일 이상 반복해도 증가량이 줄어요.
          </p>
        </li>
      </ol>
      <p className="info-note">입력 내용은 현재 브라우저에 자동 저장돼요. 브라우저 데이터를 삭제하면 저장 내용도 사라집니다. 계정 로그인과 기기 간 연동은 아직 제공하지 않아요.</p>
    </>
  );
}
