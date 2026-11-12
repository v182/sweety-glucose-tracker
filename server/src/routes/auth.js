import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { rateLimit } from 'express-rate-limit';
import { ApiError, validationError } from '../errors.js';

export function authRoutes(db, auth, config, maxAttempts = 20) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: maxAttempts, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in 15 minutes.' } } });

  router.post('/register', limiter, async (req, res) => {
    const { name, email, password } = req.body || {};
    const fields = {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) fields.name = 'Please enter a name between 2 and 80 characters.';
    if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fields.email = 'Please enter a valid email address.';
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) fields.password = 'Use at least 8 characters and no more than 72 bytes for your password.';
    if (Object.keys(fields).length) throw validationError(fields);
    const user = { id: randomUUID(), name: name.trim(), email: email.trim().toLowerCase() };
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    try {
      await db.query('INSERT INTO users(id, name, email, password_hash) VALUES ($1, $2, $3, $4)', [user.id, user.name, user.email, passwordHash]);
    } catch (error) {
      if (error.code === '23505') throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
      throw error;
    }
    res.status(201).json(await auth.startSession(user, res));
  });

  router.post('/login', limiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !password || email.length > 254 || Buffer.byteLength(password) > 72) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    const { rows } = await db.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    // A valid fixed bcrypt hash keeps unknown-email attempts on the bcrypt path too.
    const dummyHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx5VtUe1R9v1jHqRrL1gWJ9vZbK';
    const valid = await bcrypt.compare(password, rows[0]?.password_hash || dummyHash);
    if (!rows[0] || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    res.json(await auth.startSession(rows[0], res));
  });

  router.get('/me', auth.requireUser, (req, res) => res.json({ user: req.user, csrfToken: req.session.csrfToken }));
  router.post('/logout', auth.requireUser, auth.requireCsrf, auth.logout);
  return router;
}
