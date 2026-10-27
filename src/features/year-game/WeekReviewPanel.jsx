import { AlertTriangle, ArrowRight, Check, ChevronRight } from 'lucide-react';
import { choiceDeadline, events, period, effectText } from '../../domain/catalog.js';
import { reviewPlan } from '../../domain/planning.js';
import { nextAssessments } from '../../domain/school-calendar.js';
import './planning.css';

export default function WeekReviewPanel({
  state,
  busy,
  onStart,
  onSchedule,
  onTask,
  onTaskGame,
  onNotices,
}) {
  const review = reviewPlan(state);
  const notices = state.pending.filter((id) => choiceDeadline(id) === state.week);
  const exams = nextAssessments(state.week);
  return (
    <div className="week-review">
      <div className="confirm-summary">
        <div>
          <b>21</b>
          <span>자습시간</span>
        </div>
        <div>
          <b>{review.due.length}</b>
          <span>이번 주 마감</span>
        </div>
        <div>
          <b>{review.recovery}</b>
          <span>회복 활동</span>
        </div>
      </div>
      {review.due.length > 0 && (
        <section className="review-tasks" aria-label="마감 과제 시간 배정">
          <h3>이번 주 마감</h3>
          {review.due.map((task) => (
            <button key={task.id} onClick={() => onTask(task.id)}>
              {task.allocation.covered ? <Check size={16} /> : <AlertTriangle size={16} />}
              <span>
                <b>{task.name}</b>
                <small>
                  남은 분량 {task.allocation.remaining} · 배정 {task.allocation.slots}칸
                </small>
              </span>
              <em>
                {task.allocation.estimated ? '예상 ' : ''}
                {task.allocation.covered ? '배정 충분' : `${task.allocation.missing}칸 부족`}
              </em>
              <ArrowRight size={14} />
            </button>
          ))}
        </section>
      )}
      {review.taskRisks.length > 0 && (
        <section className="review-tasks">
          <h3>반복 작업 부담</h3>
          {review.taskRisks.map((risk) => (
            <button key={risk.id} onClick={() => onTask(risk.id)}>
              <AlertTriangle size={16} />
              <span>
                <b>
                  {risk.name} · {risk.planned}회 배정
                </b>
                <small>도전 비용 합계(예상) · {effectText(risk.effects)}</small>
                {risk.cap && (
                  <small>
                    주간 상한 {risk.cap}회 · 남은 도전 {risk.possible}회
                  </small>
                )}
              </span>
            </button>
          ))}
          <p className="review-warning">
            체력 고갈이나 극심한 스트레스는 회복 후에도 다음 주 피로로 남을 수 있습니다.
          </p>
        </section>
      )}
      {exams.length > 0 && (
        <p className="review-exam">
          {period(exams[0].week).label} · {exams.map((exam) => exam.name).join(' · ')}
        </p>
      )}
      {review.missingGroup && (
        <p className="review-warning">스터디 배정 없음 · 불참 벌금 최대 500원</p>
      )}
      {review.recovery === 0 && <p className="review-warning">회복 활동을 배정하지 않았습니다.</p>}
      {review.hasFatigue && <p className="review-warning">이번 주 피로 상태 · 학습 효과 감소</p>}
      {review.activityCost > 0 && (
        <p className="review-cost">배정 활동비 {review.activityCost.toLocaleString()}원</p>
      )}
      {notices.length > 0 && (
        <button className="subtle full" onClick={onNotices}>
          이번 주 마감 알림 {notices.length}개 · {notices.map((id) => events[id].name).join(', ')}
        </button>
      )}
      <button className="primary full" onClick={onStart} disabled={busy}>
        한 주 진행 <ChevronRight size={16} />
      </button>
      <button className="subtle full" onClick={onSchedule}>
        일정 수정
      </button>
    </div>
  );
}
