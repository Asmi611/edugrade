/**
 * Badge — small colored pill for status/role indicators.
 */

const VARIANTS = {
  pending: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  approved: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  rejected: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  student: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
  teacher: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/30',
  admin: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  submitted: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
  processing: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  graded: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  failed: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  closed: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  'manually_graded': 'bg-violet-500/15 text-violet-200 ring-violet-400/30',
  default: 'bg-white/10 text-white/80 ring-white/20',
};

export default function Badge({ children, variant }) {
  const cls = VARIANTS[variant] || VARIANTS.default;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
