/**
 * AdminSubmissions
 * ----------------
 * Lists all submissions with student name, exam title, score, and status.
 * Click to view feedback in a modal.
 * Paginated (10 per page, client-side).
 */

import { useCallback, useEffect, useState } from 'react';

import api from '../../lib/api.js';
import Badge from './components/Badge.jsx';
import Modal from './components/Modal.jsx';
import Pagination from './components/Pagination.jsx';
import { SkeletonTable } from './components/Skeleton.jsx';

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return String(value);
  }
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState(null);

  const loadSubmissions = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/submissions');
      setSubmissions(data?.submissions || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Client-side filtering
  const filtered = submissions
    ? submissions.filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.trim().toLowerCase();
        return (
          s.student_name?.toLowerCase().includes(q) ||
          s.student_email?.toLowerCase().includes(q) ||
          s.exam_title?.toLowerCase().includes(q) ||
          s.class_name?.toLowerCase().includes(q)
        );
      })
    : [];

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Submissions
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Review all exam submissions across the platform.
          </p>
        </div>
        <button
          onClick={loadSubmissions}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-indigo-400/40 hover:bg-white/10"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, exam, or class…"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-9 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-indigo-400/60 focus:bg-white/10"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-2.5 h-4 w-4 text-white/40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
        >
          <option value="" className="bg-navy-900">
            All statuses
          </option>
          <option value="submitted" className="bg-navy-900">
            Submitted
          </option>
          <option value="processing" className="bg-navy-900">
            Processing
          </option>
          <option value="graded" className="bg-navy-900">
            Graded
          </option>
          <option value="failed" className="bg-navy-900">
            Failed
          </option>
        </select>
      </div>

      {/* Table */}
      {submissions === null ? (
        <SkeletonTable rows={6} cols={6} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Exam</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-white/60"
                    >
                      No submissions found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {s.student_name}
                        </div>
                        <div className="text-xs text-white/50">
                          {s.student_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {s.exam_title}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {s.class_name}
                      </td>
                      <td className="px-4 py-3">
                        {s.score == null ? (
                          <span className="text-white/40">—</span>
                        ) : (
                          <span className="font-semibold text-white">
                            {Number(s.score).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatDate(s.submitted_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetail(s)}
                          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-indigo-400/40 hover:bg-white/10"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 px-3">
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Feedback / detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={
          detail ? `Submission — ${detail.student_name}` : 'Submission details'
        }
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
          <div className="space-y-6">
            {/* Info grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Student
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {detail.student_name}
                </p>
                <p className="text-xs text-white/50">{detail.student_email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Exam
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {detail.exam_title}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Class
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {detail.class_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Score
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {detail.score == null ? (
                    <span className="text-white/40">Not yet graded</span>
                  ) : (
                    Number(detail.score).toFixed(2)
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Status
                </p>
                <p className="mt-0.5">
                  <Badge variant={detail.status}>{detail.status}</Badge>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Graded at
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {formatDate(detail.graded_at)}
                </p>
              </div>
            </div>

            {/* OCR text */}
            {detail.ocr_text && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  OCR extracted text
                </p>
                <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-navy-950/50 p-3 text-xs text-white/70">
                  {detail.ocr_text}
                </pre>
              </div>
            )}

            {/* File URL */}
            {detail.file_url && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Submitted file
                </p>
                <a
                  href={detail.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <path d="M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  View file
                </a>
              </div>
            )}

            {/* Feedback */}
            {detail.feedback ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Feedback
                </p>
                <div className="mt-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <div className="mb-2 flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                    <span className="font-semibold">Graded feedback</span>
                  </div>
                  <p className="whitespace-pre-wrap">{detail.feedback}</p>
                </div>
              </div>
            ) : (
              detail.status === 'graded' && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                    Feedback
                  </p>
                  <p className="mt-1 text-sm text-white/60 italic">
                    No feedback provided.
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
