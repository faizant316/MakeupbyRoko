import { useState, useEffect, useRef } from 'react';
import { Chevron, cx, inputClass } from './ui';

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// "2026-07-15" → "Wed, Jul 15, 2026"
function formatDisplay(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return raw; }
}

// "10:00 AM" → "10:00" (native time input value)
function timeTo24(val) {
  if (!val) return '';
  const m = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return '';
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${pad(h)}:${m[2]}`;
}

// "14:30" → "2:30 PM"
function timeFrom24(val) {
  if (!val) return '';
  const [hs, ms = '00'] = val.split(':');
  const h = parseInt(hs, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${ms} ${ampm}`;
}

// The month the calendar should land on: the picked date's month, else the
// openTo hint's month (never one that's already over), else this month.
function startMonth(value, openTo) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth());
  const raw = value || openTo;
  if (!raw) return thisMonth;
  const d = new Date(raw + 'T00:00:00');
  const m = new Date(d.getFullYear(), d.getMonth());
  return !value && m < thisMonth ? thisMonth : m;
}

// The floating panel under a picker's field: square, one hairline, the one
// shadow things that hover over the page are allowed.
const POPOVER = 'pop-in absolute left-0 top-full z-50 mt-1 rounded-card border border-line bg-paper shadow-[0_12px_32px_rgba(0,0,0,0.12)]';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden>
    <rect x="3" y="4.5" width="18" height="16.5" rx="1.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" />
  </svg>
);

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
    <path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
  </svg>
);

