import { Component } from 'react';
import { record } from '../../platform/diagnostics.js';
export default class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error, info) {
    record('error', 'RENDER_FAILED', {
      message: String(error.name),
      component: info.componentStack?.slice(0, 600),
    });
  }
  render() {
    if (this.state.error)
      return (
        <div className="pause-screen">
          <h1>화면을 여는 중 문제가 생겼어요.</h1>
          <p>저장 기록은 삭제하지 않았어요. 새로고침한 뒤 설정에서 진단 보고서를 내려받으세요.</p>
          <button className="primary" onClick={() => location.reload()}>
            저장 상태로 다시 열기
          </button>
        </div>
      );
    return this.props.children;
  }
}
