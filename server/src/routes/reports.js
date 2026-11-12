import { Router } from 'express';
import { isValidDate, reportRange } from '../../../shared/dates.js';
import { validationError } from '../errors.js';
import { slotOrder } from './readings.js';

export function reportRoutes(db, today, timeZone) {
  const router = Router();
  router.get('/', async (req, res) => {
    const { date = today(), period = 'daily' } = req.query;
    if (!isValidDate(date)) throw validationError({ date: 'Please choose a valid date.' });
    if (date > today()) throw validationError({ date: 'Date cannot be in the future.' });
    let range;
    try { range = reportRange(date, period); }
    catch (error) { throw validationError({ period: error.message }); }
    const { rows } = await db.query(`SELECT COUNT(*)::int AS count,
      MAX(value)::int AS highest, MIN(value)::int AS lowest,
      ROUND(AVG(value), 1)::float8 AS average,
      COALESCE(json_agg(json_build_object('id', id, 'date', reading_date::text,
        'slot', slot, 'value', value, 'created_at', created_at, 'updated_at', updated_at)
        ORDER BY reading_date, ${slotOrder}), '[]'::json) AS readings
      FROM readings WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`, [req.user.id, range.from, range.to]);
    const { readings, ...summary } = rows[0];
    res.json({ date, period, range, timeZone, summary, readings });
  });
  return router;
}
