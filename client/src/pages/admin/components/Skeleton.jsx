/**
 * Loading skeletons used across the admin pages.
 */

export function SkeletonLine({ className = '' }) {
  return (
    <div
      className={`h-3 animate-pulse rounded bg-white/10 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card-surface !hover:translate-y-0 space-y-3">
      <SkeletonLine className="w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className={i % 2 ? 'w-3/4' : 'w-2/3'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 bg-white/5 px-4 py-3">
        <SkeletonLine className="w-1/4" />
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 px-4 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLine key={c} className={c === 0 ? 'w-3/4' : 'w-1/2'} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
