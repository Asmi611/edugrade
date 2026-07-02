import { Link } from 'react-router-dom';

/* =========================================================================
 * EduGrade — Landing page
 * Dark-navy + indigo theme. Tailwind only. Inline SVGs (no external assets).
 * =======================================================================*/

/* ----------------------------- Inline icons ----------------------------- */

const IconLogo = (props) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    <rect width="32" height="32" rx="8" fill="url(#eg-logo)" />
    <path
      d="M9 11h14M9 16h14M9 21h9"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <defs>
      <linearGradient id="eg-logo" x1="0" y1="0" x2="32" y2="32">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#4338ca" />
      </linearGradient>
    </defs>
  </svg>
);

const IconOCR = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2" />
    <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
    <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M8 12h8" />
    <path d="M8 9h5" />
    <path d="M8 15h6" />
  </svg>
);

const IconAI = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v3" />
    <path d="M12 19v3" />
    <path d="M4.93 4.93l2.12 2.12" />
    <path d="M16.95 16.95l2.12 2.12" />
    <path d="M2 12h3" />
    <path d="M19 12h3" />
    <path d="M4.93 19.07l2.12-2.12" />
    <path d="M16.95 7.05l2.12-2.12" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconCalendar = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M3 11h18" />
    <path d="M8 15h2" />
    <path d="M14 15h2" />
  </svg>
);

const IconBolt = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);

const IconChart = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 3 3 5-6" />
  </svg>
);

const IconUpload = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M5 20h14" />
  </svg>
);

const IconScan = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 7V5a2 2 0 0 1 2-2h2" />
    <path d="M16 3h2a2 2 0 0 1 2 2v2" />
    <path d="M20 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M8 21H6a2 2 0 0 1-2-2v-2" />
    <path d="M4 12h16" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  </svg>
);

const IconArrowRight = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </svg>
);

/* ----------------------------- Data ----------------------------- */

const FEATURES = [
  {
    icon: IconOCR,
    title: 'OCR Extraction',
    description:
      'Convert handwritten and scanned answer sheets into clean, structured text using high-accuracy OCR.',
  },
  {
    icon: IconAI,
    title: 'AI Grading',
    description:
      'Compare student responses against answer keys with semantic AI evaluation — far beyond keyword matching.',
  },
  {
    icon: IconShield,
    title: 'Role-based Access',
    description:
      'Separate workspaces for students, teachers, and admins with secure JWT authentication and approvals.',
  },
  {
    icon: IconCalendar,
    title: 'Exam Scheduling',
    description:
      'Create exams, assign them to classes, and set deadlines. Students see their timeline at a glance.',
  },
  {
    icon: IconBolt,
    title: 'Instant Feedback',
    description:
      'Students receive scores and per-question feedback the moment grading completes — no more waiting weeks.',
  },
  {
    icon: IconChart,
    title: 'Analytics',
    description:
      'Track class performance, identify weak topics, and export insights for every exam and student.',
  },
];

const STEPS = [
  {
    icon: IconUpload,
    label: 'Upload',
    title: 'Upload answer sheets',
    description:
      'Students or teachers upload scanned answer sheets in PDF or image formats — securely and in bulk.',
  },
  {
    icon: IconScan,
    label: 'Extract',
    title: 'Extract with OCR',
    description:
      'EduGrade runs each page through OCR, structuring handwriting and printed text into machine-readable answers.',
  },
  {
    icon: IconCheck,
    label: 'Grade',
    title: 'AI grades & explains',
    description:
      'Our AI matches answers against the key, assigns scores, and produces feedback teachers can review and publish.',
  },
];

/* ----------------------------- Components ----------------------------- */

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-navy-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <IconLogo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-white">
            Edu<span className="text-indigo-400">Grade</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-white/70 transition hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-white/70 transition hover:text-white">
            How it works
          </a>
          <a href="#footer" className="text-sm text-white/70 transition hover:text-white">
            About
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost hidden sm:inline-flex">
            Login
          </Link>
          <Link to="/register" className="btn-primary">
            Get Started
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-hero-grid"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 mx-auto h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center sm:pt-28 lg:pt-32">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-200">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          Smart Evaluation, Powered by OCR + AI
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Grade answer sheets in{' '}
          <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-indigo-200 bg-clip-text text-transparent">
            minutes,
          </span>{' '}
          not weeks.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          EduGrade automates the entire grading workflow for schools and
          universities — from scanning to scoring. Teachers reclaim their time,
          and students get feedback while it still matters.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary px-7 py-3 text-base">
            Get Started for Free
            <IconArrowRight className="h-5 w-5" />
          </Link>
          <a href="#how-it-works" className="btn-ghost px-7 py-3 text-base">
            See how it works
          </a>
        </div>

        {/* Stats strip */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          {[
            { value: '95%', label: 'OCR accuracy' },
            { value: '10x', label: 'Faster grading' },
            { value: '24/7', label: 'Instant feedback' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-white/50">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-t border-white/5 bg-navy-900/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to evaluate at scale
          </h2>
          <p className="mt-4 text-white/70">
            EduGrade brings OCR, AI, and classroom management together in a
            single, role-aware platform.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card-surface group">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20 transition group-hover:bg-indigo-500/25 group-hover:text-indigo-200">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-24">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three steps. Zero busywork.
          </h2>
          <p className="mt-4 text-white/70">
            From a stack of answer sheets to graded results in minutes.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connecting line (md+) */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent md:block"
          />

          <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl border border-indigo-400/30 bg-navy-800 text-indigo-300 shadow-glow">
                    <Icon className="h-10 w-10" />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-4 ring-navy-950">
                      {i + 1}
                    </span>
                  </div>

                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    {step.label}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">
                    {step.description}
                  </p>

                  {i < STEPS.length - 1 && (
                    <IconArrowRight
                      aria-hidden="true"
                      className="absolute right-[-22px] top-10 hidden h-6 w-6 text-indigo-400/60 md:block"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* CTA banner */}
        <div className="mx-auto mt-20 max-w-4xl overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-700/30 via-indigo-600/20 to-navy-800/40 p-8 sm:p-10">
          <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-2xl font-bold text-white">
                Ready to grade smarter?
              </h3>
              <p className="mt-2 text-white/70">
                Sign up free and evaluate your first batch of answer sheets today.
              </p>
            </div>
            <Link to="/register" className="btn-primary px-7 py-3 text-base">
              Get Started
              <IconArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      id="footer"
      className="border-t border-white/5 bg-navy-950/80 py-12"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm text-center md:text-left">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <IconLogo className="h-8 w-8" />
              <span className="text-lg font-bold tracking-tight text-white">
                Edu<span className="text-indigo-400">Grade</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Smart, role-based answer-sheet evaluation for modern classrooms.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Product
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a href="#features" className="text-white/70 hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-white/70 hover:text-white">
                    How it works
                  </a>
                </li>
                <li>
                  <Link to="/register" className="text-white/70 hover:text-white">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Company
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#footer" className="text-white/70 hover:text-white">About</a></li>
                <li><a href="#footer" className="text-white/70 hover:text-white">Contact</a></li>
                <li><a href="#footer" className="text-white/70 hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Legal
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#footer" className="text-white/70 hover:text-white">Privacy</a></li>
                <li><a href="#footer" className="text-white/70 hover:text-white">Terms</a></li>
                <li><a href="#footer" className="text-white/70 hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/50 sm:flex-row">
          <p>© {year} EduGrade. All rights reserved.</p>
          <p>Built with React, Tailwind &amp; Express.</p>
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
