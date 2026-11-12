import { Pencil, Trash2 } from 'lucide-react';
import { SLOTS, slotLabel } from '../../../shared/slots.js';
import { formatDate } from '../../../shared/dates.js';

export function ReadingsTable({ readings, onEdit, onDelete }) {
  return (
    <div className="table-scroll">
      <table className="readings-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Time slot</th>
            <th scope="col">
              Glucose <span>(mg/dl)</span>
            </th>
            {onEdit && (
              <th scope="col" className="actions-column">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <tr key={reading.id}>
              <td>{formatDate(reading.date)}</td>
              <td>
                <span className="table-slot">
                  <i style={{ background: SLOTS.find((s) => s.value === reading.slot)?.color }} />
                  {slotLabel(reading.slot)}
                </span>
              </td>
              <td>
                <strong className="table-value">{reading.value}</strong>
              </td>
              {onEdit && (
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      onClick={() => onEdit({ reading })}
                      aria-label={`Edit ${slotLabel(reading.slot)} on ${reading.date}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button delete-icon"
                      onClick={() => onDelete(reading)}
                      aria-label={`Delete ${slotLabel(reading.slot)} on ${reading.date}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
