/**
 * TeacherDashboard
 * ----------------
 * Landing page for teachers. Shows:
 *   - Stat cards (exams created, submissions, graded, pending)
 *   - Recent submissions table (top 8)
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../lib/api.js';
import Badge from '../admin/components/Badge.jsx';
import StatCard from '../admin/components/StatCard.jsx';
import { SkeletonTable } from '../admin/components/Skeleton.jsx';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return String(value);
  }
}

export default function TeacherDashboard() {
  const [exams, setExams] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const { data: examsData } = await api.get('/teacher/exams');
      setExams(examsData?.exams || []);

      // Fetch submissions for the most recent exam with submissions
      const examList = examsData?.exams || [];
      const examWithSubs = examList.find((e) => e.total_submissions > 0);
      if (examWithSubs) {
        try {
          const { data: subsData } = await api.get(`/teacher/exams/${examWithSubs.id}/submissions`);
          setRecentSubmissions(subsData?.submissions?.slice(0, 8) || []);
        } catch (_) {
          setRecentSubmissions([]);
        }
      } else {
        setRecentSubmissions([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Derive stats from exams
  const totalExams = exams?.length || 0;
  const totalSubmissions = exams?.reduce((sum, e) => sum + (e.total_submissions || 0), 0) || 0;
  const totalGraded = exams?.reduce((sum, e) => sum + (e.graded_count || 0), 0) || 0;
  const totalPending = totalSubmissions - totalGraded;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-white/60">
          Your teaching overview at a glance.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ============ Stat cards ============ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Exams Created"
          value={totalExams}
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
          value={totalSubmissions}
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <path d="M7 10l5 5 5-5M12 15V3" />
            </svg>
          }
        />
        <StatCard
          label="Graded"
          value={totalGraded}
          accent="sky"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={totalPending}
          accent="amber"
          hint="awaiting grading"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
      </div>

      {/* ============ Quick actions ============ */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/teacher/exams"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Exam
        </Link>
        <Link
          to="/teacher/classes"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          My Classes
        </Link>
      </div>

      {/* ============ Recent exams / submissions ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your Exams</h2>
          <Link
            to="/teacher/exams"
            className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
          >
            View all →
          </Link>
        </div>

        {exams === null ? (
          <SkeletonTable rows={4} cols={5} />
        ) : exams.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            You haven't created any exams yet.{' '}
            <Link to="/teacher/exams" className="font-semibold text-emerald-300 hover:text-emerald-200">
              Create your first exam →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Exam</th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Submissions</th>
                    <th className="px-4 py-3 font-medium">Graded</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {exams.slice(0, 6).map((e) => (
                    <tr key={e.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">{e.title}</td>
                      <td className="px-4 py-3 text-white/80">{e.class_name}</td>
                      <td className="px-4 py-3 text-white/80">{e.total_submissions || 0}</td>
                      <td className="px-4 py-3">{e.graded_count || 0}</td>
                      <td className="px-4 py-3 text-white/70">{formatDate(e.deadline)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/teacher/results?examId=${e.id}`)}
                          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ============ Recent submissions ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Submissions</h2>
          <Link
            to="/teacher/results"
            className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
          >
            View all →
          </Link>
        </div>

        {recentSubmissions === null ? (
          <SkeletonTable rows={4} cols={5} />
        ) : recentSubmissions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            No submissions received yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {recentSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">
                        {s.student_name}
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {s.score == null ? (
                          <span className="text-white/40">—</span>
                        ) : (
                          <span className="font-semibold text-white">
                            {Number(s.score).toFixed(1)}
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
                          onClick={() => navigate(`/teacher/results?examId=${s.exam_id || ''}`)}
                          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10"
                        >
                          Details
                        </button>
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
