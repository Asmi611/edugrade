/**
 * Auth routes
 * -----------
 * POST /api/auth/register  — public; creates a pending user (and, for
 *                            teachers, persists their declared classes
 *                            into the teacher_classes table).
 * POST /api/auth/login     — public; validates credentials, blocks
 *                            non-approved accounts, returns JWT.
 * GET  /api/auth/me        — protected; returns the live user record.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { pool, query } = require('../db/pool');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/register', async (req, res, next) => {
  const { name, email, password, role, classes } = req.body || {};

  // ---- validation -----------------------------------------------------
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name is required (min 2 chars).' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password is required (min 6 chars).' });
  }
  if (!['student', 'teacher'].includes(role)) {
    return res
      .status(400)
      .json({ error: "Role must be 'student' or 'teacher'." });
  }

  let teacherClasses = [];
  if (role === 'teacher') {
    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        error: 'Teachers must declare at least one class.',
      });
    }
    teacherClasses = classes.map((c, i) => {
      const className = (c && c.class_name) || '';
      const subject = (c && c.subject) || '';
      if (!className.trim() || !subject.trim()) {
        const err = new Error(
          `Class entry #${i + 1} is missing class_name or subject.`
        );
        err.status = 400;
        throw err;
      }
      return { class_name: className.trim(), subject: subject.trim() };
    });
  }

    // ---- collect class_ids for students ---------------------------------
  let classIds = [];
  if (role === 'student') {
    if (Array.isArray(req.body.class_ids)) {
      classIds = req.body.class_ids.filter(Number.isInteger).filter(Boolean);
    }
  }

  // ---- insert (transactional) ----------------------------------------
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dupe = await client.query('SELECT 1 FROM users WHERE email = $1', [
      email.trim(),
    ]);
    if (dupe.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertUser = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, name, email, role, status, created_at`,
      [name.trim(), email.trim(), password_hash, role]
    );
    const user = insertUser.rows[0];

    if (role === 'teacher' && teacherClasses.length > 0) {
      const values = [];
      const placeholders = teacherClasses
        .map((c, i) => {
          const base = i * 3;
          values.push(user.id, c.class_name, c.subject);
          return `($${base + 1}, $${base + 2}, $${base + 3})`;
        })
        .join(', ');
      await client.query(
        `INSERT INTO teacher_classes (teacher_id, class_name, subject)
         VALUES ${placeholders}`,
        values
      );
    }

    // Enroll student in selected classes
    if (role === 'student' && classIds.length > 0) {
      const placeholders = classIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO class_enrollments (student_id, class_id)
         VALUES ${placeholders}
         ON CONFLICT DO NOTHING`,
        [user.id, ...classIds]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message:
        'Registration received. Your account is pending admin approval.',
      user: publicUser(user),
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    return next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!isEmail(email) || !password) {
    return res
      .status(400)
      .json({ error: 'Email and password are required.' });
  }

  try {
    const { rows } = await query(
      `SELECT id, name, email, password_hash, role, status, created_at
         FROM users
        WHERE email = $1`,
      [email.trim()]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'pending') {
      return res
        .status(403)
        .json({ error: 'Account pending admin approval' });
    }
    if (user.status === 'rejected') {
      return res
        .status(403)
        .json({ error: 'Account has been rejected. Please contact admin.' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: publicUser(user),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, role, status, created_at
         FROM users
        WHERE id = $1`,
      [req.user.id]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/classes  (public — for registration form)
// ---------------------------------------------------------------------------
router.get('/classes', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.subject, u.name AS teacher_name
         FROM classes c
         JOIN users u ON u.id = c.teacher_id
        ORDER BY c.name`
    );
    return res.json({ classes: rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
