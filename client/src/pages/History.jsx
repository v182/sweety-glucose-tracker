import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, Plus, RotateCcw } from 'lucide-react';
import { useRemote } from '../hooks.js';
import { SLOTS } from '../../../shared/slots.js';
import { EmptyState, ErrorMessage, LoadingPanel } from '../components/UI.jsx';
import { ReadingsTable } from '../components/ReadingsTable.jsx';

export default function History() {
  const { today, revision, refresh, openReading, requestDelete } = useOutletContext();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [slot, setSlot] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const query = new URLSearchParams({
    page,
    limit,
    ...(from && { from }),
    ...(to && { to }),
    ...(slot && { slot }),
  });
  const result = useRemote(`/readings?${query}`, revision);
  const pagination = result.data?.pagination;
  useEffect(() => {
    if (pagination && page > Math.max(1, pagination.totalPages))
      setPage(Math.max(1, pagination.totalPages));
  }, [pagination, page]);
  function filter(setter, value) {
    setter(value);
    setPage(1);
  }
  function clear() {
    setFrom('');
    setTo('');
    setSlot('');
    setPage(1);
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR RECORD, TOGETHER</span>
          <h1>
            Reading history<span className="greeting-dot">.</span>
          </h1>
          <p>Every check-in, ready when you need it.</p>
        </div>
        <button className="button primary" onClick={() => openReading({ date: today })}>
          <Plus size={18} />
          Add reading
        </button>
      </div>
      <section className="panel history-panel">
        <div className="filter-bar">
          <div className="filter-title">
            <Filter size={17} />
            Filter readings
          </div>
          <div className="filter-fields">
            <div className="filter-field">
              <label htmlFor="from-date">From</label>
              <input
                id="from-date"
                type="date"
                max={today}
                value={from}
                onChange={(e) => filter(setFrom, e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="to-date">To</label>
              <input
                id="to-date"
                type="date"
                max={today}
                value={to}
                onChange={(e) => filter(setTo, e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="filter-slot">Time slot</label>
              <select
                id="filter-slot"
                value={slot}
                onChange={(e) => filter(setSlot, e.target.value)}
              >
                <option value="">All slots</option>
                {SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {(from || to || slot) && (
              <button className="text-button reset-button" onClick={clear}>
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>
        </div>
        {result.error ? (
          <div className="panel-padding">
            <ErrorMessage message={result.error} onRetry={refresh} />
          </div>
        ) : result.loading ? (
          <LoadingPanel />
        ) : result.data?.items.length ? (
          <ReadingsTable
            readings={result.data.items}
            onEdit={openReading}
            onDelete={requestDelete}
          />
        ) : (
          <EmptyState
            title={
              from || to || slot ? 'No readings match these filters' : 'Your story starts here'
            }
            description={
              from || to || slot
                ? 'Try another date range or time slot.'
                : 'Add your first reading to start your personal record.'
            }
            action={
              <button
                className="button secondary"
                onClick={from || to || slot ? clear : () => openReading({ date: today })}
              >
                {from || to || slot ? 'Clear filters' : 'Add your first reading'}
              </button>
            }
          />
        )}
        <div className="pagination">
          <div>
            <label htmlFor="page-size">Rows per page</label>
            <select
              id="page-size"
              value={limit}
              onChange={(e) => filter(setLimit, Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <span>{pagination ? `${pagination.total} readings` : 'Loading…'}</span>
          </div>
          <div>
            <span>
              Page {page} of {Math.max(1, pagination?.totalPages || 1)}
            </span>
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={page <= 1 || result.loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={!pagination || page >= pagination.totalPages || result.loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
