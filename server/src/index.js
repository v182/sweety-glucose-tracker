import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { createPostgres } from './db/postgres.js';
import { loadConfig } from './config.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

export async function startServer(db, config) {
  const app = createApp({ db, config });
  let vite;
  if (config.nodeEnv !== 'production') {
    const { createServer } = await import('vite');
    vite = await createServer({
      configFile: resolve(root, 'client/vite.config.js'),
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(resolve(root, 'client/dist'), { index: false }));
    app.get(/.*/, (_req, res) => res.sendFile(resolve(root, 'client/dist/index.html')));
  }
  const server = app.listen(config.port, '0.0.0.0', () =>
    console.log(`Sweety is listening on port ${config.port}.`),
  );
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    server.closeAllConnections();
    server.close();
    await vite?.close();
    await db.close();
  };
  process.once('SIGTERM', () => close().then(() => process.exit(0)));
  process.once('SIGINT', () => close().then(() => process.exit(0)));
  return { app, server, close };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const db = createPostgres(config.databaseUrl);
  await db.query('SELECT 1');
  await startServer(db, config);
}
