import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Check,
  Coffee,
  FlaskConical,
  Gamepad2,
  Heart,
  Home,
  MessageCircle,
  Moon,
  Pencil,
  PencilLine,
  Sparkles,
  Users,
} from 'lucide-react';
import { activities, STATS } from '../../domain/catalog.js';
export const ACTIVITY_ICONS = {
  study: BookOpen,
  task: Pencil,
  research: FlaskConical,
  study_group: Users,
  interview: MessageCircle,
  essay: Pencil,
  teacher: Coffee,
  club: Sparkles,
  academy: Brain,
  science_academy: FlaskConical,
  csat_study: PencilLine,
  lecture: BookOpen,
  clean: Home,
  exercise: Heart,
  sleep: Moon,
  game: Gamepad2,
  out: Coffee,
  work: Users,
};
export function ActivityIcon({ id, size = 17 }) {
  const Icon = ACTIVITY_ICONS[id] ?? BookOpen;
  return <Icon size={size} strokeWidth={1.65} />;
}
export function Progress({ value, max = 100, min = 0, color, label }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <span
        style={{
          width: `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`,
          background: color,
        }}
      />
    </div>
  );
}
export function StatList({ stats, keys = Object.keys(STATS), compact = false }) {
  return (
    <div className={`stat-list ${compact ? 'compact' : ''}`}>
      {keys.map((key) => (
        <div className="stat-line" key={key}>
          <span>{STATS[key].name}</span>
          <Progress
            value={stats[key]}
            min={key === 'focus' ? -100 : 0}
            color={STATS[key].color}
            label={STATS[key].name}
          />
          <b>{Math.round(stats[key])}</b>
        </div>
      ))}
    </div>
  );
}
export function Delta({ value, stat }) {
  const good = stat === 'stress' ? value < 0 : value > 0;
  return (
    <span className={`delta ${value === 0 ? 'neutral' : good ? 'good' : 'bad'}`}>
      {value > 0 ? '+' : ''}
      {value}
    </span>
  );
}
export function Empty({ children }) {
  return (
    <div className="empty-state">
      <Sparkles size={24} />
      <p>{children}</p>
    </div>
  );
}
export function PanelHeading({ eyebrow, title, children }) {
  return (
    <div className="panel-heading">
      <div>
        {eyebrow && <small>{eyebrow}</small>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function ChoiceButton({ title, description, onClick, selected, disabled, icon, anchor }) {
  return (
    <button
      className={`choice-row ${selected ? 'selected' : ''}`}
      data-tutorial={anchor}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      <span className="choice-mark">
        {selected ? <Check size={16} /> : (icon ?? <ArrowUpRight size={16} />)}
      </span>
      <span>
        <b>{title}</b>
        <small>{description}</small>
      </span>
    </button>
  );
}
export const activityName = (id) => (id === 'sleep' ? '호실 · 휴식' : (activities[id]?.name ?? id));
export const SESSIONS = ['아침 자습', '1자', '2자'];
