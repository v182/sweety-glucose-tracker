import pg from 'pg';

export function createPostgres(databaseUrl) {
  if (!databaseUrl)
    throw new Error(
      'DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.',
    );
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  pool.on('error', () => console.error('An idle database connection failed.'));
  const wrap = (client) => ({
    query: (sql, parameters = []) => client.query(sql, parameters),
    exec: (sql) => client.query(sql),
  });
  return {
    ...wrap(pool),
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const value = await callback(wrap(client));
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
