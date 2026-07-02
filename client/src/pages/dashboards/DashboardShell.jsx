/**
 * DashboardShell
 * --------------
 * Lightweight wrapper used by the per-role placeholder dashboards
 * (StudentHome, TeacherHome, AdminHome). It renders a topbar with the
 * current user, a logout button, and any children.
 *
 * Real role-specific layouts (sidebar, sub-routes, etc.) will replace
 * this in later milestones — for now its only job is to give the auth
 * flow somewhere meaningful to land.
 */

import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';

export default function DashboardShell({ title, accent = 'indigo', children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const accentClasses = {
    indigo: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/30',
    emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  };

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.20),_transparent_60%)]" />

      <header className="border-b border-white/10 bg-navy-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/90 transition hover:text-white"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 shadow-glow">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10L12 4 2 10l10 6 10-6z" />
                <path d="M6 12v5c0 1 4 3 6 3s6-2 6-3v-5" />
              </svg>
            </span>
            <span className="font-bold tracking-tight">EduGrade</span>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <span
                className={`hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 sm:inline-flex ${
                  accentClasses[accent] || accentClasses.indigo
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {user.role}
              </span>
            )}
            <span className="hidden text-sm text-white/70 sm:inline">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
