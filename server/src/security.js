import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors.js';

export const COOKIE_NAME = 'sweety_session';
const unsafe = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const hashToken = (value) => createHash('sha256').update(value).digest('hex');
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email });

export function originGuard(config) {
  return (req, _res, next) => {
    if (!unsafe.has(req.method)) return next();
    const origin = req.get('origin');
    const expected = config.appOrigin || `${req.protocol}://${req.get('host')}`;
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expected)) {
      return next(new ApiError(403, 'ORIGIN_REJECTED', 'This request came from an untrusted origin.'));
    }
    next();
  };
}

export function createAuth(db, config) {
  const cookieOptions = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/api' };
  return {
    async startSession(user, res) {
      const token = randomBytes(32).toString('base64url');
      const csrfToken = randomBytes(32).toString('hex');
      const maxAge = config.sessionTtlDays * 24 * 60 * 60 * 1000;
      await db.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at <= NOW()', [user.id]);
      await db.query('INSERT INTO sessions(token_hash, user_id, csrf_token, expires_at) VALUES ($1, $2, $3, $4)', [hashToken(token), user.id, csrfToken, new Date(Date.now() + maxAge)]);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge });
      return { user: publicUser(user), csrfToken };
    },
    async requireUser(req, _res, next) {
      const token = req.cookies[COOKIE_NAME];
      if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
      const result = await db.query(`SELECT u.id, u.name, u.email, s.csrf_token, s.token_hash
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [hashToken(token)]);
      if (!result.rows.length) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Please log in again.');
      req.user = publicUser(result.rows[0]);
      req.session = { tokenHash: result.rows[0].token_hash, csrfToken: result.rows[0].csrf_token };
      next();
    },
    requireCsrf(req, _res, next) {
      if (!unsafe.has(req.method)) return next();
      const supplied = req.get('x-csrf-token') || '';
      const expected = req.session.csrfToken;
      if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
        return next(new ApiError(403, 'CSRF_REJECTED', 'Please refresh the page and try again.'));
      }
      next();
    },
    async logout(req, res) {
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [req.session.tokenHash]);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.status(204).end();
    },
  };
}
