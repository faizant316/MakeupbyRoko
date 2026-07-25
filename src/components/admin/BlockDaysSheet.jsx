import { useState, useEffect, useRef } from 'react';
import { useScrollLock } from '@/lib/useScrollLock';

const OFF_RED = '#EF4444';
const fmtLong = (key) => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const fmtShort = (key) => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// Nothing gets closed without this step. It confirms exactly which days, warns
// about anything already booked on them, and takes the reason that then shows
// on the calendar ("Canada trip" rather than a bare DAY OFF).
export default function BlockDaysSheet({ dates = [], conflicts = [], busy, dm, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const inputRef = useRef(null);
  useScrollLock();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  // Autofocus the reason on desktop only; on a phone it would throw up the
  // keyboard and hide the day list she is meant to be checking.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, []);

  const n = dates.length;
  const single = n === 1;
  const panel = { background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#E9E9EF'}` };

  const SUGGESTIONS = ['Vacation', 'Travel', 'Personal', 'Fully booked'];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(16,16,22,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={() => { if (!busy) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={single ? 'Close this day off' : `Close ${n} days off`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[440px] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
        style={{ ...panel, maxHeight: '88vh', animation: 'fadeRiseIn 0.24s cubic-bezier(0.22,1,0.36,1)' }}
      >
        {/* Grab handle, so it reads as a sheet on a phone */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-9 h-1 rounded-full" style={{ background: dm ? '#3f3f4a' : '#DDDDE5' }} />
        </div>

        <div className="px-5 pt-4 sm:pt-5 pb-3">
          <h3 className="font-serif text-[1.25rem] leading-tight" style={{ color: dm ? '#e4e4e7' : '#111' }}>
            {single ? 'Close this day off?' : `Close ${n} days off?`}
          </h3>
          <p className="text-[0.76rem] mt-1.5 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
            {single ? fmtLong(dates[0]) : `Clients won't be able to book any of these ${n} days.`}
          </p>
        </div>

        <div className="px-5 flex-1 min-h-0 overflow-auto">
          {/* The days themselves, so she can catch a mis-tap before it lands */}
          {!single && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {dates.map(d => (
                <span key={d} className="text-[0.66rem] font-medium px-2 py-1 rounded-lg"
                  style={{ background: dm ? 'rgba(224,85,73,0.16)' : '#FFF4F2', color: dm ? '#fca5a5' : '#C0392B', border: '1px solid rgba(224,85,73,0.3)' }}>
                  {fmtShort(d)}
                </span>
              ))}
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="rounded-xl px-3.5 py-3 mb-4"
              style={{ background: dm ? 'rgba(224,121,91,0.12)' : '#FFF8F5', border: `1px solid ${dm ? 'rgba(224,121,91,0.35)' : '#F6DCD1'}` }}>
              <p className="text-[0.72rem] font-semibold mb-1" style={{ color: '#E0795B' }}>
                {conflicts.length} booking{conflicts.length === 1 ? '' : 's'} already on {single ? 'this day' : 'these days'}
              </p>
              <div className="flex flex-col gap-0.5">
                {conflicts.slice(0, 5).map((c, i) => (
                  <p key={i} className="text-[0.68rem]" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
                    {fmtShort(c.date)} · {c.label} · {c.kind}
                  </p>
                ))}
                {conflicts.length > 5 && (
                  <p className="text-[0.68rem]" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>+{conflicts.length - 5} more</p>
                )}
              </div>
              <p className="text-[0.66rem] mt-1.5 leading-relaxed" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
                Closing won't cancel them. You'd need to reach out yourself.
              </p>
            </div>
          )}

          <label className="block">
            <span className="text-[0.58rem] font-semibold tracking-[0.12em] uppercase" style={{ color: dm ? '#71717a' : '#A6A6AF' }}>
              Reason (optional)
            </span>
            <input
              ref={inputRef}
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy) onConfirm(reason.trim()); }}
              placeholder="e.g. Canada trip"
              maxLength={60}
              className="w-full rounded-xl px-3 py-2.5 text-[0.85rem] outline-none mt-1.5"
              style={{
                background: dm ? '#1e1e24' : '#fff',
                border: `1px solid ${dm ? '#3a3a48' : '#E5E7EB'}`,
                color: dm ? '#e4e4e7' : '#111',
              }}
            />
          </label>
          <p className="text-[0.66rem] mt-1.5 leading-relaxed" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
            This shows on your calendar so you remember why the day is closed. Clients never see it.
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2.5 mb-1">
            {SUGGESTIONS.map(s => (
              <button key={s} type="button" onClick={() => setReason(s)}
                className="text-[0.66rem] font-medium px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: reason === s ? (dm ? 'rgba(212,160,176,0.2)' : '#FDF5F8') : 'transparent',
                  color: reason === s ? '#A0607A' : (dm ? '#a1a1aa' : '#83838d'),
                  border: `1px solid ${reason === s ? '#EFD0DE' : (dm ? '#3a3a48' : '#E9E9EF')}`,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-5 py-4 mt-2"
          style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-[0.78rem] font-semibold transition-all active:scale-[0.98]"
            style={{ background: dm ? '#2e2e38' : '#F2F2F6', color: dm ? '#d4d4d8' : '#55555d' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={busy}
            className="flex-[1.4] py-2.5 rounded-xl text-[0.78rem] font-semibold transition-all active:scale-[0.98]"
            style={{ background: OFF_RED, color: '#fff', opacity: busy ? 0.7 : 1, boxShadow: '0 1px 3px rgba(239,68,68,0.3)' }}>
            {busy ? 'Closing…' : single ? 'Close this day' : `Close ${n} days`}
          </button>
        </div>
      </div>
    </div>
  );
}
