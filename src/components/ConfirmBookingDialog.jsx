import { useEffect, useRef } from 'react';

// Last-look confirmation before a booking is actually sent.
//
// A client picked a date a full year out without noticing, then re-submitted
// twice trying to correct it. The calendar header is the only place the YEAR
// was ever shown — every echo afterwards said "Saturday, April 3" — so there
// was nothing on screen to catch it. This dialog is that catch: the date is
// restated in full, with the year on its own line and set large enough that
// reading it is unavoidable, and nothing sends until she confirms it.
//
// Props:
//   date      - full date string, MUST include the year (the whole point)
//   year      - the year alone, called out under the date
//   service   - what they're booking
//   rows      - [{ label, value }] extra facts worth re-checking (time, place)
//   confirmLabel / busyLabel
//   submitting - true while the booking is saving
//   onConfirm / onCancel
export default function ConfirmBookingDialog({
  date,
  year,
  service,
  rows = [],
  confirmLabel = 'Yes, this is correct',
  busyLabel = 'Sending…',
  submitting = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);

  // Escape backs out, the same as the "let me change it" button. Never while
  // submitting — the booking is already in flight and closing would only hide
  // it from her.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, submitting]);

  // Focus the panel so the dialog owns the keyboard immediately, and so screen
  // readers announce the date rather than leaving focus behind on the sheet.
  useEffect(() => { panelRef.current?.focus(); }, []);

  const facts = rows.filter(r => r && r.value);

  return (
    <div
      // Above the booking sheet (z-500). The sheet already holds the body
      // scroll lock, so this adds none of its own — a second lock would fight
      // the reference count on close.
      className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center px-0 sm:px-6"
      style={{ background: 'rgba(28,18,22,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onCancel?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-booking-title"
        tabIndex={-1}
        data-lenis-prevent
        className="w-full sm:max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl outline-none overflow-hidden max-h-[92dvh] overflow-y-auto overscroll-contain"
        style={{
          animation: 'slideUpSheet 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="px-6 pt-6 pb-5">
          <div className="text-center mb-5">
            <div className="w-11 h-11 rounded-2xl bg-[#D4A0B0]/12 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.5" className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 id="confirm-booking-title" className="font-serif text-[1.35rem] leading-tight text-[#111]">
              Double-check your <em className="not-italic text-[#D4A0B0]">date</em>
            </h3>
            <p className="text-[0.78rem] text-gray-400 mt-1.5 leading-[1.6]">
              This is what Roko will receive. Deposits are non-refundable, so please make sure it&apos;s right.
            </p>
          </div>

          {/* The date, restated large. The year gets its own line under it
              because a mis-picked year is the exact mistake this exists to
              catch, and it hides inside a long date string. */}
          <div className="rounded-2xl border border-[#EFDDE6] bg-[#FDFBFC] px-5 py-4 text-center mb-3">
            <p className="text-[0.55rem] font-bold tracking-[0.18em] uppercase text-[#C4A9B7] mb-1.5">Your requested date</p>
            <p className="font-serif text-[1.15rem] leading-snug text-[#111]">{date}</p>
            {year && (
              <p className="font-serif text-[2rem] leading-none tabular-nums mt-1.5" style={{ color: '#C4849A' }}>{year}</p>
            )}
          </div>

          {facts.length > 0 && (
            <dl className="rounded-2xl border border-[#F0E7EC] bg-white overflow-hidden mb-5">
              {facts.map((r, i) => (
                <div
                  key={r.label}
                  className={`flex items-baseline justify-between gap-4 px-4 py-2.5 ${i > 0 ? 'border-t border-[#F7F1F4]' : ''}`}
                >
                  <dt className="text-[0.7rem] text-[#9A8E94] flex-shrink-0">{r.label}</dt>
                  <dd className="text-[0.76rem] text-[#333] text-right leading-snug">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {service && facts.length === 0 && <div className="mb-5" />}

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className={`w-full py-3.5 rounded-xl text-[0.85rem] font-medium tracking-[0.04em] transition-all ${
                submitting
                  ? 'btn-busy bg-[#111] text-white'
                  : 'bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)]'
              }`}
            >
              <span key={submitting ? 'busy' : 'idle'} className="btn-busy-label relative z-[1]">
                {submitting ? busyLabel : confirmLabel}
              </span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-[0.8rem] font-medium text-[#8b868d] border border-gray-200 bg-white hover:border-gray-400 transition-all disabled:opacity-40"
            >
              No, let me change it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
