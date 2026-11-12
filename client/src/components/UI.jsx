import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Hash,
  Inbox,
  LoaderCircle,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { addDays } from '../../../shared/dates.js';

export function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner" role="status">
      <LoaderCircle size={18} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title = 'A fresh start',
  description = 'Add a reading and it will appear here.',
  action,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingPanel() {
  return (
    <div className="loading-panel" aria-label="Loading readings" role="status">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

export function DatePicker({ date, onChange, today, label = 'Selected date' }) {
  return (
    <div className="date-picker">
      <button
        className="icon-button"
        aria-label="Previous day"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft size={17} />
      </button>
      <div className="date-input-wrap">
        <CalendarDays size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor={`date-${label.replaceAll(' ', '-')}`}>
          {label}
        </label>
        <input
          id={`date-${label.replaceAll(' ', '-')}`}
          type="date"
          value={date}
          max={today}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        />
      </div>
      <button
        className="icon-button"
        aria-label="Next day"
        disabled={date >= today}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight size={17} />
      </button>
      {date !== today && (
        <button className="today-button" onClick={() => onChange(today)}>
          Today
        </button>
      )}
    </div>
  );
}

export function Stats({ summary, loading = false }) {
  const cards = [
    {
      label: 'Average glucose',
      value: summary?.average == null ? '—' : Number(summary.average).toFixed(1),
      unit: 'mg/dl',
      Icon: Activity,
      color: 'teal',
      caption: 'Across your logged readings',
    },
    {
      label: 'Highest reading',
      value: summary?.highest ?? '—',
      unit: 'mg/dl',
      Icon: ArrowUpRight,
      color: 'peach',
      caption: 'Highest value in this period',
    },
    {
      label: 'Lowest reading',
      value: summary?.lowest ?? '—',
      unit: 'mg/dl',
      Icon: ArrowDownLeft,
      color: 'blue',
      caption: 'Lowest value in this period',
    },
    {
      label: 'Total readings',
      value: summary?.count ?? 0,
      unit: 'readings',
      Icon: Hash,
      color: 'lavender',
      caption: 'Every check-in counts',
    },
  ];
  return (
    <div className="stats-grid">
      {cards.map(({ label, value, unit, Icon, color, caption }) => (
        <section className="stat-card" key={label}>
          <div className="stat-top">
            <span>{label}</span>
            <span className={`stat-icon ${color}`}>
              <Icon size={19} />
            </span>
          </div>
          <div className="stat-number">
            {loading ? <span className="skeleton number-skeleton" /> : value}
            <small>{unit}</small>
          </div>
          <p>{caption}</p>
        </section>
      ))}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const node = dialogRef.current;
    node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, 4500);
    return () => clearTimeout(id);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <span>
        <Check size={17} />
      </span>
      {message}
      <button className="icon-button" aria-label="Dismiss notification" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
