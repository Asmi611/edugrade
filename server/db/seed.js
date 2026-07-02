/**
 * Database seed script.
 * ---------------------
 * Inserts the default admin account so the platform can be operated
 * out-of-the-box. Idempotent — running it twice is safe.
 *
 * Default admin:
 *   email:    admin@edugrade.com
 *   password: Admin@123
 *   role:     admin
 *   status:   approved
 *
 * Override the credentials via environment variables if you wish:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Usage:
 *   npm run db:seed         (from /server)
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const ADMIN_NAME = process.env.ADMIN_NAME || 'EduGrade Admin';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@edugrade.com').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

async function seedAdmin() {
  // eslint-disable-next-line no-console
  console.log(`[seed] Seeding admin user (${ADMIN_EMAIL}) ...`);

  const existing = await pool.query(
    'SELECT id, role, status FROM users WHERE email = $1',
    [ADMIN_EMAIL]
  );

  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    // Make sure the existing row is actually a usable admin.
    if (row.role !== 'admin' || row.status !== 'approved') {
      await pool.query(
        `UPDATE users
            SET role   = 'admin',
                status = 'approved'
          WHERE id = $1`,
        [row.id]
      );
      // eslint-disable-next-line no-console
      console.log(`[seed] Existing user promoted to admin (id=${row.id}).`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed] Admin already present (id=${row.id}); nothing to do.`);
    }
    return;
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const insert = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, $2, $3, 'admin', 'approved')
     RETURNING id`,
    [ADMIN_NAME, ADMIN_EMAIL, password_hash]
  );

  // eslint-disable-next-line no-console
  console.log(
    `[seed] Admin created (id=${insert.rows[0].id}). ` +
      `Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`
  );
}

(async () => {
  try {
    await seedAdmin();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
