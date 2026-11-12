import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { slotLabel } from '../../../shared/slots.js';
import { formatDate } from '../../../shared/dates.js';
import { Modal, ErrorMessage, Spinner } from './UI.jsx';
import { ReadingForm } from './ReadingForm.jsx';

export function ReadingDialog({ reading, date, slot, today, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={reading ? 'Edit your reading' : 'A small check-in'}
      subtitle={
        reading ? 'Update the details of this reading.' : 'Keep your daily picture up to date.'
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <ReadingForm
        initial={reading || { date, slot }}
        today={today}
        onCancel={onClose}
        onBusyChange={setBusy}
        onSave={async (body) => {
          await api(reading ? `/readings/${reading.id}` : '/readings', {
            method: reading ? 'PUT' : 'POST',
            body,
          });
          onSaved(reading ? 'Reading updated.' : 'Reading saved. A little progress, logged.');
        }}
      />
    </Modal>
  );
}

export function DeleteDialog({ reading, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api(`/readings/${reading.id}`, { method: 'DELETE' });
      onDeleted('Reading deleted.');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Delete this reading?"
      subtitle="This action cannot be undone."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {error && <ErrorMessage message={error} />}
      <div className="delete-preview">
        <span className="stat-icon peach">
          <Trash2 size={22} />
        </span>
        <div>
          <strong>{reading.value} mg/dl</strong>
          <p>
            {slotLabel(reading.slot)} · {formatDate(reading.date)}
          </p>
        </div>
      </div>
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Keep reading
        </button>
        <button className="button danger" disabled={busy} onClick={remove}>
          {busy ? <Spinner /> : <Trash2 size={16} />} Delete reading
        </button>
      </div>
    </Modal>
  );
}
