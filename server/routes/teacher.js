/**
 * Teacher routes
 * --------------
 * All endpoints require an authenticated user with role='teacher'.
 * Mounted in index.js at /api/teacher, so every route here is prefixed
 * with /api/teacher automatically.
 *
 *   GET    /classes                      classes this teacher owns (with student counts)
 *   GET    /students                     all students in this teacher's classes
 *   POST   /exams                        create a new exam
 *   GET    /exams                        exams created by this teacher
 *   GET    /exams/:id/submissions        submissions for an exam
 *   POST   /exams/:id/grade-all          trigger AI grading for ungraded submissions
 *   PATCH  /submissions/:id/override     manually override a submission
 */

const express = require('express');
const { pool, query } = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { gradeExam } = require('../services/grader');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// --- Question paper upload config ---
const QUESTION_PAPER_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads', 'question_papers');
if (!fs.existsSync(QUESTION_PAPER_DIR)) {
  fs.mkdirSync(QUESTION_PAPER_DIR, { recursive: true });
}

const questionPaperStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, QUESTION_PAPER_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `qp-${uniqueSuffix}${ext}`);
  },
});

const uploadQuestionPaper = multer({
  storage: questionPaperStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PNG, JPG, JPEG, WebP, TIFF, and BMP files are allowed.'));
    }
  },
});

// All teacher routes require a valid teacher JWT.
router.use(authMiddleware, requireRole('teacher'));

