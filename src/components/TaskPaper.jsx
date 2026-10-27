import { TASKS } from '../game.js';
import { weeklyGoals } from '../systems/week.js';
export default function TaskPaper({
  plan
}) {
  const tasks = weeklyGoals(plan);
  return <section className="task-paper"><span className="tape tape-left" /><span className="tape tape-right" />
    <div className="paper-heading"><h2>할 일</h2></div>
    {TASKS.map((task, index) => <div className={`task-check ${tasks[index] ? 'completed' : ''}`} key={task}><span aria-label={tasks[index] ? '계획 충족' : '미충족'}>{tasks[index] ? '☑' : '☐'}</span><span>{task}</span></div>)}
  </section>;
}
