import { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { availableChapters, chapterProgress, chapterText } from '../../domain/story.js';
import './story.css';

const actions = { tutorial: '자습 안내', tasks: '할 일 보기', admissions: '알림 확인' };
export default function StoryPanel({ state, chapter, busy, onProgress, onNavigate, onClose }) {
  const saved = chapterProgress(state, chapter.id);
  const [replayPage, setReplayPage] = useState(0);
  const index = saved.read ? replayPage : saved.page;
  const page = chapter.pages[index],
    last = index === chapter.pages.length - 1;
  async function finish(target) {
    if (!saved.read && !(await onProgress('skip'))) return;
    if (target) onNavigate(target === 'admissions' ? 'notices' : target);
    else onClose();
  }
  async function next() {
    if (saved.read) setReplayPage((page) => page + 1);
    else await onProgress('next');
  }
  return (
    <section className="story-scene">
      <div className="story-location">
        <BookOpen size={16} />
        <span>{chapter.location}</span>
        <small>
          {index + 1} / {chapter.pages.length}
        </small>
      </div>
      <h2>{chapter.title}</h2>
      <div className="story-dialogue" aria-live="polite" aria-atomic="true">
        {page.speaker && <b>{page.speaker}</b>}
        <p>{chapterText(state, page)}</p>
      </div>
      <div className="story-actions">
        {last ? (
          <>
            <button className="primary" disabled={busy} onClick={() => finish(chapter.action)}>
              {actions[chapter.action]} <ArrowRight size={16} />
            </button>
            <button className="subtle" disabled={busy} onClick={() => finish()}>
              게임으로
            </button>
          </>
        ) : (
          <>
            <button className="primary" disabled={busy} onClick={next}>
              다음 <ArrowRight size={16} />
            </button>
            <button className="subtle" disabled={busy} onClick={() => finish()}>
              넘기기
            </button>
          </>
        )}
      </div>
    </section>
  );
}
export function StoryLibrary({ state, onOpen }) {
  if (!onOpen) return null;
  return (
    <details className="story-library">
      <summary>학교 이야기</summary>
      <div>
        {availableChapters(state).map((chapter) => (
          <button key={chapter.id} onClick={() => onOpen(chapter.id)}>
            <BookOpen size={16} />
            <b>{chapter.title}</b>
            <small>{chapterProgress(state, chapter.id).read ? '다시 읽기' : '이어서 읽기'}</small>
          </button>
        ))}
      </div>
    </details>
  );
}