// Desktop: a boxed field + popover month calendar. Mobile: the native date
// wheel (best UX on touch). Value is a 'YYYY-MM-DD' string.
//
// openTo: a 'YYYY-MM-DD' whose month the calendar opens on while nothing is
// picked. A native date input can't be told where to open, so passing it
// swaps the phone wheel for this calendar too.
// marker: { date, label } dots one day and names it under the grid.
// autoOpen: pop the calendar the moment the field appears, if it's empty.
// dm and accent are still accepted from the callers that pass them; the
// colours come from the admin's palette now, which already knows dark mode,
// so a picked day is ink wherever the picker sits.
// eslint-disable-next-line no-unused-vars
export function AdminDatePicker({ value, onChange, dm, accent, openTo, marker, autoOpen = false }) {
  const [open, setOpen] = useState(autoOpen && !value);
  const ref = useRef(null);
  const nativeOnPhone = !openTo;

  const [view, setView] = useState(() => startMonth(value, openTo));

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Re-sync the visible month whenever a value is set from outside (e.g. the
  // scheduler pre-fills the client's requested date).
  useEffect(() => {
    if (value) { const d = new Date(value + 'T00:00:00'); setView(new Date(d.getFullYear(), d.getMonth())); }
  }, [value]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthName = view.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <>
      {/* Mobile: native date wheel */}
      {nativeOnPhone && (
        <div className="block sm:hidden">
          <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
            className={cx(inputClass, 'appearance-none')} />
        </div>
      )}

      {/* Desktop: popover calendar */}
      <div ref={ref} className={cx(nativeOnPhone && 'hidden sm:block', 'relative')}>
        {/* Every open lands on the right month, even after browsing away. */}
        <button type="button" onClick={() => { if (!open) setView(startMonth(value, openTo)); setOpen(o => !o); }}
          aria-expanded={open}
          className={cx(inputClass, 'flex items-center justify-between gap-2 text-left', open && 'border-ink/60')}>
          <span className={cx('truncate tabular-nums', value ? 'text-ink' : 'text-ink-muted/70')}>
            {value ? formatDisplay(value) : 'Select a date'}
          </span>
          <CalendarIcon />
        </button>

        {open && (
          <div className={cx(POPOVER, 'w-full p-3 sm:w-[300px]')} style={{ '--origin': 'top left' }}>
            {/* Month nav */}
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setView(new Date(year, month - 1))} aria-label="Previous month"
                className="press flex h-9 w-9 items-center justify-center rounded-ctl text-ink-muted hover:bg-canvas hover:text-ink">
                <Arrow dir="prev" />
              </button>
              <span className="text-[0.92rem] font-semibold tracking-[-0.01em] text-ink">{monthName}</span>
              <button type="button" onClick={() => setView(new Date(year, month + 1))} aria-label="Next month"
                className="press flex h-9 w-9 items-center justify-center rounded-ctl text-ink-muted hover:bg-canvas hover:text-ink">
                <Arrow dir="next" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink-muted">{d}</div>
              ))}
            </div>

            {/* Days. Only the picked day is filled; today says so with its
                colour, never with a ring of its own. */}
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="h-10 w-full sm:h-9" />;
                const k = dateKey(year, month, d);
                const isSel = value === k;
                const isToday = k === todayKey;
                const isMarked = marker?.date === k;
                return (
                  <button key={k} type="button" title={isMarked ? marker.label : undefined}
                    onClick={() => { onChange(k); setOpen(false); }}
                    aria-pressed={isSel}
                    className={cx(
                      'press relative flex h-10 w-full items-center justify-center rounded-ctl text-[0.86rem] tabular-nums transition-colors sm:h-9',
                      isSel ? 'bg-ink font-semibold text-paper'
                        : isToday ? 'font-semibold text-rose hover:bg-canvas'
                        : isMarked ? 'font-semibold text-ink hover:bg-canvas'
                        : 'text-ink hover:bg-canvas',
                    )}>
                    {d}
                    {isMarked && (
                      <span aria-hidden className={cx('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', isSel ? 'bg-paper' : 'bg-rose')} />
                    )}
                  </button>
                );
              })}
            </div>

            {marker?.date && (
              <div className="mt-2 flex items-center gap-2 border-t border-line px-1 pt-2.5">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                <span className="truncate text-[0.74rem] text-ink-muted">
                  {marker.label}, <span className="font-semibold text-ink">{formatDisplay(marker.date)}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Desktop: a boxed dropdown over the given time slots. Mobile: the native time
// wheel. Value/onChange use a display string like "10:00 AM". dm and accent
// are accepted for the same reason as above.
// eslint-disable-next-line no-unused-vars
export function AdminTimeSelect({ value, onChange, dm, slots = [], accent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Center the selected slot when opening so long lists don't start at the top.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el) listRef.current.scrollTop = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2;
  }, [open]);

  return (
    <>
      {/* Mobile: native time wheel */}
      <div className="block sm:hidden">
        <input type="time" value={timeTo24(value)} onChange={e => onChange(timeFrom24(e.target.value))}
          className={cx(inputClass, 'appearance-none')} />
      </div>

      {/* Desktop: dropdown */}
      <div ref={ref} className="relative hidden sm:block">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className={cx(inputClass, 'flex items-center justify-between gap-2 text-left', open && 'border-ink/60')}>
          <span className={cx('truncate tabular-nums', value ? 'text-ink' : 'text-ink-muted/70')}>{value || 'Select a time'}</span>
          <Chevron open={open} className="h-3.5 w-3.5 text-ink-muted" />
        </button>

        {open && (
          <div className={cx(POPOVER, 'right-0 p-1')} style={{ '--origin': 'top left' }}>
            <div ref={listRef} data-lenis-prevent className="relative max-h-[240px] overflow-y-auto overscroll-contain">
              {slots.map(t => {
                const isSel = t === value;
                return (
                  <button key={t} type="button" data-selected={isSel}
                    onClick={() => { onChange(t); setOpen(false); }}
                    className={cx('flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-[0.86rem] tabular-nums transition-colors',
                      isSel ? 'bg-canvas font-medium text-ink' : 'text-ink-soft hover:bg-canvas/60')}>
                    {t}
                    {isSel && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-rose" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
