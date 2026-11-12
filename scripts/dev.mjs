// The normal development path always uses the PostgreSQL connection.
// This explicit opt-in is only for environments without a PostgreSQL service.
const portOption = process.argv.indexOf('--port');
if (portOption !== -1) {
  if (!process.argv[portOption + 1]) throw new Error('--port requires a port number.');
  process.env.PORT = process.argv[portOption + 1];
}
if (process.env.SWEETY_LOCAL_DEMO === 'true') {
  await import('./preview-demo.mjs');
} else {
  const { loadConfig } = await import('../server/src/config.js');
  const { createPostgres } = await import('../server/src/db/postgres.js');
  const { startServer } = await import('../server/src/index.js');
  const config = loadConfig();
  const db = createPostgres(config.databaseUrl);
  await db.query('SELECT 1');
  await startServer(db, config);
}
