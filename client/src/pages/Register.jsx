/**
 * Register page
 * -------------
 * Collects name / email / password / role.
 * If the role is "teacher", the user is asked to add one or more classes
 * they intend to teach (class_name + subject). On success, a "pending
 * approval" screen is shown — the user is NOT auto-logged-in because the
 * server keeps the account in `status='pending'` until an admin reviews it.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import api from '../lib/api.js';

const EMPTY_CLASS = { class_name: '', subject: '' };

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('student');
  const [classes, setClasses] = useState([{ ...EMPTY_CLASS }]);

  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successUser, setSuccessUser] = useState(null);

  // Fetch available classes for student registration
  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/classes')
      .then(({ data }) => {
        if (!cancelled && data?.classes) {
          setAvailableClasses(data.classes);
        }
      })
      .catch(() => {
        // silently ignore — classes are optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleClass(classId) {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }

  function updateClass(index, field, value) {
    setClasses((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }
  function addClass() {
    setClasses((prev) => [...prev, { ...EMPTY_CLASS }]);
  }
  function removeClass(index) {
    setClasses((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  function validate() {
    if (name.trim().length < 2) return 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return 'Please enter a valid email.';
    if (password.length < 6)
      return 'Password must be at least 6 characters long.';
    if (password !== confirm) return 'Passwords do not match.';
    if (role === 'teacher') {
      if (classes.length === 0)
        return 'Add at least one class you will teach.';
      for (let i = 0; i < classes.length; i++) {
        const c = classes[i];
        if (!c.class_name.trim() || !c.subject.trim()) {
          return `Class entry #${i + 1} needs both a class name and a subject.`;
        }
      }
    }
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };
    if (role === 'teacher') {
      payload.classes = classes.map((c) => ({
        class_name: c.class_name.trim(),
        subject: c.subject.trim(),
      }));
    }
    if (role === 'student' && selectedClassIds.length > 0) {
      payload.class_ids = selectedClassIds;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      setSuccessUser(data?.user || { name: payload.name, email: payload.email });
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------
  // Success screen
  // -------------------------------------------------------------------
  if (successUser) {
    return (
      <div className="min-h-screen bg-navy-950 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.20),_transparent_60%)]" />

        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-indigo-600/20 ring-1 ring-indigo-400/40">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-indigo-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold">
              Your account is pending approval
            </h1>
            <p className="mt-3 text-sm text-white/70">
              Thanks{successUser.name ? `, ${successUser.name}` : ''}! We&apos;ve
              received your registration for{' '}
              <span className="font-medium text-white">{successUser.email}</span>
              . An administrator will review your account shortly. You&apos;ll
              be able to sign in once it&apos;s approved.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Link to="/login" className="btn-primary w-full">
                Go to login
              </Link>
              <Link to="/" className="btn-ghost w-full">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.20),_transparent_60%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
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
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-white/60">
              Accounts are reviewed by an administrator before you can sign in.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              {/* Role selector */}
              <fieldset>
                <legend className="text-sm font-medium text-white/80">
                  I am a…
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { value: 'student', label: 'Student' },
                    { value: 'teacher', label: 'Teacher' },
                  ].map((opt) => {
                    const selected = role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={[
                          'rounded-lg border px-4 py-3 text-sm font-semibold transition',
                          selected
                            ? 'border-indigo-400/60 bg-indigo-500/15 text-white shadow-glow'
                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/5',
                        ].join(' ')}
                        aria-pressed={selected}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Student-only: class selection */}
              {role === 'student' && availableClasses.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-navy-900/40 p-4">
                  <h3 className="text-sm font-semibold text-white">
                    Select your class
                  </h3>
                  <p className="text-xs text-white/60">
                    Choose the classes you are enrolled in (optional — you can
                    join later).
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableClasses.map((cls) => {
                      const checked = selectedClassIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={[
                            'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
                            checked
                              ? 'border-indigo-400/60 bg-indigo-500/15 text-white'
                              : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/5',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleClass(cls.id)}
                            className="h-4 w-4 rounded border-white/20 bg-navy-900 text-indigo-500 focus:ring-indigo-400/30"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{cls.name}</span>
                            <span className="text-xs text-white/50">
                              {cls.subject} &middot; {cls.teacher_name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Name + email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-white/80">
                    Full name
                  </span>
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                    placeholder="Jane Doe"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-white/80">
                    Email
                  </span>
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
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-white/80">
                    Password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                    placeholder="At least 6 characters"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-white/80">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                    placeholder="Re-enter password"
                  />
                </label>
              </div>

              {/* Teacher-only: classes */}
              {role === 'teacher' && (
                <div className="rounded-xl border border-white/10 bg-navy-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Classes you teach
                      </h3>
                      <p className="text-xs text-white/60">
                        These will be reviewed by an admin and added to your
                        teaching workspace once approved.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addClass}
                      className="rounded-md border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                    >
                      + Add class
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {classes.map((c, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                      >
                        <label className="block">
                          <span className="text-xs font-medium text-white/70">
                            Class name
                          </span>
                          <input
                            type="text"
                            value={c.class_name}
                            onChange={(e) =>
                              updateClass(i, 'class_name', e.target.value)
                            }
                            placeholder="Grade 10 - A"
                            className="mt-1 w-full rounded-md border border-white/10 bg-navy-900/60 px-2.5 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium text-white/70">
                            Subject
                          </span>
                          <input
                            type="text"
                            value={c.subject}
                            onChange={(e) =>
                              updateClass(i, 'subject', e.target.value)
                            }
                            placeholder="Mathematics"
                            className="mt-1 w-full rounded-md border border-white/10 bg-navy-900/60 px-2.5 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeClass(i)}
                          disabled={classes.length === 1}
                          className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Remove class ${i + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/60">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-300 hover:text-indigo-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
