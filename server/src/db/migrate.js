import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createPostgres } from './postgres.js';
import { loadConfig } from '../config.js';

export async function migrate(db) {
  const directory = new URL('./migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  await db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(712494)');
    await tx.exec(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    );
    for (const file of files) {
      const applied = await tx.query('SELECT version FROM schema_migrations WHERE version = $1', [
        file,
      ]);
      if (applied.rows.length) continue;
      await tx.exec(await readFile(new URL(file, directory), 'utf8'));
      await tx.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = createPostgres(loadConfig().databaseUrl);
  try {
    await migrate(db);
    console.log('Database migrations are up to date.');
  } finally {
    await db.close();
  }
}
