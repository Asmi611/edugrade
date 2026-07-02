/**
 * Pagination — simple client-side pager (10 per page by default).
 */

export default function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;

  const go = (p) => onChange(Math.max(1, Math.min(pageCount, p)));

  // Build a compact window of page numbers to show.
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);

  const btn =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white/80 transition hover:border-indigo-400/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';
  const active =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-indigo-400/60 bg-indigo-500/20 px-2 text-xs font-semibold text-white';

  return (
    <nav className="flex items-center justify-between gap-3 px-1 py-3">
      <div className="text-xs text-white/60">
        Page <span className="font-semibold text-white/90">{page}</span> of{' '}
        <span className="font-semibold text-white/90">{pageCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <button className={btn} disabled={page === 1} onClick={() => go(1)}>
          «
        </button>
        <button className={btn} disabled={page === 1} onClick={() => go(page - 1)}>
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={p === page ? active : btn}
            onClick={() => go(p)}
          >
            {p}
          </button>
        ))}
        <button
          className={btn}
          disabled={page === pageCount}
          onClick={() => go(page + 1)}
        >
          ›
        </button>
        <button
          className={btn}
          disabled={page === pageCount}
          onClick={() => go(pageCount)}
        >
          »
        </button>
      </div>
    </nav>
  );
}
