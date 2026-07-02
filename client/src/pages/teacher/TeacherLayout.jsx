/**
 * TeacherLayout
 * -------------
 * Persistent teacher shell:
 *   - collapsible sidebar (Dashboard, My Classes, Exams, Students, Results)
 *   - top bar with teacher's name + logout
 *   - <Outlet /> for active sub-route
 *
 * Mirrors the AdminLayout pattern for consistency.
 */

import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';

const COLLAPSE_KEY = 'edugrade_teacher_sidebar_collapsed';

const NAV_ITEMS = [
  {
    to: '/teacher',
    end: true,
    label: 'Dashboard',
    icon: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
  },
  {
    to: '/teacher/classes',
    label: 'My Classes',
    icon: (
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
  },
  {
    to: '/teacher/exams',
    label: 'Exams',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    to: '/teacher/students',
    label: 'Students',
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
      </>
    ),
  },
  {
    to: '/teacher/results',
    label: 'Results',
    icon: (
      <>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <path d="M7 10l5 5 5-5M12 15V3" />
      </>
    ),
  },
];

export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch (_) {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch (_) {
      /* ignore */
    }
  }, [collapsed]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.15),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(5,150,105,0.15),_transparent_55%)]" />

      {/* ============= Sidebar (desktop) ============= */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden ${sidebarWidth} flex-col border-r border-white/10 bg-navy-900/80 backdrop-blur transition-[width] duration-200 lg:flex`}
      >
        <SidebarBrand collapsed={collapsed} />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-emerald-400/40 hover:bg-white/10 hover:text-white"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ============= Sidebar (mobile drawer) ============= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-navy-900">
            <SidebarBrand collapsed={false} />
            <nav className="flex-1 space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => (
                <SidebarLink
                  key={item.to}
                  item={item}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ============= Main column ============= */}
      <div className={`flex min-h-screen flex-col ${collapsed ? 'lg:pl-20' : 'lg:pl-64'} transition-[padding] duration-200`}>
        <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/70 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/80 transition hover:border-emerald-400/40 hover:bg-white/10 lg:hidden"
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <span className="hidden text-sm text-white/50 sm:inline">
                Teacher Console
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 sm:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  teacher
                </span>
                <div className="text-right leading-tight">
                  <div className="text-sm font-semibold text-white">
                    {user?.name || 'Teacher'}
                  </div>
                  <div className="text-xs text-white/50">{user?.email}</div>
                </div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/30">
                {(user?.name || 'T').slice(0, 1).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SidebarBrand({ collapsed }) {
  return (
    <Link
      to="/teacher"
      className="flex h-16 items-center gap-2 border-b border-white/10 px-4 text-white"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10L12 4 2 10l10 6 10-6z" />
          <path d="M6 12v5c0 1 4 3 6 3s6-2 6-3v-5" />
        </svg>
      </span>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">EduGrade</div>
          <div className="text-[10px] uppercase tracking-widest text-white/50">
            Teacher
          </div>
        </div>
      )}
    </Link>
  );
}

function SidebarLink({ item, collapsed, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-emerald-500/15 text-white ring-1 ring-emerald-400/30'
            : 'text-white/70 hover:bg-white/5 hover:text-white',
          collapsed ? 'justify-center' : '',
        ].join(' ')
      }
      title={collapsed ? item.label : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {item.icon}
      </svg>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}
