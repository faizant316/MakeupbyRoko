import { useEffect, useRef, useState } from 'react';

// Last-look confirmation before a booking is actually sent.
//
// A client picked a date a full year out without noticing, then re-submitted
// twice trying to correct it. The calendar header is the only place the YEAR
// was ever shown — every echo afterwards said "Saturday, April 3" — so there
// was nothing on screen to catch it. This dialog is that catch: the date is
// restated in full, with the year set on its own line and large enough that
// reading it is unavoidable, and nothing sends until she confirms it.
//
// Props:
//   date      - full date string, year included
//   year      - the year alone. Split out of `date` for display so the year
//               reads as its own fact rather than as the tail of a long line.
//   service   - what they're booking
//   rows      - [{ label, value }] the other facts worth re-checking
//   notice    - { title, body } warning shown under those facts. Used for the
//               getting-ready address: Roko's second recurring problem is a
//               client who submits, then phones to move the location, then
//               submits the form again to try to fix it herself, which is how
//               one booking becomes three rows (2026-09-09).
//               Comes with a box she has to tick before the confirm button
//               unlocks. Roko (2026-10-15): clients tap straight through to send
//               so they're first in line, without reading the warning at all.
//   confirmLabel / busyLabel
//   submitting - true while the booking is saving
//   onConfirm / onCancel
export default function ConfirmBookingDialog({
  date,
  year,
  service,
  rows = [],
  notice = null,
  confirmLabel = 'Yes, this is correct',
  busyLabel = 'Sending…',
  submitting = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);
  // Starts unticked every time: the dialog unmounts when it closes, so a client
  // who goes back to fix the address has to check it again on the way out.
  const [checked, setChecked] = useState(false);
  const canConfirm = !notice || checked;

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
  // "Tuesday, October 24, 2028" → "Tuesday, October 24", so the year below it
  // is an emphasis rather than the same number printed twice.
  const dateHead = year ? String(date).replace(new RegExp(`,?\\s*${year}\\s*$`), '') : date;

  return (
    <div
      // Above the booking sheet (z-500). The sheet already holds the body
      // scroll lock, so this adds none of its own: a second lock would fight
      // the reference count on close.
      //
      // touch-action:none and data-lenis-prevent are what stop the booking sheet
      // behind this from scrolling under a thumb. Without them the page kept
      // moving behind the dialog, which makes a confirmation feel dismissable
      // when it isn't.
      data-lenis-prevent
      className="fixed inset-0 z-[600] flex items-stretch sm:items-center justify-center sm:px-6"
      style={{
        background: 'rgba(28,18,22,0.5)',
        backdropFilter: 'blur(4px)',
        touchAction: 'none',
        overscrollBehavior: 'contain',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onCancel?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-booking-title"
        tabIndex={-1}
        // Full height on a phone, a centred card on a desktop. It used to be a
        // bottom sheet that stopped at roughly three quarters of the screen,
        // which reads as a half-open panel rather than a decision to make.
        //
        // The facts scroll; the two buttons don't. On an iPhone with Safari's
        // bars showing (about 664px) the whole thing ran ~100px past the
        // bottom, so "Yes, send" sat half off the screen and "No, let me change
        // it" was nowhere to be seen (2026-10-15).
        className="w-full sm:max-w-[400px] bg-white rounded-none sm:rounded-[22px] outline-none h-[100dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden flex flex-col"
        style={{
          animation: 'slideUpSheet 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: '0 -8px 50px rgba(28,18,22,0.22), 0 2px 10px rgba(28,18,22,0.08)',
        }}
      >
        <div
          data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
        {/* my-auto, not justify-center: auto margins centre this in the space
            AND still let it scroll from the top when the content is taller
            than the screen, which centring alone clips. */}
        <div
          className="px-6 w-full my-auto"
          style={{
            paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
            paddingBottom: '1rem',
          }}
        >
          <div className="text-center mb-4">
            {/* Dropped on a short screen, where the room is worth more than
                the decoration. */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 [@media(max-height:760px)]:hidden" style={{ background: 'rgba(196,132,154,0.1)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.6" className="w-[18px] h-[18px]">
                <rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 id="confirm-booking-title" className="font-serif text-[1.3rem] leading-tight text-[#111]">
              Double-check your <em className="not-italic text-[#D4A0B0]">date</em>
            </h3>
            <p className="text-[0.76rem] text-[#9A918B] mt-1.5 leading-[1.55] max-w-[19rem] mx-auto text-balance">
              Deposits are non-refundable, so please make sure this is right.
            </p>
          </div>

          {/* The date, restated. The year sits on its own line because a
              mis-picked year is the exact mistake this exists to catch, and it
              disappears inside a long date string. */}
          <div
            className="rounded-2xl px-5 py-4 text-center mb-2.5"
            style={{ background: 'linear-gradient(180deg,#FDFBFC 0%,#FBF4F7 100%)', border: '1px solid #F0E2E9' }}
          >
            <p className="text-[0.54rem] font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color: '#C9AEBB' }}>Requested date</p>
            <p className="font-serif text-[1.08rem] leading-snug text-[#2C1A14]">{dateHead}</p>
            {year && (
              <p className="font-serif text-[2rem] leading-none tabular-nums mt-1.5" style={{ color: '#C4849A', letterSpacing: '0.01em' }}>{year}</p>
            )}
          </div>

          {facts.length > 0 && (
            <dl className={`rounded-2xl overflow-hidden ${notice ? 'mb-2.5' : ''}`} style={{ border: '1px solid #F0E7EC' }}>
              {facts.map((r, i) => (
                <div
                  key={r.label}
                  className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                  style={{ borderTop: i > 0 ? '1px solid #F8F3F6' : 'none' }}
                >
                  <dt className="text-[0.72rem] flex-shrink-0" style={{ color: '#A89BA2' }}>{r.label}</dt>
                  <dd className="text-[0.78rem] font-medium text-right leading-snug" style={{ color: '#2C1A14' }}>{r.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Deliberately no "email us to change it" line. The whole point is
              to make the address the client's job while it is still free to
              fix, so an escape hatch here would just move the phone call. */}
          {notice && (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5" style={{ background: 'rgba(196,132,154,0.07)', border: '1px solid #F0DCE4' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#B06883" strokeWidth="1.7" strokeLinecap="round" className="w-[15px] h-[15px] flex-shrink-0 mt-[1px]" aria-hidden="true">
                <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <div>
                <p className="text-[0.74rem] font-semibold mb-1" style={{ color: '#B06883' }}>{notice.title}</p>
                <p className="text-[0.76rem] leading-[1.6]" style={{ color: '#6E6058' }}>{notice.body}</p>
                {/* Same box as the agree tick on the agreement, so it reads as
                    something to do rather than more text to skim. */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => setChecked(c => !c)}
                  disabled={submitting}
                  className="mt-2 py-1 flex items-start gap-2.5 text-left touch-manipulation"
                >
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                    checked ? 'bg-[#111] border-[#111]' : 'bg-white border-[#D9BFCB]'
                  }`}>
                    {checked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                  <span className="text-[0.78rem] font-medium leading-[1.5] pt-[1px]" style={{ color: '#2C1A14' }}>
                    I made sure all my information is correct
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Pinned under the facts, clear of the home bar. */}
        <div
          className="shrink-0 px-6 pt-3 bg-white"
          style={{
            borderTop: '1px solid #F5EDF1',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting || !canConfirm}
              className={`w-full py-3.5 rounded-xl text-[0.85rem] font-medium tracking-[0.03em] transition-all touch-manipulation ${
                submitting
                  ? 'btn-busy bg-[#111] text-white'
                  : canConfirm
                    ? 'bg-[#111] text-white hover:bg-[#222] active:scale-[0.99] shadow-[0_4px_20px_rgba(0,0,0,0.16)]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span key={submitting ? 'busy' : 'idle'} className="btn-busy-label relative z-[1]">
                {submitting ? busyLabel : confirmLabel}
              </span>
            </button>
            {!canConfirm && (
              <p className="text-[0.66rem] text-gray-400 text-center pt-1">Check the box above to send</p>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-[0.8rem] font-medium transition-all touch-manipulation disabled:opacity-40 hover:bg-[#F7F4F5]"
              style={{ color: '#8b868d' }}
            >
              No, let me change it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
