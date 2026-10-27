import { Sparkles } from 'lucide-react';
import { TASKS } from '../game.js';
import { weeklyGoals } from '../systems/week.js';
export default function TaskPaper({
  plan
}) {
  const tasks = weeklyGoals(plan);
  return <section className="task-paper"><span className="tape tape-left" /><span className="tape tape-right" />
    <div className="paper-heading"><h2>이번 주 목표</h2><span>TO DO</span></div>
    {TASKS.map((task, index) => <div className={`task-check ${tasks[index] ? 'completed' : ''}`} key={task}><span aria-label={tasks[index] ? '계획 충족' : '미충족'}>{tasks[index] ? '☑' : '☐'}</span><span>{task}</span></div>)}
    <div className="paper-footer"><span>{tasks.filter(Boolean).length} / 2 계획 충족 · 완료당 1,000원</span><Sparkles size={16} /></div>
  </section>;
}
