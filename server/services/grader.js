/**
 * EduGrade Grading Engine
 * ========================
 *
 * Orchestrates the OCR → AI grading pipeline for a batch of submissions.
 *
 * Flow:
 *   1. For each submission, call the OCR service (http://localhost:8001/extract)
 *      to obtain the transcribed text.
 *   2. If the exam uses `use_ai_key`, first ask Claude to generate a reference
 *      answer key from the exam title.
 *   3. Call Claude (claude-sonnet-4-20250514) with the answer key and OCR text
 *      to generate a structured grade (score, feedback, key points, grade letter).
 *   4. Persist the results in the `submissions` table.
 */

const { query } = require('../db/pool');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const OCR_SERVICE_BASE = (process.env.OCR_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');
const OCR_SERVICE_URL = OCR_SERVICE_BASE.endsWith('/extract') ? OCR_SERVICE_BASE : OCR_SERVICE_BASE + '/extract';
const GROQ_API_KEY    = process.env.GROQ_API_KEY || '';
const GROQ_MODEL      = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_URL    = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.warn(
    '[grader] WARNING: GROQ_API_KEY is not set. AI grading will fail until it is configured in server/.env.'
  );
} else {
  console.log(`[grader] GROQ_API_KEY found: ${GROQ_API_KEY.substring(0, 10)}... (length: ${GROQ_API_KEY.length})`);
  console.log(`[grader] GROQ_API_URL: ${GROQ_API_URL}`);
  console.log(`[grader] GROQ_MODEL: ${GROQ_MODEL}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * POST to the OCR service with a file and return the extracted text.
 * Uses axios + form-data npm package for reliable multipart uploads on Node.js.
 */
async function extractText(filePath) {
  const FormData = require('form-data');
  const axios = require('axios');

  const fileName = path.basename(filePath);

  console.log(`[grader] Calling OCR at: ${OCR_SERVICE_URL}`);
  console.log(`[grader] File path: ${filePath}`);
  console.log(`[grader] File exists: ${fs.existsSync(filePath)}`);

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post(OCR_SERVICE_URL, form, {
      headers: form.getHeaders(),
      timeout: 180000,
    });

    const data = response.data;
    return {
      text: data.extracted_text || '',
      confidence: data.confidence || 0,
      lowConfidenceRegions: data.low_confidence_regions || [],
    };
  } catch (err) {
    console.error(`[grader] OCR request failed:`, {
      url: OCR_SERVICE_URL,
      filePath: filePath,
      errorMessage: err.message,
      responseStatus: err.response?.status,
      responseData: err.response?.data
        ? JSON.stringify(err.response.data).substring(0, 500)
        : 'none',
    });
    throw new Error(`OCR request failed: ${err.message}`);
  }
}

/**
 * Call Groq to generate an answer key from an exam title.
 */
async function generateAnswerKey(examTitle) {
  const systemPrompt =
    'You are an expert educator. Given an exam title, generate a detailed, ' +
    'comprehensive answer key that a teacher would use for grading. ' +
    'Include the key points that a correct answer should cover. ' +
    'Format your response as plain text with clear sections for each question or topic.';

  const userMessage = `Exam Title: "${examTitle}"\n\nPlease generate a detailed answer key for this exam. Include expected answers, key points, and a marking scheme.`;

  console.log(`[grader] Groq key gen: POST ${GROQ_API_URL}`);
  console.log(`[grader] Groq key gen: Auth: Bearer ${GROQ_API_KEY.substring(0, 10)}...`);
  console.log(`[grader] Groq key gen: Model: ${GROQ_MODEL}`);

  let resp;
  try {
    resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
  } catch (err) {
    console.error(`[grader] Groq key gen fetch failed:`, {
      url: GROQ_API_URL,
      keyPrefix: GROQ_API_KEY.substring(0, 10) + '...',
      errorName: err.name,
      errorMessage: err.message,
      errorCause: err.cause ? JSON.stringify(err.cause) : 'none',
    });
    throw new Error(`Groq API (key gen) fetch failed: ${err.message}`);
  }

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`[grader] Groq key gen returned error:`, {
      status: resp.status,
      statusText: resp.statusText,
      body: body.substring(0, 1000),
    });
    throw new Error(`Groq API (key gen) returned ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Grade a student's answer against the answer key using Groq.
 * Returns structured grading result.
 */
/**
 * Extract meaningful keywords from text by splitting words, removing
 * stopwords under 3 chars, and filtering common English stopwords.
 */
function extractKeywords(text) {
  const stopwords = new Set([
    'the', 'is', 'a', 'an', 'in', 'of', 'and', 'to', 'that', 'it',
    'for', 'on', 'with', 'be', 'are', 'was', 'were',
  ]);
  const words = text.split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter(w => w.length >= 3 && !stopwords.has(w));
  return [...new Set(words)];
}

async function gradeWithGroq(answerKey, studentAnswer, questionPaperText) {
  const keywords = extractKeywords(studentAnswer);
  const keywordsSection = keywords.length > 0
    ? `\n\nExtracted keywords from student answer: ${keywords.join(', ')}.\nPay attention to whether the student has covered these key concepts.`
    : '';

  const systemPrompt =
    "You are an academic evaluator grading handwritten student answers. " +
    "The student text was extracted via OCR from a handwritten image and " +
    "MAY CONTAIN OCR errors, misspellings, garbled characters, and noise. " +
    "Your job is to identify the student's INTENDED meaning despite OCR " +
    "artifacts. Look for key concepts, partial words, and semantic meaning " +
    "rather than exact spelling. Be generous in recognizing correct concepts " +
    "that appear in garbled form. For example 'Pnotos ynthesis' means " +
    "'Photosynthesis', 'inorganic sub- stances' means 'inorganic substances'.\n" +
    (questionPaperText
      ? "The questions are provided below. Grade each answer against its corresponding question. "
      : "") +
    'Return ONLY a JSON object with no markdown:\n' +
    '{\n' +
    '  "score": <number 0-100>,\n' +
    '  "feedback": "<detailed, constructive feedback string>",\n' +
    '  "key_points_matched": ["point1", "point2", ...],\n' +
    '  "key_points_missed": ["point1", "point2", ...],\n' +
    '  "grade_letter": "<A|B|C|D|F>"\n' +
    '}';

  // Build user message with optional question paper
  let userMessage;
  if (questionPaperText) {
    userMessage =
      `Questions:\n${questionPaperText}\n\n` +
      `Answer Key:\n${answerKey}\n\n` +
      `Student's OCR-extracted handwritten answer (may contain OCR artifacts - evaluate the INTENDED meaning):\n${studentAnswer}${keywordsSection}\n\n` +
      `Grade this answer question by question if possible, then give overall score. Be generous accounting for OCR noise. If you can identify the concept despite garbled text, count it as correct.`;
  } else {
    userMessage =
      `Answer Key:\n${answerKey}\n\nStudent's OCR-extracted handwritten answer (may contain OCR artifacts - evaluate the INTENDED meaning):\n${studentAnswer}${keywordsSection}\n\nGrade this answer generously accounting for OCR noise. If you can identify the concept despite garbled text, count it as correct.`;
  }

  console.log(`[grader] Groq grading: POST ${GROQ_API_URL}`);
  console.log(`[grader] Groq grading: Auth: Bearer ${GROQ_API_KEY.substring(0, 10)}...`);
  console.log(`[grader] Groq grading: Model: ${GROQ_MODEL}`);

  let resp;
  try {
    resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
  } catch (err) {
    console.error(`[grader] Groq grading fetch failed:`, {
      url: GROQ_API_URL,
      keyPrefix: GROQ_API_KEY.substring(0, 10) + '...',
      errorName: err.name,
      errorMessage: err.message,
      errorCause: err.cause ? JSON.stringify(err.cause) : 'none',
    });
    throw new Error(`Groq API (grading) fetch failed: ${err.message}`);
  }

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`[grader] Groq grading returned error:`, {
      status: resp.status,
      statusText: resp.statusText,
      body: body.substring(0, 1000),
    });
    throw new Error(`Groq API (grading) returned ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const rawText = data.choices?.[0]?.message?.content || '{}';

  // Parse the JSON response (handle potential markdown wrapping)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Groq did not return valid JSON: ${rawText}`);
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Resolve the file path for a submission. Submissions store a relative
 * `file_url` (e.g., "/uploads/xxx.png") which we resolve relative to the
 * server root or UPLOAD_DIR.
 *
 * Note: we avoid path.isAbsolute() here because on Windows paths like
 * "/uploads/xxx.jpg" are considered absolute (drive-relative), causing
 * the function to return the URL path as-is instead of resolving it.
 */
function resolveSubmissionPath(fileUrl) {
  if (!fileUrl) return null;
  // If it's already a full Windows absolute path with drive letter, use as-is
  if (/^[A-Za-z]:[\\/]/.test(fileUrl)) {
    return fileUrl;
  }
  // Otherwise resolve relative to uploads dir
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  // file_url may be "/uploads/filename" or "uploads/filename"
  const filename = path.basename(fileUrl);
  return path.join(uploadDir, filename);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Grade all submissions for an exam.
 *
 * @param {object} exam           - Exam row (id, title, answer_key_text, use_ai_key, class_name)
 * @param {Array}  submissions    - Array of { id, student_id, file_url }
 */
async function gradeExam(exam, submissions) {
  console.log(
    `[grader] Grading ${submissions.length} submission(s) for exam #${exam.id} ("${exam.title}")…`
  );

  // --- Step A: generate answer key if use_ai_key is set ---
  let answerKey = exam.answer_key_text;
  if (exam.use_ai_key && (!answerKey || answerKey.trim() === '')) {
    try {
      console.log('[grader] Generating answer key with Groq…');
      answerKey = await generateAnswerKey(exam.title);
      // Persist the generated key so re-grading uses the same key
      await query('UPDATE exams SET answer_key_text = $1 WHERE id = $2', [
        answerKey,
        exam.id,
      ]);
      console.log('[grader] Answer key generated and saved.');
    } catch (err) {
      console.error('[grader] Failed to generate answer key:', err.message);
      // Mark all submissions as failed
      for (const sub of submissions) {
        await query(
          `UPDATE submissions SET status = 'failed', feedback = $1 WHERE id = $2`,
          [`AI key generation failed: ${err.message}`, sub.id]
        );
      }
      return;
    }
  }

  if (!answerKey || answerKey.trim() === '') {
    const errMsg = 'No answer key available. Please provide an answer key.';
    for (const sub of submissions) {
      await query(
        `UPDATE submissions SET status = 'failed', feedback = $1 WHERE id = $2`,
        [errMsg, sub.id]
      );
    }
    return;
  }

  // --- Step B: grade each submission ---
  for (const sub of submissions) {
    try {
      // 1. OCR
      const filePath = resolveSubmissionPath(sub.file_url);
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`Submission file not found: ${sub.file_url}`);
      }

      console.log(`[grader] OCR for submission #${sub.id}…`);
      const ocrResult = await extractText(filePath);
      const studentAnswer = ocrResult.text;

      if (!studentAnswer.trim()) {
        throw new Error('OCR returned empty text.');
      }

      // Store OCR text and confidence
      await query('UPDATE submissions SET ocr_text = $1, ocr_confidence = $2 WHERE id = $3', [
        studentAnswer,
        ocrResult.confidence,
        sub.id,
      ]);

      // 2. AI grading — include question paper if available
      console.log(`[grader] Grading submission #${sub.id} with Groq…`);
      const questionPaperText = exam.question_paper_text || null;
      const grade = await gradeWithGroq(answerKey, studentAnswer, questionPaperText);

      // 3. Persist results — store the full Groq response as JSON
      //    so student routes can surface grade_letter, key_points, etc.
      await query(
        `UPDATE submissions
            SET score      = $1,
                feedback   = $2,
                status     = 'graded',
                graded_at  = NOW()
          WHERE id = $3`,
        [grade.score, JSON.stringify(grade), sub.id]
      );

      console.log(
        `[grader] Submission #${sub.id} graded: ${grade.score}/100 (${grade.grade_letter})`
      );
    } catch (err) {
      console.error(`[grader] Failed to grade submission #${sub.id}:`, err.message);
      await query(
        `UPDATE submissions SET status = 'failed', feedback = $1 WHERE id = $2`,
        [`Grading failed: ${err.message}`, sub.id]
      );
    }
  }

  console.log(`[grader] Done grading exam #${exam.id}.`);
}

module.exports = { gradeExam };