/**
 * Login page
 * ----------
 * Renders the email/password form, calls AuthContext.login(), then
 * redirects the user to the dashboard that matches their role:
 *   admin   -> /admin
 *   teacher -> /teacher
 *   student -> /student
 *
 * If the user was redirected here from a protected route, they are sent
 * back to that location after a successful login.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

const ROLE_HOME = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      const fromPath = location.state?.from?.pathname;
      const home = ROLE_HOME[user.role] || '/';
      // Only honour `from` if it matches the user's allowed scope.
      const target =
        fromPath && fromPath.startsWith(home) ? fromPath : home;
      navigate(target, { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.20),_transparent_60%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-white/90 transition hover:text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 shadow-glow">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
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
            <span className="text-lg font-bold tracking-tight">EduGrade</span>
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-white/60">
              Sign in to continue to your dashboard.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="text-sm font-medium text-white/80">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                  placeholder="you@school.edu"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-white/80">
                  Password
                </span>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2.5 pr-20 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto rounded px-2 text-xs font-medium text-white/60 hover:text-white"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/60">
              New to EduGrade?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-300 hover:text-indigo-200"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
