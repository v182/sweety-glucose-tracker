import { createEmbeddedDb } from './embedded-db.mjs';
import { loadConfig } from '../server/src/config.js';
import { migrate } from '../server/src/db/migrate.js';
import { seed } from '../server/src/db/seed.js';
import { startServer } from '../server/src/index.js';

if (process.env.NODE_ENV === 'production')
  throw new Error('The embedded demo is for local development only. Use PostgreSQL in production.');
const config = loadConfig();
const db = await createEmbeddedDb(new URL('../.preview-data', import.meta.url).pathname);
await migrate(db);
await seed(db, {
  email: 'demo@sweety.local',
  password: 'SweetyDemo!2026',
  name: 'Alex Morgan',
  timeZone: config.timeZone,
});
console.log(
  'Synthetic local demo: demo@sweety.local / SweetyDemo!2026. Storage: embedded PostgreSQL.',
);
await startServer(db, config);
