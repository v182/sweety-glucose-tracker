import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { todayInZone } from '../../shared/dates.js';
import { SLOTS } from '../../shared/slots.js';
import { createAuth, originGuard } from './security.js';
import { authRoutes } from './routes/auth.js';
import { readingRoutes } from './routes/readings.js';
import { reportRoutes } from './routes/reports.js';
import { errorHandler } from './errors.js';

export function createApp({ db, config, clock = () => new Date(), authRateLimit = 20 }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy:
        config.nodeEnv === 'production'
          ? { directives: { upgradeInsecureRequests: config.cookieSecure ? [] : null } }
          : false,
      strictTransportSecurity: config.cookieSecure ? undefined : false,
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', originGuard(config));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  const today = () => todayInZone(config.timeZone, clock());
  const auth = createAuth(db, config);
  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.get('/api/meta', (_req, res) =>
    res.json({ today: today(), timeZone: config.timeZone, slots: SLOTS }),
  );
  app.use('/api/auth', authRoutes(db, auth, config, authRateLimit));
  app.use('/api/readings', auth.requireUser, auth.requireCsrf, readingRoutes(db, today));
  app.use('/api/reports', auth.requireUser, reportRoutes(db, today, config.timeZone));
  app.use('/api', (_req, res) =>
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'This endpoint could not be found.' } }),
  );
  app.use(errorHandler);
  return app;
}
