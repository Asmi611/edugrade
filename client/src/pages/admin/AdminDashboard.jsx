/**
 * AdminDashboard
 * --------------
 * Landing page for admins. Shows:
 *   - 5 stat cards (students, teachers, exams, submissions, pending approvals)
 *   - Recent submissions table (top 8)
 *   - Pending approvals quick-action list with Approve / Reject buttons
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../lib/api.js';
import StatCard from './components/StatCard.jsx';
import Badge from './components/Badge.jsx';
import { SkeletonCard, SkeletonTable } from './components/Skeleton.jsx';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return String(value);
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [pending, setPending] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [statsRes, subsRes, pendingRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/submissions'),
        api.get('/admin/users', { params: { status: 'pending' } }),
      ]);
      setStats(statsRes.data);
      setSubmissions(subsRes.data?.submissions || []);
      setPending(pendingRes.data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function decide(userId, status) {
    setActionId(userId);
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      setPending((prev) => prev.filter((u) => u.id !== userId));
      // Refresh stats so the pendingApprovals counter stays accurate.
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-white/60">
          Platform-wide overview and quick actions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ============ Stat cards ============ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Students"
          value={stats?.totalStudents}
          accent="sky"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          }
        />
        <StatCard
          label="Teachers"
          value={stats?.totalTeachers}
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
            </svg>
          }
        />
        <StatCard
          label="Exams"
          value={stats?.totalExams}
          accent="emerald"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          }
        />
        <StatCard
          label="Submissions"
          value={stats?.totalSubmissions}
          accent="amber"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <path d="M7 10l5 5 5-5M12 15V3" />
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={stats?.pendingApprovals}
          accent="rose"
          hint="awaiting approval"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
      </div>

      {/* ============ Pending approvals ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Pending approvals</h2>
          <Link
            to="/admin/users"
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            View all users →
          </Link>
        </div>

        {pending === null ? (
          <SkeletonCard rows={4} />
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            🎉 No pending approvals — everyone's been reviewed.
          </div>
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 6).map((u) => (
              <li
                key={u.id}
                className="flex flex-col items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                    {u.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{u.name}</div>
                    <div className="text-xs text-white/60">
                      {u.email} · <Badge variant={u.role}>{u.role}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={actionId === u.id}
                    onClick={() => decide(u.id, 'approved')}
                    className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={actionId === u.id}
                    onClick={() => decide(u.id, 'rejected')}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ Recent submissions ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent submissions</h2>
          <Link
            to="/admin/submissions"
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            View all →
          </Link>
        </div>

        {submissions === null ? (
          <SkeletonTable rows={5} cols={5} />
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            No submissions yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Exam</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {submissions.slice(0, 8).map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{s.student_name}</div>
                        <div className="text-xs text-white/50">{s.student_email}</div>
                      </td>
                      <td className="px-4 py-3 text-white/80">{s.exam_title}</td>
                      <td className="px-4 py-3 text-white/80">
                        {s.score == null ? '—' : Number(s.score).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatDate(s.submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
