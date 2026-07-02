/**
 * ProtectedRoute
 * --------------
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute role="teacher" />}>
 *     <Route path="/teacher" element={<TeacherHome />} />
 *   </Route>
 *
 * Behaviour:
 *   - while auth is bootstrapping → renders a small loading state
 *   - if there is no user           → redirect to /login (preserving from)
 *   - if `role`/`roles` is provided
 *     and the user's role doesn't match → redirect to /
 *   - otherwise → renders <Outlet />
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ role, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white/70">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-ping rounded-full bg-indigo-400" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = roles && roles.length ? roles : role ? [role] : null;
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
