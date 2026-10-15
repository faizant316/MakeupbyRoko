'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '@/lib/useScrollLock';
import { cx } from './ui';

// The one "are you sure?" in the admin.
//
// The confirm button is the same ink-black primary every other action in the
// admin uses, or red when the thing is destructive. It is deliberately NOT the
// status colour: confirming an appointment used to put a blue pill on screen,
// a blue that belongs to the confirmed badge and appears nowhere else as a
// button. Colour carries meaning in one place instead of two.
//
// A sheet from the bottom on a phone, a small centred panel on a laptop, the
// same as every other pop-up. `icon` is accepted for the callers that still
// pass it; the words carry the decision now.

export default function ConfirmDialog({
  title,
  body,
  tone = 'default',         // 'default' | 'danger'
  confirmLabel = 'Yes, update',
  cancelLabel = 'Never mind',
  busy = false,
  onConfirm,
  onCancel,
  children = null,          // anything the decision needs (a reason box, say)
}) {
  // Callers pass an inline onCancel, new every render. Held in a ref so the
  // page lock is taken once on open and given back once on close, not
  // released and re-taken on every render in between.
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    lockScroll();
    const onKey = (e) => { if (e.key === 'Escape') cancelRef.current?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="sheet admin-ui fixed inset-0 z-[9998]" data-state="open">
      <div aria-hidden className="sheet-scrim absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          className="sheet-panel pointer-events-auto w-full bg-paper px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-ink sm:max-w-[400px] sm:border sm:border-line sm:p-7"
        >
          <p className="text-[1.15rem] font-semibold leading-snug tracking-[-0.02em]">{title}</p>
          {body && <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-muted">{body}</p>}

          {children && <div className="mt-5">{children}</div>}

          {/* Equal halves, full width. Two buttons of different widths read as
              "one of these is the real button"; the decision is the words. */}
          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="press h-12 flex-1 rounded border border-line-strong bg-paper text-[0.86rem] font-medium text-ink-soft hover:border-ink/50 hover:text-ink"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={cx(
                'press h-12 flex-1 rounded text-[0.86rem] font-semibold disabled:opacity-60',
                tone === 'danger' ? 'bg-tone-alert text-paper hover:bg-tone-alert/90' : 'bg-ink text-paper hover:bg-ink/85',
              )}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
