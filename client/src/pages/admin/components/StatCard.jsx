/**
 * StatCard — displays a single metric with an icon and accent color.
 */

const ACCENTS = {
  indigo: 'from-indigo-500/20 to-indigo-500/0 text-indigo-300 ring-indigo-400/30',
  emerald: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300 ring-emerald-400/30',
  amber: 'from-amber-500/20 to-amber-500/0 text-amber-300 ring-amber-400/30',
  rose: 'from-rose-500/20 to-rose-500/0 text-rose-300 ring-rose-400/30',
  sky: 'from-sky-500/20 to-sky-500/0 text-sky-300 ring-sky-400/30',
};

export default function StatCard({ label, value, accent = 'indigo', icon, hint }) {
  const accentClass = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${accentClass.split(' text-')[0]}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {value ?? <span className="inline-block h-7 w-12 animate-pulse rounded bg-white/10" />}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-white/50">{hint}</p>
          )}
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ${accentClass.split('from-')[0]} ${accentClass.split(' ').filter(c => c.startsWith('text-') || c.startsWith('ring-')).join(' ')}`}>
          {icon}
        </span>
      </div>
    </div>
  );
}
