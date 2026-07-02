/**
 * Admin routes
 * ------------
 * All endpoints require an authenticated user with role='admin'.
 *
 *   GET    /api/admin/users?role=&status=     list users (filterable)
 *   PATCH  /api/admin/users/:id/status        update status (approved/rejected/pending)
 *   PATCH  /api/admin/users/:id/role          change role
 *   DELETE /api/admin/users/:id               delete user (cannot delete self)
 *   GET    /api/admin/stats                   platform-wide totals
 *   GET    /api/admin/exams                   exams + creator name + class
 *   GET    /api/admin/submissions             submissions + student + exam
 *   POST   /api/admin/exams                   create an exam (same flow as teacher)
 */

const express = require('express');

const { pool, query } = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require a valid admin JWT.
router.use(authMiddleware, requireRole('admin'));

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------
const VALID_STATUSES = ['pending', 'approved', 'rejected'];
const VALID_ROLES = ['student', 'teacher', 'admin'];

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
// GET /api/admin/users
// ---------------------------------------------------------------------------
router.get('/users', async (req, res, next) => {
  const { role, status } = req.query;
  const params = [];
  const where = [];

  if (role) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role filter.' });
    }
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter.' });
    }
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  const sql =
    `SELECT id, name, email, role, status, created_at
       FROM users
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC`;

  try {
    const { rows } = await query(sql, params);
    return res.json({ users: rows.map(publicUser) });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/status
// ---------------------------------------------------------------------------
router.patch('/users/:id/status', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update the user's status
    const { rows } = await client.query(
      `UPDATE users
          SET status = $1
        WHERE id = $2
        RETURNING id, name, email, role, status, created_at`,
      [status, id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];

    // 2. If we're approving a teacher, promote their teacher_classes → classes.
    //    Only promote if no classes already exist for this teacher (idempotent).
    if (status === 'approved' && user.role === 'teacher') {
      const existing = await client.query(
        'SELECT COUNT(*)::int AS cnt FROM classes WHERE teacher_id = $1',
        [id]
      );

      if (existing.rows[0].cnt === 0) {
        const tcRes = await client.query(
          `SELECT class_name, subject FROM teacher_classes WHERE teacher_id = $1`,
          [id]
        );

        if (tcRes.rowCount > 0) {
          // Build a multi-row insert for the new classes
          const values = [];
          const placeholders = tcRes.rows
            .map((tc, i) => {
              const base = i * 3;
              values.push(tc.class_name, tc.subject, id);
              return `($${base + 1}, $${base + 2}, $${base + 3})`;
            })
            .join(', ');

          await client.query(
            `INSERT INTO classes (name, subject, teacher_id)
             VALUES ${placeholders}`,
            values
          );
        }
      }
    }

    await client.query('COMMIT');
    return res.json({ user: publicUser(user) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/role
// ---------------------------------------------------------------------------
router.patch('/users/:id/role', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { role } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res
      .status(400)
      .json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  // Prevent admins from demoting themselves accidentally.
  if (id === req.user.id && role !== 'admin') {
    return res
      .status(400)
      .json({ error: 'You cannot change your own admin role.' });
  }

  try {
    const { rows } = await query(
      `UPDATE users
          SET role = $1
        WHERE id = $2
        RETURNING id, name, email, role, status, created_at`,
      [role, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id
// ---------------------------------------------------------------------------
router.delete('/users/:id', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ ok: true, deleted: id });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/stats
// ---------------------------------------------------------------------------
router.get('/stats', async (_req, res, next) => {
  try {
    const sql = `
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'student')                 AS "totalStudents",
        (SELECT COUNT(*)::int FROM users WHERE role = 'teacher')                 AS "totalTeachers",
        (SELECT COUNT(*)::int FROM exams)                                        AS "totalExams",
        (SELECT COUNT(*)::int FROM submissions)                                  AS "totalSubmissions",
        (SELECT COUNT(*)::int FROM users WHERE status = 'pending')               AS "pendingApprovals"
    `;
    const { rows } = await query(sql);
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/exams
// ---------------------------------------------------------------------------
router.get('/exams', async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        e.id,
        e.title,
        e.scheduled_at,
        e.deadline,
        e.use_ai_key,
        e.answer_key_text,
        e.created_at,
        c.id   AS class_id,
        c.name AS class_name,
        c.subject AS class_subject,
        u.id   AS creator_id,
        u.name AS creator_name,
        u.role AS creator_role,
        (SELECT COUNT(*)::int FROM submissions s WHERE s.exam_id = e.id) AS submission_count
      FROM exams e
      JOIN classes c ON c.id = e.class_id
      JOIN users   u ON u.id = e.created_by
      ORDER BY COALESCE(e.scheduled_at, e.created_at) DESC
    `);
    return res.json({ exams: rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/submissions
// ---------------------------------------------------------------------------
router.get('/submissions', async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        s.id,
        s.score,
        s.feedback,
        s.status,
        s.submitted_at,
        s.graded_at,
        s.file_url,
        s.ocr_text,
        st.id    AS student_id,
        st.name  AS student_name,
        st.email AS student_email,
        e.id     AS exam_id,
        e.title  AS exam_title,
        c.name   AS class_name
      FROM submissions s
      JOIN users st ON st.id = s.student_id
      JOIN exams e  ON e.id  = s.exam_id
      JOIN classes c ON c.id = e.class_id
      ORDER BY s.submitted_at DESC
    `);
    return res.json({ submissions: rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/exams
// Mirrors the eventual teacher exam-creation flow.
// ---------------------------------------------------------------------------
router.post('/exams', async (req, res, next) => {
  const {
    title,
    class_id,
    scheduled_at,
    deadline,
    answer_key_text,
    use_ai_key,
  } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ error: 'Title is required (min 2 chars).' });
  }
  const classIdInt = parseInt(class_id, 10);
  if (!Number.isInteger(classIdInt) || classIdInt <= 0) {
    return res.status(400).json({ error: 'A valid class_id is required.' });
  }

  const client = await pool.connect();
  try {
    const cls = await client.query('SELECT id FROM classes WHERE id = $1', [
      classIdInt,
    ]);
    if (cls.rowCount === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const insert = await client.query(
      `INSERT INTO exams
         (title, class_id, created_by, scheduled_at, deadline, answer_key_text, use_ai_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, class_id, created_by, scheduled_at, deadline,
                 answer_key_text, use_ai_key, created_at`,
      [
        title.trim(),
        classIdInt,
        req.user.id,
        scheduled_at || null,
        deadline || null,
        answer_key_text || null,
        Boolean(use_ai_key),
      ]
    );
    return res.status(201).json({ exam: insert.rows[0] });
  } catch (err) {
    return next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
