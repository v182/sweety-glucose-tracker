import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readingErrors } from '../../../shared/validation.js';
import { isValidDate } from '../../../shared/dates.js';
import { SLOT_VALUES, slotLabel } from '../../../shared/slots.js';
import { ApiError, validationError } from '../errors.js';

const columns = 'id, reading_date::text AS date, slot, value, created_at, updated_at';
export const slotOrder = `CASE slot WHEN 'fasting' THEN 1 WHEN 'after_breakfast' THEN 2 WHEN 'after_lunch' THEN 3 ELSE 4 END`;
const notFound = () => new ApiError(404, 'NOT_FOUND', 'This reading could not be found.');
const validId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function positiveInteger(value, fallback, max, field) {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value) ||
    Number(value) < 1 ||
    Number(value) > max
  ) {
    throw validationError({ [field]: `${field} must be a whole number between 1 and ${max}.` });
  }
  return Number(value);
}

async function ensureAvailable(tx, userId, date, slot, exceptId = null) {
  const { rows } = await tx.query(
    `SELECT id, slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND ($3::uuid IS NULL OR id <> $3)`,
    [userId, date, exceptId],
  );
  if (rows.length >= 4) throw new ApiError(409, 'DAY_FULL', 'You can add only 4 readings per day.');
  if (rows.some((row) => row.slot === slot)) {
    throw new ApiError(
      409,
      'DUPLICATE_SLOT',
      `You already have ${slot === 'fasting' ? 'a' : 'an'} ${slotLabel(slot)} reading for this date.`,
      {
        slot: `You already have ${slot === 'fasting' ? 'a' : 'an'} ${slotLabel(slot)} reading for this date.`,
      },
    );
  }
}

export function readingRoutes(db, today) {
  const router = Router();
  router.get('/', async (req, res) => {
    const { from, to, slot } = req.query;
    const page = positiveInteger(req.query.page, 1, 1000000, 'page');
    const limit = positiveInteger(req.query.limit, 20, 100, 'limit');
    const parameters = [req.user.id];
    const conditions = ['user_id = $1'];
    for (const [field, value, operator] of [
      ['from', from, '>='],
      ['to', to, '<='],
    ]) {
      if (value !== undefined) {
        if (!isValidDate(value)) throw validationError({ [field]: 'Please choose a valid date.' });
        parameters.push(value);
        conditions.push(`reading_date ${operator} $${parameters.length}`);
      }
    }
    if (from && to && from > to)
      throw validationError({ from: 'Start date must be on or before end date.' });
    if (slot !== undefined) {
      if (!SLOT_VALUES.includes(slot))
        throw validationError({ slot: 'Please choose a valid slot.' });
      parameters.push(slot);
      conditions.push(`slot = $${parameters.length}`);
    }
    const where = conditions.join(' AND ');
    // Both count and page are evaluated in the same statement/snapshot.
    const count = `SELECT COUNT(*)::int AS total FROM readings WHERE ${where}`;
    const paged = `SELECT ${columns} FROM readings WHERE ${where} ORDER BY reading_date DESC, ${slotOrder}, id LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`;
    const { rows } = await db.query(
      `SELECT (${count}) AS total, COALESCE((SELECT json_agg(p) FROM (${paged}) p), '[]'::json) AS items`,
      [...parameters, limit, (page - 1) * limit],
    );
    res.json({
      items: rows[0].items,
      pagination: {
        page,
        limit,
        total: rows[0].total,
        totalPages: Math.ceil(rows[0].total / limit),
      },
    });
  });

  router.post('/', async (req, res) => {
    const fields = readingErrors(req.body, today());
    if (Object.keys(fields).length) throw validationError(fields);
    const { date, slot, value } = req.body;
    const reading = await db.transaction(async (tx) => {
      // Every write for this user obtains the same lock, including date/slot moves.
      await tx.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      await ensureAvailable(tx, req.user.id, date, slot);
      const { rows } = await tx.query(
        `INSERT INTO readings(id, user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
        [randomUUID(), req.user.id, date, slot, value],
      );
      return rows[0];
    });
    res.status(201).json({ reading });
  });

  router.put('/:id', async (req, res) => {
    if (!validId(req.params.id)) throw notFound();
    const fields = readingErrors(req.body, today());
    if (Object.keys(fields).length) throw validationError(fields);
    const { date, slot, value } = req.body;
    const reading = await db.transaction(async (tx) => {
      await tx.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      const existing = await tx.query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id,
      ]);
      if (!existing.rows.length) throw notFound();
      await ensureAvailable(tx, req.user.id, date, slot, req.params.id);
      const { rows } = await tx.query(
        `UPDATE readings SET reading_date = $1, slot = $2, value = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING ${columns}`,
        [date, slot, value, req.params.id, req.user.id],
      );
      return rows[0];
    });
    res.json({ reading });
  });

  router.delete('/:id', async (req, res) => {
    if (!validId(req.params.id)) throw notFound();
    await db.transaction(async (tx) => {
      await tx.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      const { rows } = await tx.query(
        'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user.id],
      );
      if (!rows.length) throw notFound();
    });
    res.status(204).end();
  });
  return router;
}
