/**
 * Modal — minimal backdrop + dialog. Closes on backdrop click or ESC.
 */

import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-white/10 bg-navy-900 p-6 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:border-white/30 hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1 text-sm text-white/80">
          {children}
        </div>
        {footer && (
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
