/**
 * StudentHome — minimal placeholder for the /student route.
 * Replaced in later milestones with the real student dashboard.
 */

import DashboardShell from './DashboardShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function StudentHome() {
  const { user } = useAuth();
  return (
    <DashboardShell title={`Welcome, ${user?.name || 'student'}`} accent="indigo">
      <div className="card-surface">
        <h2 className="text-lg font-semibold">Student dashboard</h2>
        <p className="mt-2 text-sm text-white/70">
          Your enrolled classes, upcoming exams, and submission history will
          show up here. Hang tight — these features are coming next.
        </p>
      </div>
    </DashboardShell>
  );
}
