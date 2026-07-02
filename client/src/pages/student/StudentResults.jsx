/**
 * StudentResults
 * --------------
 * Shows all of the student's submissions with expandable details.
 *
 * - List of submissions with exam title, score, status, date
 * - Click to expand: circular progress indicator, grade letter badge,
 *   OCR text in scrollable box, feedback, matched/missed key points
 */

import { useCallback, useEffect, useState } from 'react';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';
import { SkeletonTable } from '../admin/components/Skeleton.jsx';

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch (_) { return String(value); }
}

/**
 * Circular progress indicator for score display.
 */
function CircularScore({ score, size = 100 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-xl font-bold text-white">{Math.round(score)}</span>
    </div>
  );
}

function GradeBadge({ letter }) {
  if (!letter) return null;
  const colors = {
    A: 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/40',
    B: 'bg-sky-500/20 text-sky-300 ring-sky-400/40',
    C: 'bg-amber-500/20 text-amber-300 ring-amber-400/40',
    D: 'bg-orange-500/20 text-orange-300 ring-orange-400/40',
    F: 'bg-rose-500/20 text-rose-300 ring-rose-400/40',
  };
  const cls = colors[letter] || colors.C;
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ring-2 ${cls}`}>
      {letter}
    </span>
  );
}

export default function StudentResults() {
  const [submissions, setSubmissions] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const loadSubmissions = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/student/submissions');
      setSubmissions(data?.submissions || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Auto-refresh every 8 seconds while any submission is being graded
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!submissions) return;

    const hasPending = submissions.some(
      (s) => s.status === 'processing' || s.status === 'submitted'
    );

    if (!hasPending) {
      setPolling(false);
      return;
    }

    setPolling(true);
    const interval = setInterval(loadSubmissions, 8000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [submissions, loadSubmissions]);

  async function toggleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/student/submissions/${id}`);
      setDetail(data?.submission || null);
    } catch (_) {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">My Results</h1>
          <p className="mt-1 text-sm text-white/60">
            View your graded submissions and feedback.
          </p>
        </div>
        {polling && (
          <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            checking for updates…
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {submissions === null ? (
        <SkeletonTable rows={5} cols={4} />
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          No submissions yet. Browse exams and submit your answers!
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {/* Collapsed header */}
              <button
                onClick={() => toggleExpand(s.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{s.exam_title}</p>
                  <p className="text-xs text-white/50">{s.class_name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.status === 'graded' && s.score != null ? (
                    <span className="font-bold text-white">{Number(s.score).toFixed(0)}<span className="text-xs text-white/50">/100</span></span>
                  ) : null}
                  <Badge variant={s.status}>{s.status}</Badge>
                  <span className="text-xs text-white/40">{formatDate(s.submitted_at)}</span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 text-white/40 transition-transform ${expandedId === s.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              {expandedId === s.id && (
                <div className="border-t border-white/10 px-5 py-5">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="h-6 w-6 animate-spin text-indigo-300" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    </div>
                  ) : detail ? (
                    <div className="space-y-6">
                      {/* Score & Grade row */}
                      <div className="flex flex-wrap items-center gap-6">
                        {detail.score != null && (
                          <div className="flex items-center gap-4">
                            <CircularScore score={Number(detail.score)} />
                            <div>
                              <p className="text-xs text-white/50 uppercase tracking-wider">Score</p>
                              <p className="text-lg font-bold text-white">{Number(detail.score).toFixed(1)}/100</p>
                            </div>
                          </div>
                        )}
                        {detail.feedback?.grade_letter && (
                          <div className="flex items-center gap-3">
                            <GradeBadge letter={detail.feedback.grade_letter} />
                            <div>
                              <p className="text-xs text-white/50 uppercase tracking-wider">Grade</p>
                              <p className="text-lg font-bold text-white">{detail.feedback.grade_letter}</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wider">Status</p>
                          <div className="mt-1"><Badge variant={detail.status}>{detail.status}</Badge></div>
                        </div>
                        {detail.graded_at && (
                          <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider">Graded At</p>
                            <p className="text-sm text-white/80">{formatDate(detail.graded_at)}</p>
                          </div>
                        )}
                      </div>

                      {/* OCR Text */}
                      {detail.ocr_text && (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">
                            Extracted Text (OCR)
                          </p>
                          <pre className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-navy-950/50 p-3 text-xs text-white/70 whitespace-pre-wrap leading-relaxed">
                            {detail.ocr_text}
                          </pre>
                        </div>
                      )}

                      {/* File link */}
                      {detail.file_url && (
                        <div>
                          <button
                            onClick={() => {
                              const apiBase = import.meta.env.VITE_API_URL || '/api';
                              const serverOrigin = apiBase.startsWith('http')
                                ? apiBase.replace(/\/api\/?$/, '').replace(/\/+$/, '')
                                : window.location.origin;
                              window.open(`${serverOrigin}${detail.file_url}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <path d="M15 3h6v6" />
                              <path d="M10 14L21 3" />
                            </svg>
                            View Submitted File
                          </button>
                        </div>
                      )}

                      {/* Feedback */}
                      {detail.feedback && (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">
                            Feedback
                          </p>
                          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                            {typeof detail.feedback === 'object' && detail.feedback.text
                              ? detail.feedback.text
                              : typeof detail.feedback === 'object' && detail.feedback.feedback
                                ? detail.feedback.feedback
                                : typeof detail.feedback === 'string'
                                  ? detail.feedback
                                  : ''}
                          </div>
                        </div>
                      )}

                      {/* Key Points Matched / Missed */}
                      {detail.feedback?.key_points_matched?.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-400">
                              ✅ Key Points Matched
                            </p>
                            <ul className="space-y-1">
                              {detail.feedback.key_points_matched.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/60" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {detail.feedback?.key_points_missed?.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-rose-400">
                                ❌ Key Points Missed
                              </p>
                              <ul className="space-y-1">
                                {detail.feedback.key_points_missed.map((p, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/60" />
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error state */}
                      {detail.status === 'failed' && (
                        <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                          {detail.feedback?.text || 'Grading failed. Please contact your teacher.'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">Failed to load details.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
