/**
 * EduGrade API server
 * --------------------
 * Express + PostgreSQL backend for the EduGrade platform.
 *
 * Provides:
 *   - CORS (configurable via CLIENT_ORIGIN)
 *   - JSON & URL-encoded body parsers
 *   - Request logging (morgan)
 *   - Health check at GET /api/health
 *   - Centralised JSON 404 + error handlers
 *
 * Future routes (auth, classes, exams, submissions) should be mounted
 * under /api in their own router modules.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ||
  process.env.CLIENT_URL ||
  'http://localhost:5173';

// ---------------------------------------------------------------------------
// Rate limiting — 100 requests per 15 minutes per IP
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Ensure the upload directory exists so Multer can write to it later.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

// ---------------------------------------------------------------------------
// Routes — public health check MUST be defined before any auth-guarded routers
// ---------------------------------------------------------------------------

/**
 * GET /api/health
 * Lightweight public liveness probe (no authentication required).
 * Used by clients and container orchestrators.
 */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'edugrade-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

const studentRouter = require('./routes/student');
app.use('/api/student', studentRouter);

const teacherRouter = require('./routes/teacher');
app.use('/api/teacher', teacherRouter);

/**
 * GET /
 * Friendly root.
 */
app.get('/', (_req, res) => {
  res.json({
    name: 'EduGrade API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ---------------------------------------------------------------------------
// 404 + error handlers
// ---------------------------------------------------------------------------
app.use((req, res, _next) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[edugrade-api] Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[edugrade-api] Listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[edugrade-api] CORS allowed origin: ${CLIENT_ORIGIN}`);
});

module.exports = app;
