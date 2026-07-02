/**
 * TeacherHome — minimal placeholder for the /teacher route.
 * Replaced in later milestones with the real teacher dashboard.
 */

import DashboardShell from './DashboardShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TeacherHome() {
  const { user } = useAuth();
  return (
    <DashboardShell title={`Welcome, ${user?.name || 'teacher'}`} accent="emerald">
      <div className="card-surface">
        <h2 className="text-lg font-semibold">Teacher dashboard</h2>
        <p className="mt-2 text-sm text-white/70">
          Class rosters, exam scheduling, answer-key uploads, and grading
          tools will live here. Coming up in the next milestone.
        </p>
      </div>
    </DashboardShell>
  );
}
