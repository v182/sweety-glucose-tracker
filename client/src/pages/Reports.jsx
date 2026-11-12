import { lazy, Suspense, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarRange, Info, Plus } from 'lucide-react';
import { useRemote } from '../hooks.js';
import { DatePicker, EmptyState, ErrorMessage, LoadingPanel, Stats } from '../components/UI.jsx';
import { ReadingsTable } from '../components/ReadingsTable.jsx';
import { formatDate } from '../../../shared/dates.js';

const TrendChart = lazy(() => import('../components/TrendChart.jsx'));
const periods = [
  { value: 'daily', label: 'Daily', hint: 'Readings on your selected date.' },
  {
    value: 'mtd',
    label: 'Month to date',
    hint: 'From the first of the selected month through your selected date.',
  },
  {
    value: 'monthly',
    label: 'Previous month',
    hint: 'The entire calendar month before your selected date’s month.',
  },
];

export default function Reports() {
  const { date, setDate, today, revision, refresh, openReading, requestDelete } =
    useOutletContext();
  const [period, setPeriod] = useState('daily');
  const result = useRemote(`/reports?date=${date}&period=${period}`, revision);
  const active = periods.find((p) => p.value === period);
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEE YOUR DAYS COME TOGETHER</span>
          <h1>
            Your reports<span className="greeting-dot">.</span>
          </h1>
          <p>A clear view of the readings you’ve recorded.</p>
        </div>
        <DatePicker date={date} onChange={setDate} today={today} />
      </div>
      <div className="report-controls">
        <div className="segmented" aria-label="Report period">
          {periods.map((p) => (
            <button
              key={p.value}
              aria-pressed={period === p.value}
              className={period === p.value ? 'selected' : ''}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="report-range">
          <CalendarRange size={17} />
          {result.data
            ? result.data.range.from === result.data.range.to
              ? formatDate(result.data.range.from)
              : `${formatDate(result.data.range.from)} – ${formatDate(result.data.range.to)}`
            : 'Loading date range…'}
        </span>
      </div>
      <p className="period-explanation">
        <Info size={14} />
        {active.hint}
      </p>
      {result.error && <ErrorMessage message={result.error} onRetry={refresh} />}
      <Stats summary={result.data?.summary} loading={result.loading} />
      <section className="panel report-chart">
        <div className="section-heading">
          <div>
            <h2>{period === 'daily' ? 'Your day at a glance' : 'Your readings over time'}</h2>
            <p>Each time slot has its own colour. Values are shown in mg/dl.</p>
          </div>
          <span className="subtle-badge">{active.label}</span>
        </div>
        {result.loading ? (
          <LoadingPanel />
        ) : (
          result.data && (
            <Suspense fallback={<LoadingPanel />}>
              <TrendChart readings={result.data.readings} range={result.data.range} />
            </Suspense>
          )
        )}
      </section>
      <section className="panel report-details">
        <div className="section-heading">
          <div>
            <h2>{period === 'daily' ? 'Daily readings' : 'Readings in this report'}</h2>
            <p>The exact values behind your summary.</p>
          </div>
          <span className="subtle-badge">{result.data?.summary.count ?? 0} readings</span>
        </div>
        {result.loading ? (
          <LoadingPanel />
        ) : result.data?.readings.length ? (
          <ReadingsTable
            readings={result.data.readings}
            onEdit={openReading}
            onDelete={requestDelete}
          />
        ) : (
          !result.error && (
            <EmptyState
              title="No readings for this period"
              description="Choose another date, or add a reading to begin."
              action={
                <button className="button secondary" onClick={() => openReading()}>
                  <Plus size={16} />
                  Add reading
                </button>
              }
            />
          )
        )}
      </section>
    </div>
  );
}
