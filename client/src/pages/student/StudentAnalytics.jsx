/**
 * StudentAnalytics
 * ----------------
 * Performance analytics page.
 *
 * - Line chart of scores over time (recharts)
 * - Stat cards: average score, best score, exams taken
 * - Improvement badge (improving / stable / declining)
 * - Score breakdown table
 */

import { useCallback, useEffect, useState } from 'react';

import api from '../../lib/api.js';
import StatCard from '../admin/components/StatCard.jsx';
import { SkeletonTable } from '../admin/components/Skeleton.jsx';

// Lazy-load recharts to avoid bundle size issues
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatDate(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleDateString(); } catch (_) { return String(value); }
}

function TrendBadge({ trend }) {
  const config = {
    improving: {
      label: 'Improving',
      icon: '📈',
      colors: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    },
    declining: {
      label: 'Declining',
      icon: '📉',
      colors: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
    },
    stable: {
      label: 'Stable',
      icon: '➡️',
      colors: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
    },
  };

  const c = config[trend] || config.stable;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${c.colors}`}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}

export default function StudentAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/student/analytics');
      setAnalytics(data || null);
    } catch (err) {
      setError(err.message || 'Failed to load analytics.');
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chartData = (analytics?.score_by_exam || []).map((s) => ({
    name: s.exam_title?.length > 20 ? s.exam_title.slice(0, 20) + '…' : s.exam_title || 'Exam',
    score: Number(s.score),
    date: formatDate(s.date),
    fullTitle: s.exam_title,
  }));

  const noData = analytics && analytics.total_graded === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-white/60">
            Track your performance and progress over time.
          </p>
        </div>
        {analytics && !noData && (
          <TrendBadge trend={analytics.improvement_trend} />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Stat cards */}
      {analytics === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : noData ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
          <p className="text-lg mb-2">📊</p>
          <p>No graded exams yet. Submit your answers to start seeing analytics!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Average Score"
              value={`${analytics.average_score.toFixed(1)}`}
              hint={`out of ${analytics.total_graded} graded`}
              accent="indigo"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10M18 20V4M6 20v-6" />
                </svg>
              }
            />
            <StatCard
              label="Best Score"
              value={`${analytics.best_score.toFixed(1)}`}
              accent="emerald"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              }
            />
            <StatCard
              label="Lowest Score"
              value={`${analytics.lowest_score.toFixed(1)}`}
              accent="amber"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 15l4-4 4 4" />
                  <path d="M12 3v12" />
                </svg>
              }
            />
            <StatCard
              label="Exams Taken"
              value={analytics.exams_taken}
              hint={`${analytics.exams_pending} pending`}
              accent="sky"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              }
            />
          </div>

          {/* Line Chart */}
          {chartData.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Score Trend</h2>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1b4b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                      formatter={(value, name) => [`${Number(value).toFixed(1)}`, 'Score']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTitle || label}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#818cf8"
                      strokeWidth={2}
                      dot={{ fill: '#818cf8', stroke: '#1e1b4b', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#818cf8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Score breakdown table */}
          {chartData.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Score Breakdown</h2>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
                      <tr>
                        <th className="px-4 py-3 font-medium">Exam</th>
                        <th className="px-4 py-3 font-medium">Score</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {analytics.score_by_exam.map((s, i) => (
                        <tr key={i} className="hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-medium text-white">{s.exam_title}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                s.score >= 70 ? 'text-emerald-300' : s.score >= 40 ? 'text-amber-300' : 'text-rose-300'
                              }`}
                            >
                              {Number(s.score).toFixed(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/70">{formatDate(s.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
