import { useState } from 'react';
import { Check, Droplet } from 'lucide-react';
import { SLOTS } from '../../../shared/slots.js';
import { readingErrors } from '../../../shared/validation.js';
import { ErrorMessage, Spinner } from './UI.jsx';

export function ReadingForm({ initial = {}, today, onSave, onCancel, onBusyChange = () => {} }) {
  const [date, setDate] = useState(initial.date || today);
  const [slot, setSlot] = useState(initial.slot || 'fasting');
  const [value, setValue] = useState(initial.value == null ? '' : String(initial.value));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const body = {
      date,
      slot,
      value: value.trim() === '' ? '' : /^\d+$/.test(value.trim()) ? Number(value) : NaN,
    };
    const nextErrors = readingErrors(body, today);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    onBusyChange(true);
    try {
      await onSave(body);
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message || 'Unable to save. Please try again.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form onSubmit={submit} className="reading-form" noValidate>
      {error && <ErrorMessage message={error} />}
      <div className="form-field">
        <label htmlFor="reading-date">Date</label>
        <input
          id="reading-date"
          type="date"
          value={date}
          max={today}
          disabled={busy}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!errors.date}
          aria-describedby={errors.date ? 'reading-date-error' : undefined}
        />
        {errors.date && (
          <span className="field-error" id="reading-date-error">
            {errors.date}
          </span>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="reading-slot">Time slot</label>
        <select
          id="reading-slot"
          value={slot}
          disabled={busy}
          onChange={(e) => setSlot(e.target.value)}
          aria-invalid={!!errors.slot}
          aria-describedby={errors.slot ? 'reading-slot-error' : undefined}
        >
          {SLOTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {errors.slot && (
          <span className="field-error" id="reading-slot-error">
            {errors.slot}
          </span>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="reading-value">Blood glucose</label>
        <div className="glucose-input">
          <Droplet size={21} />
          <input
            autoFocus
            id="reading-value"
            type="text"
            inputMode="numeric"
            value={value}
            placeholder="e.g. 120"
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!errors.value}
            aria-describedby={errors.value ? 'reading-value-error' : 'reading-value-hint'}
          />
          <span>mg/dl</span>
        </div>
        {errors.value ? (
          <span className="field-error" id="reading-value-error">
            {errors.value}
          </span>
        ) : (
          <span className="field-hint" id="reading-value-hint">
            Enter a whole number between 40 and 600.
          </span>
        )}
      </div>
      <div className="form-note">
        <Check size={16} />
        <span>One reading per time slot. Up to four each day.</span>
      </div>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Saving…
            </>
          ) : initial.id ? (
            'Save changes'
          ) : (
            'Save reading'
          )}
        </button>
      </div>
    </form>
  );
}
