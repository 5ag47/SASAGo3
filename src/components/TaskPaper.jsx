import { Sparkles } from 'lucide-react';
import { TASKS } from '../game.js';

export default function TaskPaper({ tasks, onToggle }) {
  return (
    <section className="task-paper">
      <span className="tape tape-left" />
      <span className="tape tape-right" />
      <div className="paper-heading"><h2>이번 주 할 일</h2><span>TO DO</span></div>
      {TASKS.map((task, index) => (
        <label className={`task-check ${tasks[index] ? 'completed' : ''}`} key={task}>
          <input type="checkbox" checked={tasks[index]} onChange={() => onToggle(index)} />
          <span>{task}</span>
        </label>
      ))}
      <div className="paper-footer">
        <span>{tasks.filter(Boolean).length} / {TASKS.length} 완료</span>
        <Sparkles size={16} />
      </div>
    </section>
  );
}
