/**
 * Student routes
 * --------------
 * All endpoints require an authenticated user with role='student'.
 *
 *   GET    /api/student/exams               upcoming/past exams for enrolled classes
 *   POST   /api/student/exams/:id/submit    upload answer file, create submission, trigger grading
 *   GET    /api/student/submissions         all of this student's submissions
 *   GET    /api/student/submissions/:id     full submission detail (ocr_text, score, feedback, etc.)
 *   GET    /api/student/analytics           average score, trend, score breakdown
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool, query } = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { gradeExam } = require('../services/grader');

const router = express.Router();

// All student routes require a valid student or admin JWT.
// Admins are allowed so they can view student data for monitoring.
router.use(authMiddleware, requireRole('student', 'admin'));

// ---------------------------------------------------------------------------
// Multer — file uploads go to /uploads with a unique name
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const name = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, TIFF, BMP images and PDF files are allowed.'));
    }
  },
});

// ---------------------------------------------------------------------------
// GET /api/student/exams
// Returns exams for classes the student is enrolled in, with status derived
// from scheduled_at and deadline.
// ---------------------------------------------------------------------------
router.get('/exams', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         e.id,
         e.title,
         e.scheduled_at,
         e.deadline,
         e.created_at,
         e.use_ai_key,
         c.id   AS class_id,
         c.name AS class_name,
         c.subject,
         (SELECT COUNT(*)::int FROM submissions s
          WHERE s.exam_id = e.id AND s.student_id = $1) AS my_submission_id,
         (SELECT s.status FROM submissions s
          WHERE s.exam_id = e.id AND s.student_id = $1) AS my_status,
         (SELECT s.score FROM submissions s
          WHERE s.exam_id = e.id AND s.student_id = $1) AS my_score
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN class_enrollments ce ON ce.class_id = e.class_id
       WHERE ce.student_id = $1
       ORDER BY COALESCE(e.scheduled_at, e.created_at) DESC`,
      [req.user.id]
    );

    const now = new Date();

    const exams = rows.map((r) => {
      let status = 'open';
      if (r.scheduled_at && new Date(r.scheduled_at) > now) {
        status = 'upcoming';
      } else if (r.deadline && new Date(r.deadline) < now) {
        status = 'closed';
      }

      return {
        id: r.id,
        title: r.title,
        scheduled_at: r.scheduled_at,
        deadline: r.deadline,
        created_at: r.created_at,
        use_ai_key: r.use_ai_key,
        class_id: r.class_id,
        class_name: r.class_name,
        subject: r.subject,
        status,
        submitted: Boolean(r.my_submission_id),
        my_status: r.my_status,
        my_score: r.my_score ? Number(r.my_score) : null,
      };
    });

    return res.json({ exams });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/student/exams/:id/submit
// Multipart upload (field: "file"). Creates submission record and triggers
// background OCR + grading.
// ---------------------------------------------------------------------------
router.post('/exams/:id/submit', upload.single('file'), async (req, res, next) => {
  const examId = parseInt(req.params.id, 10);
  if (!Number.isInteger(examId) || examId <= 0) {
    // Clean up uploaded file if present
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Invalid exam id.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please attach an image or PDF.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  const client = await pool.connect();
  try {
    // Verify the exam exists, isn't closed, and the student is enrolled
    const examRes = await client.query(
      `SELECT e.id, e.title, e.deadline, e.answer_key_text, e.use_ai_key,
              c.name AS class_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN class_enrollments ce ON ce.class_id = e.class_id
       WHERE e.id = $1 AND ce.student_id = $2`,
      [examId, req.user.id]
    );

    if (examRes.rowCount === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Exam not found or you are not enrolled in its class.' });
    }

    const exam = examRes.rows[0];

    // Check deadline
    if (exam.deadline && new Date(exam.deadline) < new Date()) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: 'Submission deadline has passed.' });
    }

    // Check for existing submission (UNIQUE constraint on exam_id + student_id)
    const existing = await client.query(
      'SELECT id FROM submissions WHERE exam_id = $1 AND student_id = $2',
      [examId, req.user.id]
    );

    if (existing.rowCount > 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({ error: 'You have already submitted to this exam.' });
    }

    // Create submission record
    const insertRes = await client.query(
      `INSERT INTO submissions (exam_id, student_id, file_url, status)
       VALUES ($1, $2, $3, 'submitted')
       RETURNING id, exam_id, student_id, file_url, status, submitted_at`,
      [examId, req.user.id, fileUrl]
    );

    const submission = insertRes.rows[0];

    // Fire-and-forget OCR + grading in background
    gradeExam(exam, [{ id: submission.id, student_id: req.user.id, file_url: fileUrl }]).catch(
      (err) => {
        console.error('[student] Background grading failed:', err.message);
      }
    );

    return res.status(201).json({
      message: 'Submission received. Grading in progress…',
      submission,
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/submissions
// All of the student's submissions with exam title, score, status, submitted_at.
// ---------------------------------------------------------------------------
router.get('/submissions', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         s.id,
         s.exam_id,
         s.score,
         s.status,
         s.submitted_at,
         s.graded_at,
         e.title AS exam_title,
         c.name  AS class_name
       FROM submissions s
       JOIN exams e ON e.id = s.exam_id
       JOIN classes c ON c.id = e.class_id
       WHERE s.student_id = $1
       ORDER BY s.submitted_at DESC`,
      [req.user.id]
    );

    const submissions = rows.map((r) => ({
      ...r,
      score: r.score ? Number(r.score) : null,
    }));

    return res.json({ submissions });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/submissions/:id
// Full detail: ocr_text, score, feedback, key_points_matched, key_points_missed,
// grade_letter, file_url, etc.
// ---------------------------------------------------------------------------
router.get('/submissions/:id', async (req, res, next) => {
  const subId = parseInt(req.params.id, 10);
  if (!Number.isInteger(subId) || subId <= 0) {
    return res.status(400).json({ error: 'Invalid submission id.' });
  }

  try {
    const { rows } = await query(
      `SELECT
         s.id,
         s.exam_id,
         s.file_url,
         s.ocr_text,
         s.score,
         s.feedback,
         s.status,
         s.submitted_at,
         s.graded_at,
         e.title AS exam_title,
         e.use_ai_key,
         c.name  AS class_name
       FROM submissions s
       JOIN exams e   ON e.id  = s.exam_id
       JOIN classes c ON c.id  = e.class_id
       WHERE s.id = $1 AND s.student_id = $2`,
      [subId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const sub = rows[0];

    // Parse structured feedback from JSON (the grader stores feedback as JSON string)
    let feedbackData = null;
    if (sub.feedback) {
      try {
        feedbackData = JSON.parse(sub.feedback);
      } catch (_) {
        // feedback might be plain text (e.g., error messages)
        feedbackData = { text: sub.feedback };
      }
    }

    return res.json({
      submission: {
        id: sub.id,
        exam_id: sub.exam_id,
        exam_title: sub.exam_title,
        class_name: sub.class_name,
        file_url: sub.file_url,
        ocr_text: sub.ocr_text,
        score: sub.score ? Number(sub.score) : null,
        status: sub.status,
        submitted_at: sub.submitted_at,
        graded_at: sub.graded_at,
        use_ai_key: sub.use_ai_key,
        feedback: feedbackData,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/analytics
// Returns aggregated stats and score trend.
// ---------------------------------------------------------------------------
router.get('/analytics', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         s.score,
         s.submitted_at,
         e.title AS exam_title
       FROM submissions s
       JOIN exams e ON e.id = s.exam_id
       WHERE s.student_id = $1 AND s.status = 'graded' AND s.score IS NOT NULL
       ORDER BY s.submitted_at ASC`,
      [req.user.id]
    );

    const scores = rows.map((r) => Number(r.score));
    const totalGraded = scores.length;

    // Total exams taken (including ungraded)
    const totalRes = await query(
      'SELECT COUNT(*)::int AS count FROM submissions WHERE student_id = $1',
      [req.user.id]
    );
    const examsTaken = totalRes.rows[0]?.count || 0;

    // Pending submissions
    const pendingRes = await query(
      "SELECT COUNT(*)::int AS count FROM submissions WHERE student_id = $1 AND status IN ('submitted', 'processing')",
      [req.user.id]
    );
    const examsPending = pendingRes.rows[0]?.count || 0;

    const averageScore = totalGraded > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / totalGraded).toFixed(2))
      : 0;

    const bestScore = totalGraded > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalGraded > 0 ? Math.min(...scores) : 0;

    // Build score_by_exam
    const scoreByExam = rows.map((r) => ({
      exam_title: r.exam_title,
      score: Number(r.score),
      date: r.submitted_at,
    }));

    // Improvement trend
    let improvementTrend = 'stable';
    if (scores.length >= 3) {
      const half = Math.floor(scores.length / 2);
      const firstHalfAvg = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const secondHalfAvg = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half);
      const diff = secondHalfAvg - firstHalfAvg;
      if (diff > 3) improvementTrend = 'improving';
      else if (diff < -3) improvementTrend = 'declining';
    }

    return res.json({
      average_score: averageScore,
      best_score: bestScore,
      lowest_score: lowestScore,
      exams_taken: examsTaken,
      exams_pending: examsPending,
      total_graded: totalGraded,
      score_by_exam: scoreByExam,
      improvement_trend: improvementTrend,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