// ---------------------------------------------------------------------------
// GET /api/teacher/classes
// Returns classes where the teacher is the instructor, with student counts
// from class_enrollments.
// ---------------------------------------------------------------------------
router.get('/classes', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         c.id,
         c.name,
         c.subject,
         c.created_at,
         (SELECT COUNT(*)::int FROM class_enrollments ce WHERE ce.class_id = c.id) AS student_count
       FROM classes c
       WHERE c.teacher_id = $1
       ORDER BY c.name`,
      [req.user.id]
    );
    return res.json({ classes: rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/teacher/students
// All students enrolled in any of this teacher's classes, along with their
// average score across all exams in those classes.
// ---------------------------------------------------------------------------
router.get('/students', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         u.id,
         u.name,
         u.email,
         c.id   AS class_id,
         c.name AS class_name,
         c.subject,
         ROUND(AVG(s.score), 2) AS avg_score
       FROM users u
       JOIN class_enrollments ce ON ce.student_id = u.id
       JOIN classes c            ON c.id  = ce.class_id
       LEFT JOIN submissions s   ON s.student_id = u.id AND s.status = 'graded'
       WHERE c.teacher_id = $1
       GROUP BY u.id, u.name, u.email, c.id, c.name, c.subject
       ORDER BY u.name`,
      [req.user.id]
    );
    return res.json({ students: rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/exams
// Create a new exam.
//   Body (multipart/form-data):
//     - title, class_id, scheduled_at, deadline, answer_key_text, use_ai_key
//     - question_paper_text (optional) — typed/pasted questions
//     - question_paper_file (optional) — PDF or image upload
// ---------------------------------------------------------------------------
router.post('/exams', uploadQuestionPaper.single('question_paper_file'), async (req, res, next) => {
  const { title, class_id, scheduled_at, deadline, answer_key_text, use_ai_key, question_paper_text } =
    req.body || {};

  // --- validation ---
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ error: 'Title is required (min 2 chars).' });
  }
  const classIdInt = parseInt(class_id, 10);
  if (!Number.isInteger(classIdInt) || classIdInt <= 0) {
    return res.status(400).json({ error: 'A valid class_id is required.' });
  }

  const client = await pool.connect();
  try {
    // Verify the class belongs to this teacher
    const cls = await client.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [classIdInt, req.user.id]
    );
    if (cls.rowCount === 0) {
      return res.status(404).json({ error: 'Class not found or not yours.' });
    }

    // Build question_paper_url if a file was uploaded
    let questionPaperUrl = null;
    if (req.file) {
      questionPaperUrl = `/uploads/question_papers/${req.file.filename}`;
    }

    const insert = await client.query(
      `INSERT INTO exams
         (title, class_id, created_by, scheduled_at, deadline, answer_key_text, use_ai_key, question_paper_text, question_paper_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, class_id, created_by, scheduled_at, deadline,
                 answer_key_text, use_ai_key, question_paper_text, question_paper_url, created_at`,
      [
        title.trim(),
        classIdInt,
        req.user.id,
        scheduled_at || null,
        deadline || null,
        answer_key_text || null,
        // FormData sends use_ai_key as string 'true'/'false'; convert properly
        use_ai_key === true || use_ai_key === 'true',
        question_paper_text || null,
        questionPaperUrl,
      ]
    );

    return res.status(201).json({ exam: insert.rows[0] });
  } catch (err) {
    return next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /api/exams
// List exams created by this teacher, with submission statistics.
// ---------------------------------------------------------------------------
router.get('/exams', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         e.id,
         e.title,
         e.scheduled_at,
         e.deadline,
         e.use_ai_key,
         e.answer_key_text,
         e.question_paper_text,
         e.question_paper_url,
         e.created_at,
         c.id   AS class_id,
         c.name AS class_name,
         c.subject,
         (SELECT COUNT(*)::int FROM submissions s WHERE s.exam_id = e.id)                     AS total_submissions,
         (SELECT COUNT(*)::int FROM submissions s WHERE s.exam_id = e.id AND s.status = 'graded') AS graded_count
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       WHERE e.created_by = $1
       ORDER BY COALESCE(e.scheduled_at, e.created_at) DESC`,
      [req.user.id]
    );
    return res.json({ exams: rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/exams/:id/submissions
// All submissions for a given exam, with student name, score, status.
// ---------------------------------------------------------------------------
router.get('/exams/:id/submissions', async (req, res, next) => {
  const examId = parseInt(req.params.id, 10);
  if (!Number.isInteger(examId) || examId <= 0) {
    return res.status(400).json({ error: 'Invalid exam id.' });
  }

  try {
    // Verify the exam belongs to this teacher
    const exam = await query(
      'SELECT id FROM exams WHERE id = $1 AND created_by = $2',
      [examId, req.user.id]
    );
    if (exam.rowCount === 0) {
      return res.status(404).json({ error: 'Exam not found or not yours.' });
    }

    const { rows } = await query(
      `SELECT
         s.id,
         s.score,
         s.feedback,
         s.status,
         s.file_url,
         s.ocr_text,
         s.ocr_confidence,
         s.submitted_at,
         s.graded_at,
         u.id   AS student_id,
         u.name AS student_name,
         u.email AS student_email
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       WHERE s.exam_id = $1
       ORDER BY s.submitted_at DESC`,
      [examId]
    );
    return res.json({ submissions: rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/exams/:id/grade-all
// Trigger AI grading for all ungraded (submitted / processing) submissions
// of an exam. Returns immediately with the count of submissions queued;
// grading happens asynchronously (the grader updates the DB as it goes).
// ---------------------------------------------------------------------------
router.post('/exams/:id/grade-all', async (req, res, next) => {
  const examId = parseInt(req.params.id, 10);
  if (!Number.isInteger(examId) || examId <= 0) {
    return res.status(400).json({ error: 'Invalid exam id.' });
  }

  try {
    // Verify ownership
    const examRes = await query(
      `SELECT e.id, e.title, e.answer_key_text, e.use_ai_key, e.question_paper_text,
              c.name AS class_name
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       WHERE e.id = $1 AND e.created_by = $2`,
      [examId, req.user.id]
    );
    if (examRes.rowCount === 0) {
      return res.status(404).json({ error: 'Exam not found or not yours.' });
    }

    const exam = examRes.rows[0];

    // Fetch ungraded submissions
    const subsRes = await query(
      `SELECT id, student_id, file_url
       FROM submissions
       WHERE exam_id = $1 AND status IN ('submitted', 'processing')`,
      [examId]
    );

    if (subsRes.rowCount === 0) {
      return res.json({ message: 'No ungraded submissions found.', graded: 0 });
    }

    const submissions = subsRes.rows;

    // Mark them as processing
    await query(
      `UPDATE submissions SET status = 'processing' WHERE exam_id = $1 AND status IN ('submitted', 'processing')`,
      [examId]
    );

    // Fire-and-forget grading in the background (don't await)
    gradeExam(exam, submissions).catch((err) => {
      console.error('[grader] Background grading failed:', err);
    });

    return res.json({
      message: `Grading started for ${submissions.length} submission(s).`,
      graded: submissions.length,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/teacher/submissions/:id/override
// Manually override the score, feedback, and status of a submission.
// Body: { score, feedback, override_reason }
// ---------------------------------------------------------------------------
router.patch('/submissions/:id/override', async (req, res, next) => {
  const subId = parseInt(req.params.id, 10);
  if (!Number.isInteger(subId) || subId <= 0) {
    return res.status(400).json({ error: 'Invalid submission id.' });
  }

  const { score, feedback, override_reason } = req.body || {};

  if (score == null || typeof score !== 'number' || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score is required and must be a number between 0 and 100.' });
  }
  if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }

  const client = await pool.connect();
  try {
    // Verify the submission belongs to an exam owned by this teacher
    const subRes = await client.query(
      `SELECT s.id, s.exam_id, s.score AS old_score, s.status
       FROM submissions s
       JOIN exams e ON e.id = s.exam_id
       WHERE s.id = $1 AND e.created_by = $2`,
      [subId, req.user.id]
    );

    if (subRes.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found or not yours to grade.' });
    }

    const sub = subRes.rows[0];
    const reasonText = override_reason
      ? `\n\n--- Override by teacher ---\nReason: ${override_reason}`
      : '';
    const fullFeedback = feedback + reasonText;

    await client.query(
      `UPDATE submissions
          SET score      = $1,
              feedback   = $2,
              status     = 'manually_graded',
              graded_at  = NOW()
        WHERE id = $3`,
      [score, fullFeedback, subId]
    );

    const updated = await client.query('SELECT * FROM submissions WHERE id = $1', [subId]);

    return res.json({
      message: 'Score override applied successfully.',
      submission: updated.rows[0],
    });
  } catch (err) {
    return next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
