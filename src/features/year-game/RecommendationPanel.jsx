import { TEACHERS } from '../../domain/catalog.js';
import { admissionDefinitions } from '../../domain/school-record.js';
import { Progress } from './ui.jsx';
export default function RecommendationPanel({ state, onSchedule }) {
  const review = state.recommendation;
  if (!review) return null;
  return (
    <section className="recommendation-panel">
      <h3>추천서 · {TEACHERS[review.teacher]}</h3>
      <p>
        {{ preparing: '자료 확인 중', reviewing: '검토 중', ready: '준비 완료' }[review.status]}
      </p>
      <Progress
        value={review.progress}
        max={review.target ?? admissionDefinitions.recommendation_support.sessions}
        label="추천서 자료 확인"
      />
      {review.status === 'preparing' && (
        <>
          <p>자습시간에 해당 선생님과의 상담을 배정하세요.</p>
          {onSchedule && (
            <button className="subtle full" onClick={onSchedule}>
              상담 시간 잡기
            </button>
          )}
        </>
      )}
    </section>
  );
}
