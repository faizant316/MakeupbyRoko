import { useState, useEffect, useRef } from 'react';

const TIMES = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM',
];

const STATUSES = [
  { value: 'pending',   label: 'Pending',   color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmed', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#22C55E' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// Custom calendar used on desktop; native <input type="date"> used on mobile
function DesktopCalendar({ value, onChange, dm }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [view, setView] = useState(() => {
    const d = parsed || today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const select = (d) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
  };

  const isSelected = (d) => {
    if (!d || !parsed) return false;
    return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === d;
  };

  const isToday = (d) => {
    if (!d) return false;
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  };

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setView(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-60"
          style={{ color: dm ? '#a1a1aa' : '#888' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="font-serif text-[1rem]" style={{ color: dm ? '#f4f4f5' : '#111' }}>
          {MONTHS[month]} {year}
        </span>
        <button type="button" onClick={() => setView(new Date(year, month + 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-60"
          style={{ color: dm ? '#a1a1aa' : '#888' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[0.6rem] font-semibold tracking-[0.08em] uppercase py-1"
            style={{ color: dm ? '#52525b' : '#bbb' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          const sel = isSelected(d);
          const tod = isToday(d);
          return (
            <div key={i} className="flex items-center justify-center">
              {d ? (
                <button type="button" onClick={() => select(d)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[0.82rem] transition-all"
                  style={sel
                    ? { background: '#111', color: '#fff', fontWeight: 600 }
                    : tod
                    ? { color: '#D4A0B0', fontWeight: 700 }
                    : { color: dm ? '#a1a1aa' : '#444' }
                  }
                >{d}</button>
              ) : <div className="w-8 h-8" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Styled dropdown for desktop; native <select> on mobile
function StyledSelect({ value, onChange, options, placeholder, dm }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const border = dm ? '#3f3f46' : '#EDE6DF';
  const textPrimary = dm ? '#f4f4f5' : '#1a1a1a';
  const textMuted = dm ? '#71717a' : '#aaa';
  const menuBg = dm ? '#27272a' : '#fff';

  return (
    <>
      {/* Mobile: native select */}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="sm:hidden w-full bg-transparent outline-none font-medium cursor-pointer py-1"
        style={{ color: value ? textPrimary : textMuted, fontSize: '16px' }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {/* Desktop: custom dropdown */}
      <div ref={ref} className="hidden sm:block relative">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between py-1 outline-none"
          style={{ color: value ? textPrimary : textMuted }}>
          <span className="text-[0.85rem] font-medium">{value || placeholder}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2.5"
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.14)]"
            style={{ background: menuBg, border: `1px solid ${border}`, animation: 'fadeSlideDown 0.15s ease-out' }}>
            {options.map(o => (
              <button key={o} type="button"
                onMouseDown={() => { onChange(o); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-[0.82rem] transition-colors"
                style={o === value
                  ? { background: 'rgba(212,160,176,0.1)', color: '#D4A0B0', fontWeight: 600 }
                  : { color: dm ? '#a1a1aa' : '#444' }
                }
              >{o}</button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function EditBookingModal({ booking, onSave, onClose, darkMode: dm }) {
  const [SERVICES, setServices] = useState([]);
  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data.map(s => s.title).filter(Boolean) : []));
  }, []);

  const [form, setForm] = useState({
    name: booking.name || '',
    email: booking.email || '',
    phone: booking.phone || '',
    service: booking.service || '',
    date: booking.date || '',
    time: booking.time || '',
    notes: booking.notes || '',
    status: booking.status || 'pending',
    deposit_received: booking.deposit_received || false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const cardBg = dm ? '#27272a' : '#ffffff';
  const border = dm ? '#3f3f46' : '#EDE6DF';
  const sectionBg = dm ? '#1e1e24' : '#FAF7F4';
  const textPrimary = dm ? '#f4f4f5' : '#1a1a1a';
  const textMuted = dm ? '#71717a' : '#aaa';

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[500px] max-h-[92vh] sm:max-h-[calc(100vh-3rem)] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? '#2e2e38' : '#F7EEF2' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <p className="text-[0.58rem] font-bold tracking-[0.14em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.15rem] leading-tight" style={{ color: textPrimary }}>Edit Appointment</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: dm ? '#3f3f46' : '#f0ece8', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 flex flex-col gap-5">

            {/* ── CLIENT ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">👤</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Client</p>
              </div>
              {[
                { key: 'name', label: 'Name', type: 'text', ph: 'Client name' },
                { key: 'phone', label: 'Phone', type: 'tel', ph: '(555) 000-0000' },
                { key: 'email', label: 'Email', type: 'email', ph: 'email@example.com' },
              ].map(({ key, label, type, ph }, i, arr) => (
                <div key={key} className="flex items-center px-4 py-3.5 gap-3"
                  style={{ borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <p className="text-[0.72rem] w-12 flex-shrink-0" style={{ color: textMuted }}>{label}</p>
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                    className="flex-1 bg-transparent outline-none font-medium"
                    style={{ color: textPrimary, fontSize: '16px' }} placeholder={ph} />
                </div>
              ))}
            </div>

            {/* ── SERVICE ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">✦</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Service</p>
              </div>
              <div className="px-4 py-3">
                <StyledSelect
                  value={form.service}
                  onChange={v => set('service', v)}
                  options={SERVICES}
                  placeholder="Select service…"
                  dm={dm}
                />
              </div>
            </div>

            {/* ── DATE & TIME ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">📅</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Date &amp; Time</p>
              </div>

              {/* Mobile: native date input */}
              <div className="sm:hidden flex items-center px-4 py-3.5 gap-3" style={{ borderBottom: `1px solid ${border}` }}>
                <p className="text-[0.72rem] w-12 flex-shrink-0" style={{ color: textMuted }}>Date</p>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="flex-1 bg-transparent outline-none font-medium cursor-pointer"
                  style={{ color: textPrimary, fontSize: '16px' }} />
              </div>

              {/* Desktop: custom calendar */}
              <div className="hidden sm:block px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                <DesktopCalendar value={form.date} onChange={v => set('date', v)} dm={dm} />
              </div>

              {/* Formatted date label (always shown) */}
              {dateFormatted && (
                <div className="px-4 py-2" style={{ borderBottom: `1px solid ${border}` }}>
                  <p className="text-[0.72rem] font-medium" style={{ color: '#D4A0B0' }}>{dateFormatted}</p>
                </div>
              )}

              {/* Time pill grid */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[0.72rem] font-medium" style={{ color: textMuted }}>Appointment Time</p>
                  {form.time && (
                    <span className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: dm ? '#2e2e38' : '#F7EEF2', color: '#D4A0B0' }}>
                      {form.time}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {TIMES.map(t => (
                    <button key={t} type="button"
                      onClick={() => set('time', form.time === t ? '' : t)}
                      className="py-2.5 rounded-xl text-[0.68rem] font-medium transition-all text-center touch-manipulation"
                      style={form.time === t
                        ? { background: '#111', color: '#fff', border: '1px solid #111' }
                        : { background: dm ? '#1e1e24' : '#F5F0EC', color: dm ? '#71717a' : '#888', border: `1px solid ${border}` }
                      }
                    >{t}</button>
                  ))}
                </div>
                <p className="text-[0.62rem] mt-2" style={{ color: textMuted }}>Tap to assign · tap again to clear.</p>
              </div>
            </div>

            {/* ── NOTES ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">📝</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Notes</p>
              </div>
              <div className="p-4">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  className="w-full bg-transparent outline-none resize-none leading-relaxed"
                  style={{ color: textPrimary, minHeight: 72, fontSize: '16px' }}
                  placeholder="Ready by time, makeup vision, special requests…" />
              </div>
            </div>

            {/* ── STATUS ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">🏷️</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Status</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                {STATUSES.map(s => (
                  <button key={s.value} type="button" onClick={() => set('status', s.value)}
                    className="py-2.5 rounded-xl text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all"
                    style={form.status === s.value
                      ? { background: s.color, color: '#fff', border: `1px solid ${s.color}` }
                      : { background: dm ? '#1e1e24' : '#F5F0EC', color: dm ? '#52525b' : '#bbb', border: `1px solid ${border}` }
                    }
                  >{s.label}</button>
                ))}
              </div>
            </div>

            {/* ── DEPOSIT ── */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
              style={{ background: sectionBg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-3">
                <span className="text-[0.85rem]">💸</span>
                <div>
                  <p className="text-[0.82rem] font-medium" style={{ color: textPrimary }}>Zelle Deposit Received</p>
                  <p className="text-[0.68rem]" style={{ color: textMuted }}>Toggle once deposit is confirmed</p>
                </div>
              </div>
              <button type="button" onClick={() => set('deposit_received', !form.deposit_received)}
                className="relative rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0"
                style={{ width: 48, height: 28, background: form.deposit_received ? '#22c55e' : (dm ? '#3f3f46' : '#e2e8f0') }}>
                <div className="w-5 h-5 rounded-full shadow transition-transform duration-200"
                  style={{ background: '#fff', transform: form.deposit_received ? 'translateX(22px)' : 'translateX(0px)' }} />
              </button>
            </div>

          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex gap-3 px-5 pb-8 pt-2">
            <button type="submit"
              className="flex-1 py-3.5 rounded-xl text-[0.82rem] font-semibold tracking-[0.04em] transition-all"
              style={{ background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
              Save Changes
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3.5 rounded-xl text-[0.82rem] font-medium transition-all"
              style={{ color: textMuted, border: `1px solid ${border}` }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}