/**
 * TeacherSubmissions (Results)
 * -----------------------------
 * Shows all submissions for a selected exam. Accessible via
 *   /teacher/results?examId=<id>
 *
 * Features:
 *   - Select exam from dropdown
 *   - Table: student name, submission time, score (if graded), status badge
 *   - "Grade All" button with progress indicator
 *   - Click row to see full feedback in modal
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';
import Modal from '../admin/components/Modal.jsx';
import Pagination from '../admin/components/Pagination.jsx';
import { SkeletonTable } from '../admin/components/Skeleton.jsx';

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return String(value);
  }
}

export default function TeacherSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const examIdFromUrl = searchParams.get('examId');

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examIdFromUrl || '');
  const [submissions, setSubmissions] = useState(null);
  const [examTitle, setExamTitle] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [grading, setGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState('');
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideFeedback, setOverrideFeedback] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  // Load exams list for the selector
  const loadExams = useCallback(async () => {
    try {
      const { data } = await api.get('/teacher/exams');
      setExams(data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams.');
    }
  }, []);

  // Load submissions for selected exam
  const loadSubmissions = useCallback(async () => {
    if (!selectedExamId) {
      setSubmissions(null);
      return;
    }
    setError('');
    try {
      const { data } = await api.get(`/teacher/exams/${selectedExamId}/submissions`);
      setSubmissions(data?.submissions || []);
      const exam = exams.find((e) => String(e.id) === String(selectedExamId));
      setExamTitle(exam?.title || '');
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    }
  }, [selectedExamId, exams]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    loadSubmissions();
    setPage(1);
  }, [loadSubmissions]);

  // Sync URL param
  useEffect(() => {
    if (selectedExamId) {
      setSearchParams({ examId: selectedExamId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedExamId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGradeAll() {
    if (!selectedExamId) return;
    setGrading(true);
    setGradingProgress('Starting grading…');
    setError('');
    try {
      const { data } = await api.post(`/teacher/exams/${selectedExamId}/grade-all`);
      setGradingProgress(`✓ ${data.message}`);
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const res = await api.get(`/teacher/exams/${selectedExamId}/submissions`);
          const subs = res.data?.submissions || [];
          const pending = subs.filter(
            (s) => s.status === 'submitted' || s.status === 'processing'
          ).length;
          const total = subs.length;
          const graded = total - pending;
          setGradingProgress(`Graded ${graded}/${total}…`);

          if (pending === 0) {
            clearInterval(poll);
            setGrading(false);
            setGradingProgress('');
            setSubmissions(subs);
          }
        } catch (_) {
          clearInterval(poll);
          setGrading(false);
          setGradingProgress('Polling failed — refresh to see results.');
        }
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to start grading.');
      setGrading(false);
      setGradingProgress('');
    }
  }

  function escapeCsvField(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function handleDownloadCSV() {
    if (!submissions || submissions.length === 0) return;

    const headers = [
      'Student Name',
      'Email',
      'Exam',
      'Score',
      'Grade',
      'Status',
      'Submitted At',
      'Graded At',
      'OCR Confidence',
      'Key Points Matched',
      'Key Points Missed',
    ];

    const rows = submissions.map((s) => {
      let keyPointsMatched = '';
      let keyPointsMissed = '';
      let grade = '';
      try {
        const parsed = typeof s.feedback === 'string' ? JSON.parse(s.feedback) : s.feedback;
        if (parsed && typeof parsed === 'object') {
          keyPointsMatched = Array.isArray(parsed.key_points_matched)
            ? parsed.key_points_matched.join('; ')
            : '';
          keyPointsMissed = Array.isArray(parsed.key_points_missed)
            ? parsed.key_points_missed.join('; ')
            : '';
          grade = parsed.grade_letter || '';
        }
      } catch (_) {}

      return [
        escapeCsvField(s.student_name || ''),
        escapeCsvField(s.student_email || ''),
        escapeCsvField(examTitle),
        s.score != null ? s.score : '',
        escapeCsvField(grade),
        s.status || '',
        s.submitted_at || '',
        s.graded_at || '',
        s.ocr_confidence != null ? s.ocr_confidence : '',
        escapeCsvField(keyPointsMatched),
        escapeCsvField(keyPointsMissed),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(examTitle || 'results').replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleOverride() {
    if (!overrideTarget) return;
    setOverriding(true);
    setOverrideError('');
    try {
      await api.patch(`/teacher/submissions/${overrideTarget.id}/override`, {
        score: parseFloat(overrideScore),
        feedback: overrideFeedback.trim(),
        override_reason: overrideReason.trim() || undefined,
      });
      setOverrideTarget(null);
      // Refresh the submissions list
      loadSubmissions();
    } catch (err) {
      setOverrideError(err.message || 'Failed to save override.');
    } finally {
      setOverriding(false);
    }
  }

  // Pagination
  const pageSubs = submissions || [];
  const pageCount = Math.max(1, Math.ceil(pageSubs.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = pageSubs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [selectedExamId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Results</h1>
        <p className="mt-1 text-sm text-white/60">
          View and grade submissions for your exams.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Exam selector + Grade All */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
          >
            <option value="">Select an exam…</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.class_name})
              </option>
            ))}
          </select>
        </div>

        {selectedExamId && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadSubmissions}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10"
            >
              ↻ Refresh
            </button>
            <button
              disabled={grading || !selectedExamId}
              onClick={handleGradeAll}
              className="rounded-lg bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {grading ? 'Grading…' : 'Grade All'}
            </button>
            {submissions && submissions.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10 hover:text-emerald-200"
              >
                <svg className="-ml-0.5 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grading progress */}
      {gradingProgress && (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {grading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {gradingProgress}
            </span>
          ) : (
            gradingProgress
          )}
        </div>
      )}

      {/* Submissions table */}
      {!selectedExamId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Select an exam above to view its submissions.
        </div>
      ) : submissions === null ? (
        <SkeletonTable rows={5} cols={5} />
      ) : pageRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          No submissions for this exam yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">OCR Conf.</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Graded At</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer hover:bg-white/[0.03]"
                    onClick={() => setDetail(s)}
                  >
                    <td className="px-4 py-3 font-medium text-white">{s.student_name}</td>
                    <td className="px-4 py-3 text-white/70">{formatDate(s.submitted_at)}</td>
                    <td className="px-4 py-3 text-white/80">
                      {s.score == null ? (
                        <span className="text-white/40">—</span>
                      ) : (
                        <span className="font-semibold text-white">
                          {Number(s.score).toFixed(1)}
                          <span className="text-xs text-white/50">/100</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.ocr_confidence != null ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            s.ocr_confidence > 0.7
                              ? 'bg-emerald-500/15 text-emerald-200'
                              : s.ocr_confidence >= 0.4
                                ? 'bg-amber-500/15 text-amber-200'
                                : 'bg-rose-500/15 text-rose-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            s.ocr_confidence > 0.7
                              ? 'bg-emerald-400'
                              : s.ocr_confidence >= 0.4
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                          }`} />
                          {s.ocr_confidence > 0.7 ? 'High' : s.ocr_confidence >= 0.4 ? 'Medium' : 'Low'}
                        </span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status}>{s.status === 'manually_graded' ? 'Manually Graded' : s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatDate(s.graded_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail(s);
                          }}
                          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10"
                        >
                          {s.status === 'graded' || s.status === 'manually_graded' ? 'Feedback' : 'View'}
                        </button>
                        {(s.status === 'graded' || s.status === 'manually_graded') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverrideTarget(s);
                              setOverrideScore(String(s.score ?? ''));
                              setOverrideFeedback('');
                              setOverrideReason('');
                              setOverrideError('');
                            }}
                            className="rounded-md border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:border-violet-400/50"
                          >
                            Override Score
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/10 px-3">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
          </div>
        </div>
      )}

      {/* Feedback modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Submission — ${detail.student_name}` : ''}
        wide
        footer={
          <button
            onClick={() => setDetail(null)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Close
          </button>
        }
      >
        {detail && (
          <div className="space-y-5">
            {/* Status & Score */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Status
                </p>
                <div className="mt-1">
                  <Badge variant={detail.status}>{detail.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Score
                </p>
                <p className="mt-0.5 text-2xl font-bold text-white">
                  {detail.score == null ? (
                    '—'
                  ) : (
                    <>
                      {Number(detail.score).toFixed(1)}
                      <span className="text-sm font-normal text-white/50">/100</span>
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Submitted
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {formatDate(detail.submitted_at)}
                </p>
              </div>
              {detail.file_url && (
                <div className="sm:col-span-3">
                  <a
                    href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}${detail.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10 hover:text-emerald-200"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Submitted File
                  </a>
                </div>
              )}
            </div>

            {/* Question Paper (collapsible) */}
            {(() => {
              const exam = exams.find((e) => String(e.id) === String(selectedExamId));
              if (!exam?.question_paper_text && !exam?.question_paper_url) return null;
              return (
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 hover:text-emerald-200">
                    <svg
                      className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    View Questions
                  </summary>
                  <div className="mt-2 space-y-3">
                    {exam.question_paper_text && (
                      <pre className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-navy-950/50 p-3 text-xs text-white/70 whitespace-pre-wrap">
                        {exam.question_paper_text}
                      </pre>
                    )}
                    {exam.question_paper_url && (
                      <a
                        href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}${exam.question_paper_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10 hover:text-emerald-200"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Uploaded Question Paper
                      </a>
                    )}
                  </div>
                </details>
              );
            })()}

            {/* OCR Text */}
            {detail.ocr_text && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  OCR Extracted Text
                </p>
                <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-navy-950/50 p-3 text-xs text-white/70 whitespace-pre-wrap">
                  {detail.ocr_text}
                </pre>
              </div>
            )}

            {/* Feedback — parse JSON if structured, else plain text */}
            {(() => {
              const fb = detail.feedback;
              if (!fb) return null;
              let parsed;
              try {
                parsed = typeof fb === 'string' ? JSON.parse(fb) : fb;
              } catch (_) {
                parsed = null;
              }
              if (parsed && typeof parsed === 'object') {
                return (
                  <div className="space-y-4">
                    {/* Grade letter badge */}
                    {parsed.grade_letter && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-white/50">
                          Grade
                        </span>
                        <span className="rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-sm font-bold text-emerald-200">
                          {parsed.grade_letter}
                        </span>
                      </div>
                    )}

                    {/* Main feedback text */}
                    {parsed.feedback && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                          Feedback
                        </p>
                        <div className="mt-1 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                          {parsed.feedback}
                        </div>
                      </div>
                    )}

                    {/* Key points matched */}
                    {Array.isArray(parsed.key_points_matched) && parsed.key_points_matched.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                          ✓ Key Points Matched
                        </p>
                        <ul className="mt-1 space-y-1">
                          {parsed.key_points_matched.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/90">
                              <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key points missed */}
                    {Array.isArray(parsed.key_points_missed) && parsed.key_points_missed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-rose-300">
                          ✗ Key Points Missed
                        </p>
                        <ul className="mt-1 space-y-1">
                          {parsed.key_points_missed.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-rose-200/90">
                              <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Raw score from JSON */}
                    {parsed.score != null && (
                      <p className="text-xs text-white/40">
                        Raw score from AI:{' '}
                        <span className="font-semibold text-white/60">{parsed.score}/100</span>
                      </p>
                    )}
                  </div>
                );
              }
              // Plain text fallback
              return (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Feedback
                  </p>
                  <div className="mt-1 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {fb}
                  </div>
                </div>
              );
            })()}

            {detail.status === 'graded' && !detail.feedback && (
              <p className="text-sm text-white/50 italic">
                No feedback provided.
              </p>
            )}

            {detail.status === 'failed' && (
              <p className="text-sm text-rose-300">
                Grading failed. The submission may need to be re-processed.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Override Score modal */}
      <Modal
        open={Boolean(overrideTarget)}
        onClose={() => setOverrideTarget(null)}
        title={overrideTarget ? `Override Score — ${overrideTarget.student_name}` : ''}
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOverrideTarget(null)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              disabled={overriding}
            >
              Cancel
            </button>
            <button
              disabled={overriding || !overrideScore || overrideScore < 0 || overrideScore > 100 || !overrideFeedback.trim()}
              onClick={handleOverride}
              className="rounded-lg bg-violet-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {overriding ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Saving…
                </span>
              ) : (
                'Save Override'
              )}
            </button>
          </div>
        }
      >
        {overrideTarget && (
          <div className="space-y-4">
            {overrideError && (
              <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {overrideError}
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                Current Score
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {overrideTarget.score == null ? '—' : `${Number(overrideTarget.score).toFixed(1)}/100`}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                New Score (0–100) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/60 focus:bg-white/10"
                placeholder="Enter score…"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                Feedback *
              </label>
              <textarea
                value={overrideFeedback}
                onChange={(e) => setOverrideFeedback(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/60 focus:bg-white/10 resize-y"
                placeholder="Provide detailed feedback for this override…"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
                Override Reason
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/60 focus:bg-white/10 resize-y"
                placeholder="Why is this score being overridden? (optional)"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
