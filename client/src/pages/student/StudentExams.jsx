/**
 * StudentExams
 * ------------
 * Lists all available exams for the student's enrolled classes.
 * Shows status badges (upcoming / open / closed).
 * "Submit Answer" button for open exams.
 * Search + pagination.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';
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

function ExamCountdown({ deadline }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function tick() {
      if (!deadline) { setRemaining(''); return; }
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Closed'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setRemaining(`${days}d ${hours}h`);
      else if (hours > 0) setRemaining(`${hours}h ${mins}m`);
      else setRemaining(`${mins}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!remaining || remaining === 'Closed') return null;
  return <span className="text-xs text-amber-300">⏱ {remaining}</span>;
}

export default function StudentExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const loadExams = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/student/exams');
      setExams(data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams.');
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // Filtering
  const filtered = (exams || []).filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.title?.toLowerCase().includes(q) && !e.class_name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filter !== 'all' && e.status !== filter) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filter]);

  const statusVariant = (status) => {
    if (status === 'open') return 'graded';
    if (status === 'upcoming') return 'pending';
    if (status === 'closed') return 'closed';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">My Exams</h1>
        <p className="mt-1 text-sm text-white/60">
          Browse exams for your enrolled classes and submit your answers.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams…"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-9 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-indigo-400/60 focus:bg-white/10"
          />
          <svg viewBox="0 0 24 24" className="absolute left-3 top-2.5 h-4 w-4 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
          {['all', 'upcoming', 'open', 'closed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-indigo-500/20 text-white ring-1 ring-indigo-400/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={loadExams}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ↻ Refresh
        </button>
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
                  <th className="px-4 py-3 font-medium">Exam</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 font-medium">Your Score</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-white/60">
                      No exams found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((exam) => (
                    <tr key={exam.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{exam.title}</div>
                        <ExamCountdown deadline={exam.deadline} />
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {exam.class_name}
                        <div className="text-xs text-white/50">{exam.subject}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(exam.status)}>{exam.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-white/70 text-xs">
                        {exam.deadline ? formatDate(exam.deadline) : 'No deadline'}
                      </td>
                      <td className="px-4 py-3">
                        {exam.my_score != null ? (
                          <span className="font-semibold text-white">
                            {Number(exam.my_score).toFixed(1)}
                            <span className="text-xs text-white/50">/100</span>
                          </span>
                        ) : exam.submitted ? (
                          <span className="text-xs text-amber-300">Pending</span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exam.submitted ? (
                          <button
                            onClick={() => navigate(`/student/results`)}
                            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 hover:border-indigo-400/40 hover:bg-white/10"
                          >
                            View Result
                          </button>
                        ) : exam.status === 'open' ? (
                          <button
                            onClick={() => navigate(`/student/submit?examId=${exam.id}`)}
                            className="rounded-md bg-indigo-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            Submit Answer
                          </button>
                        ) : exam.status === 'closed' ? (
                          <span className="text-xs text-rose-300/70 font-medium">Closed</span>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/10 px-3">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
