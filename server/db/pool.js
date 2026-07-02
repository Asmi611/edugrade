/**
 * Shared PostgreSQL connection pool.
 * ---------------------------------
 * All route modules should import { pool, query } from this file rather
 * than constructing their own pg.Pool — that keeps connection counts
 * predictable and centralises configuration.
 *
 * Configuration is read from environment variables (see server/.env.example):
 *   - DATABASE_URL  (preferred, full connection string)
 *   - PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE  (fallback)
 */

require('dotenv').config();
const { Pool } = require('pg');

const useConnectionString = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
  useConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.PGSSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT, 10) || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'edugrade',
      }
);

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[edugrade-api] Unexpected PG pool error:', err);
});

/**
 * Convenience wrapper: pool.query with an automatic stringified call site.
 * Usage:
 *   const { rows } = await query('SELECT 1');
 */
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
