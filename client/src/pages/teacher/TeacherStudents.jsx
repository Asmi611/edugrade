/**
 * TeacherStudents
 * ---------------
 * Lists all students enrolled in this teacher's classes.
 * Shows: student name, email, class, subject, average score.
 * Searchable and paginated.
 */

import { useCallback, useEffect, useState } from 'react';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';
import Pagination from '../admin/components/Pagination.jsx';
import { SkeletonTable } from '../admin/components/Skeleton.jsx';

const PAGE_SIZE = 10;

export default function TeacherStudents() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const loadStudents = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/teacher/students');
      setStudents(data?.students || []);
    } catch (err) {
      setError(err.message || 'Failed to load students.');
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Client-side filtering
  const filtered = students
    ? students.filter((s) => {
        if (!search) return true;
        const q = search.trim().toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.class_name?.toLowerCase().includes(q) ||
          s.subject?.toLowerCase().includes(q)
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

  // Group by student name for unique rows (student may appear in multiple classes)
  // But for now, show each enrollment row separately — teachers want to see
  // which class each student is in.

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Students</h1>
        <p className="mt-1 text-sm text-white/60">
          All students enrolled in your classes.
        </p>
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
          placeholder="Search students…"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-9 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/60 focus:bg-white/10"
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
      {students === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Avg. Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-white/60">
                      {search ? 'No students match your search.' : 'No students enrolled in your classes.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s, idx) => (
                    <tr key={`${s.student_id || s.id}-${idx}`} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/30">
                            {s.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="font-medium text-white">{s.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{s.email}</td>
                      <td className="px-4 py-3 text-white/80">{s.class_name}</td>
                      <td className="px-4 py-3 text-white/70">{s.subject}</td>
                      <td className="px-4 py-3">
                        {s.avg_score == null ? (
                          <span className="text-white/40">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                            {Number(s.avg_score).toFixed(1)}%
                          </span>
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
