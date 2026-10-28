import { useState } from 'react';
import TaskEditor from './TaskEditor.jsx';
import CalendarEditor from './CalendarEditor.jsx';
export default function AuthoringApp() {
  const [tab, setTab] = useState('tasks');
  return (
    <>
      <nav className="authoring-tabs" aria-label="편집 대상">
        <button aria-pressed={tab === 'tasks'} onClick={() => setTab('tasks')}>
          과제·미니게임
        </button>
        <button aria-pressed={tab === 'calendar'} onClick={() => setTab('calendar')}>
          학사 달력
        </button>
      </nav>
      <div hidden={tab !== 'tasks'}>
        <TaskEditor />
      </div>
      <div hidden={tab !== 'calendar'}>
        <CalendarEditor />
      </div>
    </>
  );
}
