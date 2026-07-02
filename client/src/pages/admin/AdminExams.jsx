/**
 * AdminExams
 * ----------
 * Lists all exams with creator name and class.
 * Click "View" to see exam details in a modal.
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

export default function AdminExams() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const loadExams = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/exams');
      setExams(data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams.');
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // Client-side filtering
  const filtered = exams
    ? exams.filter((e) => {
        if (!search) return true;
        const q = search.trim().toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.creator_name?.toLowerCase().includes(q) ||
          e.class_name?.toLowerCase().includes(q) ||
          e.class_subject?.toLowerCase().includes(q)
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
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Exams</h1>
          <p className="mt-1 text-sm text-white/60">
            Browse all exams across classes.
          </p>
        </div>
        <button
          onClick={loadExams}
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

      {/* Search */}
      <div className="relative max-w-xs">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exams…"
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

      {/* Table */}
      {exams === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Creator</th>
                  <th className="px-4 py-3 font-medium">Submissions</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
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
                      No exams found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((e) => (
                    <tr key={e.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">
                        {e.title}
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {e.class_name}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {e.class_subject}
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {e.creator_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/30">
                          {e.submission_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatDate(e.scheduled_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetail(e)}
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

      {/* Details modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title || 'Exam details'}
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
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Exam ID
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  #{detail.id}
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
                  Subject
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {detail.class_subject}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Created by
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {detail.creator_name} ({detail.creator_role})
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Submissions
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {detail.submission_count ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Scheduled
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {formatDate(detail.scheduled_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Deadline
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {formatDate(detail.deadline)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  AI Grading
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {detail.use_ai_key ? (
                    <Badge variant="graded">Enabled</Badge>
                  ) : (
                    <Badge variant="default">Disabled</Badge>
                  )}
                </p>
              </div>
            </div>
            {detail.answer_key_text && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                  Answer key
                </p>
                <pre className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-navy-950/50 p-3 text-xs text-white/70">
                  {detail.answer_key_text}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
