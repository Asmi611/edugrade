/**
 * Database schema initialiser.
 * ----------------------------
 * Reads db/schema.sql and executes it via the Node.js pg client.
 * This replaces the psql-based db:init script so that users on
 * Windows (or any system without psql in PATH) can still initialise
 * the database.
 *
 * Prerequisite: the PostgreSQL database must already exist.
 * Create it with:  createdb edugrade   (or via pgAdmin)
 *
 * Usage:
 *   node db/init.js          (from /server)
 *   npm run db:init          (from /server or project root)
 */

require('dotenv').config();

const { readFileSync } = require('fs');
const { join } = require('path');
const { pool } = require('./pool');

const SCHEMA_PATH = join(__dirname, 'schema.sql');

(async () => {
  const sql = readFileSync(SCHEMA_PATH, 'utf8');

  // eslint-disable-next-line no-console
  console.log('[db:init] Applying schema from db/schema.sql ...');

  try {
    await pool.query(sql);
    // eslint-disable-next-line no-console
    console.log('[db:init] Schema applied successfully.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db:init] Failed:', err.message);
    // if the error is just "database does not exist", give a clear hint
    if (err.message?.includes('does not exist')) {
      // eslint-disable-next-line no-console
      console.error(
        '\nHint: The database does not exist yet. Create it first:\n' +
          '  createdb edugrade\n' +
          'Or via pgAdmin: create a database named "edugrade"\n'
      );
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
