import { lazy, Suspense, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCheck,
  Coffee,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useRemote } from '../hooks.js';
import { SLOTS } from '../../../shared/slots.js';
import { formatDate } from '../../../shared/dates.js';
import { DatePicker, ErrorMessage, LoadingPanel, Stats } from '../components/UI.jsx';

const TrendChart = lazy(() => import('../components/TrendChart.jsx'));
const icons = [Sunrise, Coffee, Sun, Moon];

export default function Dashboard() {
  const { user } = useAuth();
  const { date, setDate, today, revision, refresh, openReading, requestDelete } =
    useOutletContext();
  const [period, setPeriod] = useState('mtd');
  const daily = useRemote(`/reports?date=${date}&period=daily`, revision);
  const trend = useRemote(`/reports?date=${date}&period=${period}`, revision);
  const readings = daily.data?.readings || [];
  const count = daily.data?.summary.count ?? 0;
  const firstEmpty = SLOTS.find((slot) => !readings.some((reading) => reading.slot === slot.value));
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR DAILY OVERVIEW</span>
          <h1>
            Welcome back, {user.name.split(' ')[0]}
            <span className="greeting-dot">.</span>
          </h1>
          <p>A little check-in today. A clearer picture over time.</p>
        </div>
        <button
          className="button primary"
          disabled={daily.loading || !!daily.error || count >= 4}
          onClick={() => openReading({ slot: firstEmpty?.value })}
        >
          {count >= 4 ? (
            <>
              <CheckCheck size={18} />
              Day complete
            </>
          ) : (
            <>
              <Plus size={18} />
              Add reading
            </>
          )}
        </button>
      </div>
      <div className="day-bar">
        <div>
          <span className="section-kicker">{date === today ? 'TODAY' : 'SELECTED DAY'}</span>
          <strong>
            {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: undefined })}
          </strong>
        </div>
        <DatePicker date={date} onChange={setDate} today={today} />
      </div>
      {daily.error && <ErrorMessage message={daily.error} onRetry={refresh} />}
      <Stats summary={daily.data?.summary} loading={daily.loading} />
      <section className="readings-section">
        <div className="section-heading">
          <div>
            <h2>Your daily check-ins</h2>
            <p>Four moments to build your daily picture.</p>
          </div>
          <div className="daily-progress">
            <div className="progress-dots" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={n <= count ? 'filled' : ''} />
              ))}
            </div>
            <span>
              <strong>{count}</strong> of 4 logged
            </span>
          </div>
        </div>
        <div className="slot-grid">
          {SLOTS.map((slot, index) => {
            const reading = readings.find((r) => r.slot === slot.value);
            const Icon = icons[index];
            return (
              <article
                className={`slot-card slot-${index} ${reading ? 'has-reading' : ''}`}
                key={slot.value}
              >
                <div className="slot-top">
                  <span className="slot-icon">
                    <Icon size={22} />
                  </span>
                  {reading ? (
                    <span className="logged-badge">
                      <Check size={12} />
                      Logged
                    </span>
                  ) : (
                    <span className="pending-badge">Not logged</span>
                  )}
                </div>
                <h3>{slot.label}</h3>
                <p>{slot.description}</p>
                <div className="slot-value">
                  {daily.loading ? (
                    <span className="skeleton number-skeleton" />
                  ) : reading ? (
                    <>
                      {reading.value}
                      <small>mg/dl</small>
                    </>
                  ) : (
                    <span className="slot-empty-value">
                      — <small>mg/dl</small>
                    </span>
                  )}
                </div>
                {reading ? (
                  <div className="slot-actions">
                    <button
                      className="slot-action"
                      onClick={() => openReading({ reading })}
                      aria-label={`Edit ${slot.label} reading`}
                    >
                      <Pencil size={13} />
                      Edit reading
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => requestDelete(reading)}
                      aria-label={`Delete ${slot.label} reading`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="slot-add"
                    disabled={daily.loading || !!daily.error}
                    onClick={() => openReading({ slot: slot.value })}
                  >
                    <Plus size={15} />
                    Add {slot.label} reading
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel trend-panel">
          <div className="section-heading">
            <div>
              <h2>A look at your patterns</h2>
              <p>
                {trend.data
                  ? `${formatDate(trend.data.range.from)} – ${formatDate(trend.data.range.to)}`
                  : 'Your readings, over time'}
              </p>
            </div>
            <label className="sr-only" htmlFor="trend-period">
              Chart period
            </label>
            <select
              className="compact-select"
              id="trend-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="mtd">Month to date</option>
              <option value="monthly">Previous month</option>
            </select>
          </div>
          {trend.loading ? (
            <LoadingPanel />
          ) : trend.error ? (
            <ErrorMessage message={trend.error} onRetry={refresh} />
          ) : (
            <Suspense fallback={<LoadingPanel />}>
              <TrendChart readings={trend.data.readings} range={trend.data.range} />
            </Suspense>
          )}
        </section>
        <aside className="insight-panel">
          <span className="insight-spark">
            <Sparkles size={22} />
          </span>
          <span className="eyebrow">ONE DAY AT A TIME</span>
          <h2>{count === 4 ? 'Every check-in,\naccounted for.' : 'The little things\nadd up.'}</h2>
          <p>
            {count === 4
              ? 'All four slots are logged for this day. You can revisit or edit any reading whenever you need.'
              : 'Your daily readings become a useful record you can look back on, one check-in at a time.'}
          </p>
          <div className="insight-art" aria-hidden="true">
            <div className="art-leaf leaf-one" />
            <div className="art-leaf leaf-two" />
            <div className="art-stem" />
            <div className="art-pot" />
          </div>
          <Link to="/reports" className="insight-link">
            Explore your reports <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
      <div className="history-shortcut">
        <span>Looking for an earlier reading?</span>
        <Link to="/readings">
          View reading history <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
