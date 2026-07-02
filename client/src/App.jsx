/**
 * App — top-level router.
 *
 * Public routes:
 *   /            -> Landing
 *   /login       -> Login
 *   /register    -> Register
 *
 * Protected routes (role-gated):
 *   /student/*   -> requires role 'student'
 *   /teacher/*   -> requires role 'teacher'
 *   /admin/*     -> requires role 'admin'
 *
 * All page-level components are dynamically imported (React.lazy) so Vite
 * splits them into separate chunks loaded on-demand. This keeps the initial
 * bundle small.
 */

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// ---- Public pages (lazy) ----
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));

// ---- Student pages (lazy) ----
const StudentLayout = lazy(() => import('./pages/student/StudentLayout.jsx'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard.jsx'));
const StudentExams = lazy(() => import('./pages/student/StudentExams.jsx'));
const StudentSubmit = lazy(() => import('./pages/student/StudentSubmit.jsx'));
const StudentResults = lazy(() => import('./pages/student/StudentResults.jsx'));
const StudentAnalytics = lazy(() => import('./pages/student/StudentAnalytics.jsx'));

// ---- Teacher pages (lazy) ----
const TeacherLayout = lazy(() => import('./pages/teacher/TeacherLayout.jsx'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard.jsx'));
const TeacherExams = lazy(() => import('./pages/teacher/TeacherExams.jsx'));
const TeacherSubmissions = lazy(() => import('./pages/teacher/TeacherSubmissions.jsx'));
const TeacherStudents = lazy(() => import('./pages/teacher/TeacherStudents.jsx'));

// ---- Admin pages (lazy) ----
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminExams = lazy(() => import('./pages/admin/AdminExams.jsx'));
const AdminSubmissions = lazy(() => import('./pages/admin/AdminSubmissions.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'));

// ---- Loading fallback shown while a chunk loads ----
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-3">
        <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-white/50">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route element={<ProtectedRoute role="student" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="exams" element={<StudentExams />} />
              <Route path="submit" element={<StudentSubmit />} />
              <Route path="results" element={<StudentResults />} />
              <Route path="analytics" element={<StudentAnalytics />} />
            </Route>
          </Route>

          {/* Teacher */}
          <Route element={<ProtectedRoute role="teacher" />}>
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherStudents />} />
              <Route path="exams" element={<TeacherExams />} />
              <Route path="results" element={<TeacherSubmissions />} />
              <Route path="students" element={<TeacherStudents />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
