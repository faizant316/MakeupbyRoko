import { useState, useEffect, useRef } from 'react';

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

function palette(dm) {
  return dm
    ? { bg: '#1c1c28', panel: '#27272a', border: '#3a3a48', text: '#e4e4e7', muted: '#71717a', hover: '#2e2e38', headMuted: '#a1a1aa' }
    : { bg: '#fafafa', panel: '#fff', border: '#e5e5e5', text: '#111', muted: '#999', hover: '#F7F2F6', headMuted: '#888' };
}

// Desktop: a styled trigger + popover month calendar. Mobile: the native date
// wheel (best UX on touch). Value is a 'YYYY-MM-DD' string. Dark-mode aware.
export function AdminDatePicker({ value, onChange, dm, accent = '#111' }) {
  const p = palette(dm);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const base = value ? new Date(value + 'T00:00:00') : new Date();
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth()));

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

  const inputStyle = {
    minHeight: '48px', border: `1px solid ${p.border}`, background: p.bg, color: p.text, fontSize: '16px',
  };

  return (
    <>
      {/* Mobile — native date wheel */}
      <div className="block sm:hidden">
        <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
          className="w-full px-4 rounded-xl outline-none appearance-none" style={inputStyle} />
      </div>

      {/* Desktop — styled popover calendar */}
      <div ref={ref} className="hidden sm:block relative">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full px-4 rounded-xl outline-none flex items-center justify-between gap-2 transition-colors"
          style={{ ...inputStyle, borderColor: open ? accent : p.border }}>
          <span style={{ color: value ? p.text : p.muted, fontSize: '0.85rem' }}>
            {value ? formatDisplay(value) : 'Select a date'}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke={p.muted} strokeWidth="1.6" className="w-4 h-4 flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-2 left-0 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            style={{ background: p.panel, border: `1px solid ${p.border}`, width: '292px' }}>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button type="button" onClick={() => setView(new Date(year, month - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-colors"
                style={{ color: p.muted }}>‹</button>
              <span className="font-serif text-[0.95rem]" style={{ color: p.text }}>{monthName}</span>
              <button type="button" onClick={() => setView(new Date(year, month + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-colors"
                style={{ color: p.muted }}>›</button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[0.55rem] font-semibold uppercase py-1" style={{ color: p.muted }}>{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="w-9 h-9" />;
                const k = dateKey(year, month, d);
                const isSel = value === k;
                const isToday = k === todayKey;
                return (
                  <button key={k} type="button"
                    onClick={() => { onChange(k); setOpen(false); }}
                    className="w-9 h-9 flex items-center justify-center text-[0.82rem] rounded-lg transition-colors"
                    style={isSel
                      ? { background: accent, color: '#fff', fontWeight: 600 }
                      : { color: isToday ? accent : p.text, fontWeight: isToday ? 700 : 400 }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = p.hover; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                    {d}
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

// Desktop: a styled scroll dropdown over the given time slots. Mobile: the
// native time wheel. Value/onChange use a display string like "10:00 AM".
export function AdminTimeSelect({ value, onChange, dm, slots = [], accent = '#111' }) {
  const p = palette(dm);
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

  const inputStyle = {
    minHeight: '48px', border: `1px solid ${p.border}`, background: p.bg, color: p.text, fontSize: '16px',
  };

  return (
    <>
      {/* Mobile — native time wheel */}
      <div className="block sm:hidden">
        <input type="time" value={timeTo24(value)} onChange={e => onChange(timeFrom24(e.target.value))}
          className="w-full px-4 rounded-xl outline-none appearance-none" style={inputStyle} />
      </div>

      {/* Desktop — styled dropdown */}
      <div ref={ref} className="hidden sm:block relative">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full px-4 rounded-xl outline-none flex items-center justify-between gap-2 transition-colors"
          style={{ ...inputStyle, borderColor: open ? accent : p.border }}>
          <span style={{ color: value ? p.text : p.muted, fontSize: '0.85rem' }}>{value || 'Select a time'}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke={p.muted} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-2 left-0 right-0 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            style={{ background: p.panel, border: `1px solid ${p.border}` }}>
            <div ref={listRef} data-lenis-prevent className="max-h-[240px] overflow-y-auto overscroll-contain py-1.5">
              {slots.map(t => {
                const isSel = t === value;
                return (
                  <div key={t} data-selected={isSel}
                    onClick={() => { onChange(t); setOpen(false); }}
                    className="px-4 py-2.5 text-[0.82rem] cursor-pointer select-none transition-colors"
                    style={isSel ? { background: `${accent}1a`, color: accent, fontWeight: 600 } : { color: p.text }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = p.hover; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                    {t}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
