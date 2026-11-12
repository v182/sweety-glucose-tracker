// Development/test helper only. The submitted application uses node-postgres.
// PGlite executes the same PostgreSQL SQL in a single-process WASM engine.
import { PGlite } from '@electric-sql/pglite';

export async function createEmbeddedDb(path) {
  const db = new PGlite(path);
  await db.waitReady;
  const wrap = (client) => ({ query: (sql, args = []) => client.query(sql, args), exec: (sql) => client.exec(sql) });
  return { ...wrap(db), transaction: (callback) => db.transaction((tx) => callback(wrap(tx))), close: () => db.close() };
}
