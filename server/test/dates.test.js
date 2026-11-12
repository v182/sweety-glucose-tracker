import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDate, todayInZone, reportRange } from '../../shared/dates.js';
import { readingErrors } from '../../shared/validation.js';

test('calendar validation rejects impossible dates and accepts leap days', () => {
  assert.equal(isValidDate('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', '0000-01-01', null])
    assert.equal(isValidDate(date), false);
});

test('today is calculated in the configured zone across midnight', () => {
  const now = new Date('2026-11-09T20:30:00Z');
  assert.equal(todayInZone('Asia/Kolkata', now), '2026-11-10');
  assert.equal(todayInZone('UTC', now), '2026-11-09');
});

test('all three report ranges follow the selected date', () => {
  assert.deepEqual(reportRange('2026-10-15', 'daily'), { from: '2026-10-15', to: '2026-10-15' });
  assert.deepEqual(reportRange('2026-10-15', 'mtd'), { from: '2026-10-01', to: '2026-10-15' });
  assert.deepEqual(reportRange('2026-10-15', 'monthly'), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(reportRange('2026-01-01', 'monthly'), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(reportRange('2024-03-10', 'monthly'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(reportRange('2025-03-10', 'monthly'), { from: '2025-02-01', to: '2025-02-28' });
});

test('value boundaries are inclusive, decimals and numeric strings are invalid', () => {
  for (const value of [40, 600])
    assert.deepEqual(
      readingErrors({ date: '2026-11-09', slot: 'fasting', value }, '2026-11-09'),
      {},
    );
  for (const value of [39, 601, 120.5, '120', NaN, Infinity, false])
    assert.ok(readingErrors({ date: '2026-11-09', slot: 'fasting', value }, '2026-11-09').value);
});
