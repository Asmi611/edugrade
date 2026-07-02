/**
 * StudentDashboard
 * ----------------
 * Landing page for students.
 *
 * - Welcome card with student name
 * - Upcoming exams list with countdown timers
 * - Recent results summary cards
 * - Quick action link to available exams
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
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

function Countdown({ deadline }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function tick() {
      if (!deadline) {
        setRemaining('');
        return;
      }
      const now = new Date();
      const end = new Date(deadline);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setRemaining('Closed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) setRemaining(`${days}d ${hours}h remaining`);
      else if (hours > 0) setRemaining(`${hours}h ${mins}m remaining`);
      else setRemaining(`${mins}m remaining`);
    }

    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!remaining) return null;

  return (
    <span className="text-xs font-semibold text-amber-300">
      ⏱ {remaining}
    </span>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const [exams, setExams] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    // Load each endpoint separately so we can show which one fails
    const errors = [];

    try {
      const examsRes = await api.get('/student/exams');
      setExams(examsRes.data?.exams || []);
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'exams (permission denied — try logging in as a student)'
        : `exams (${err.message})`;
      errors.push(msg);
    }

    try {
      const subsRes = await api.get('/student/submissions');
      setSubmissions(subsRes.data?.submissions || []);
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'submissions (permission denied — try logging in as a student)'
        : `submissions (${err.message})`;
      errors.push(msg);
    }

    try {
      const analyticsRes = await api.get('/student/analytics');
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'analytics (permission denied — try logging in as a student)'
        : `analytics (${err.message})`;
      errors.push(msg);
    }

    if (errors.length > 0) {
      setError(`Failed to load: ${errors.join(', ')}`);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Upcoming exams (status === 'upcoming' or 'open', not submitted)
  const upcomingExams = (exams || []).filter(
    (e) => !e.submitted && (e.status === 'upcoming' || e.status === 'open')
  );

  // Recent graded results
  const recentResults = (submissions || []).filter((s) => s.status === 'graded').slice(0, 4);
  const pendingCount = (submissions || []).filter((s) => s.status === 'submitted' || s.status === 'processing').length;
  const gradedCount = (submissions || []).filter((s) => s.status === 'graded').length;

  const studentName = user?.name || 'Student';

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 via-indigo-500/5 to-transparent p-6 sm:p-8">
        <div className="absolute right-4 top-4 text-6xl opacity-10 select-none">🎓</div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Welcome back, {studentName.split(' ')[0]}!
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/70 leading-relaxed">
          Your learning hub — view upcoming exams, submit answers, track results, and monitor your performance.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/student/exams"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Exams
          </Link>
          <Link
            to="/student/submit"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <path d="M7 10l5 5 5-5M12 15V3" />
            </svg>
            Submit Answer
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available Exams"
          value={upcomingExams.length}
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Exams Taken"
          value={analytics?.exams_taken ?? (submissions?.length || 0)}
          accent="emerald"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          }
        />
        <StatCard
          label="Graded"
          value={gradedCount}
          accent="sky"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
        />
        <StatCard
          label="Avg Score"
          value={analytics?.average_score != null ? `${analytics.average_score.toFixed(1)}` : '—'}
          accent="amber"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          }
        />
      </div>

      {/* Upcoming exams */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Upcoming Exams</h2>
          <Link
            to="/student/exams"
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            View all →
          </Link>
        </div>

        {exams === null ? (
          <SkeletonTable rows={3} cols={4} />
        ) : upcomingExams.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            No upcoming exams available.{' '}
            <Link to="/student/exams" className="font-semibold text-indigo-300 hover:text-indigo-200">
              Browse all exams →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingExams.slice(0, 6).map((exam) => (
              <div
                key={exam.id}
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white leading-tight">{exam.title}</h3>
                  <Badge variant={exam.status === 'upcoming' ? 'default' : 'graded'}>
                    {exam.status}
                  </Badge>
                </div>
                <p className="text-xs text-white/60">{exam.class_name} — {exam.subject}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Countdown deadline={exam.deadline} />
                  {exam.status === 'open' && (
                    <button
                      onClick={() => navigate(`/student/submit?examId=${exam.id}`)}
                      className="rounded-lg bg-indigo-500/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500"
                    >
                      Submit
                    </button>
                  )}
                  {exam.status === 'upcoming' && (
                    <span className="text-xs text-white/50">
                      {exam.scheduled_at ? formatDate(exam.scheduled_at) : 'TBD'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Results</h2>
          <Link
            to="/student/results"
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            View all →
          </Link>
        </div>

        {submissions === null ? (
          <SkeletonTable rows={3} cols={4} />
        ) : recentResults.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            {pendingCount > 0
              ? `${pendingCount} submission(s) pending grading.`
              : 'No results yet. Submit your first exam to get started!'}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentResults.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07]"
              >
                <p className="text-sm font-semibold text-white truncate">{s.exam_title}</p>
                <div className="mt-2 flex items-end justify-between">
                  <Badge variant="graded">{s.score != null ? `${Number(s.score).toFixed(0)}%` : '—'}</Badge>
                  <span className="text-[10px] text-white/40">{formatDate(s.submitted_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
