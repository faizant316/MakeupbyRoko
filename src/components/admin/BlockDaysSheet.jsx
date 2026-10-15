import { useState, useEffect, useRef } from 'react';
import { Label, Sheet, buttonClass, cx, inputClass } from './ui';

const fmtLong = (key) => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const fmtShort = (key) => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const SUGGESTIONS = ['Vacation', 'Travel', 'Personal', 'Fully booked'];

// Nothing gets closed without this step. It confirms exactly which days, warns
// about anything already booked on them, and takes the reason that then shows
// on the calendar ("Canada trip" rather than a bare DAY OFF).
// eslint-disable-next-line no-unused-vars
export default function BlockDaysSheet({ dates = [], conflicts = [], busy, dm, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const inputRef = useRef(null);

  // Autofocus the reason on desktop only; on a phone it would throw up the
  // keyboard and hide the day list she is meant to be checking. A beat after
  // the sheet takes focus for itself, or it would take it straight back.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.matchMedia('(min-width: 768px)').matches) return undefined;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(t);
  }, []);

  const n = dates.length;
  const single = n === 1;
  // Escape, the scrim and the close button all stand down while it saves.
  const close = () => { if (!busy) onClose(); };

  return (
    <Sheet
      open
      onClose={close}
      size="sm"
      title={single ? 'Close this day off?' : `Close ${n} days off?`}
      headerExtra={(
        <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-muted">
          {single ? fmtLong(dates[0]) : `Clients won't be able to book any of these ${n} days.`}
        </p>
      )}
      footer={(
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} disabled={busy} className={buttonClass('quiet', 'lg', 'flex-1')}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy}
            className={buttonClass('alert', 'lg', 'flex-[1.4] px-5 font-semibold')}
          >
            {busy ? 'Closing…' : single ? 'Close this day' : `Close ${n} days`}
          </button>
        </div>
      )}
    >
      {/* The days themselves, so she can catch a mis-tap before it lands */}
      {!single && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {dates.map(d => (
            <span key={d} className="inline-flex h-7 items-center rounded-full bg-tone-alert/10 px-2.5 text-[0.74rem] font-medium tabular-nums text-tone-alert">
              {fmtShort(d)}
            </span>
          ))}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-5 border border-tone-alert/25 bg-tone-alert/[0.04] px-4 py-3">
          <p className="text-[0.8rem] font-semibold text-tone-alert">
            {conflicts.length} booking{conflicts.length === 1 ? '' : 's'} already on {single ? 'this day' : 'these days'}
          </p>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {conflicts.slice(0, 5).map((c, i) => (
              <p key={i} className="text-[0.74rem] text-ink-soft">
                {fmtShort(c.date)} · {c.label} · {c.kind}
              </p>
            ))}
            {conflicts.length > 5 && (
              <p className="text-[0.74rem] text-ink-muted">+{conflicts.length - 5} more</p>
            )}
          </div>
          <p className="mt-2 text-[0.74rem] leading-relaxed text-ink-muted">
            Closing won't cancel them. You'd need to reach out yourself.
          </p>
        </div>
      )}

      <label className="block">
        <Label>Reason (optional)</Label>
        <input
          ref={inputRef}
          type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy) onConfirm(reason.trim()); }}
          placeholder="e.g. Canada trip"
          maxLength={60}
          className={cx(inputClass, 'mt-2')}
        />
      </label>
      <p className="mt-2 text-[0.74rem] leading-relaxed text-ink-muted">
        This shows on your calendar so you remember why the day is closed. Clients never see it.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map(s => {
          const on = reason === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setReason(s)}
              aria-pressed={on}
              className={cx(
                'press inline-flex h-8 items-center rounded-ctl border px-2.5 text-[0.74rem] font-medium transition-colors',
                on ? 'border-rose/40 bg-rose/10 text-rose' : 'border-line text-ink-muted hover:border-ink/30 hover:text-ink',
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
