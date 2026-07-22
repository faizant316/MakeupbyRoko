import { useState, useEffect } from 'react';
import { STATUS_COLORS, STATUS_COLORS_DM, STATUS_LABELS, CONSULT_INK, isBridalService } from './statusColors';
import { timeToMinutes } from './timeline';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// Just the start of a time or "9:30 AM – 1:00 PM" range, so a chip stays tidy.
const startTime = (t) => (t ? String(t).split(/[–-]/)[0].trim() : '');

// Full-screen month calendar that lists every appointment inside each day cell.
// Tap a day to expand it on its own; tap an appointment to open its client card.
export default function AllAppointmentsModal({ allBookings = [], classRegs = [], darkMode: dm, onSelect, onSelectClassReg, onClose }) {
  const [cur, setCur] = useState(() => new Date());
  const [focusDay, setFocusDay] = useState(null); // 'YYYY-MM-DD' when a single day is expanded

  // Lock the page behind the modal + Escape steps back (day view first, then out).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') { if (focusDay) setFocusDay(null); else onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose, focusDay]);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // date key -> events on that day. A booking lands on its appointment date, or
  // its consultation date when it's consult-only, so nothing is listed twice.
  const evMap = {};
  const push = (key, ev) => { if (!key) return; (evMap[key] ||= []).push(ev); };
  (allBookings || []).forEach(b => {
    const key = b.date || b.consultation_date;
    if (!key) return;
    const consultOnly = !b.date && !!b.consultation_date;
    push(key, {
      id: b.id,
      kind: consultOnly ? 'consult' : 'appt',
      name: b.name || 'Client',
      time: consultOnly ? b.consultation_time : b.time,
      detail: consultOnly ? `${b.consultation_type || 'Zoom'} consultation` : (b.service || 'Appointment'),
      status: b.status,
      bridal: isBridalService(b.service),
      source: b.source,
      onOpen: () => onSelect?.(b),
    });
  });
  (classRegs || []).forEach(r => {
    if (!r.appointment_date) return;
    push(r.appointment_date, {
      id: `class-${r.id}`,
      kind: 'class',
      name: r.full_name || 'Client',
      time: r.appointment_time,
      detail: 'Makeup Class',
      status: r.status,
      onOpen: () => onSelectClassReg?.(r),
    });
  });
  Object.values(evMap).forEach(list => list.sort((a, b) => timeToMinutes(startTime(a.time)) - timeToMinutes(startTime(b.time))));

  const dotOf = (ev) => ev.kind === 'consult'
    ? CONSULT_INK[dm ? 'dark' : 'light']
    : ev.kind === 'class'
      ? '#C76BA6'
      : (dm ? STATUS_COLORS_DM : STATUS_COLORS)[ev.status] || (dm ? '#52525b' : '#b6b6bf');

  const labelOf = (ev) => ev.kind === 'consult' ? 'Consultation'
    : ev.kind === 'class' ? 'Makeup Class'
    : STATUS_LABELS[ev.status] || (ev.status ? ev.status[0].toUpperCase() + ev.status.slice(1) : 'Appointment');

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const monthLabel = cur.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPrefix = `${year}-${pad(month + 1)}`;
  const monthCount = Object.entries(evMap)
    .filter(([k]) => k.startsWith(monthPrefix))
    .reduce((n, [, list]) => n + list.length, 0);

  const goPrev = () => setCur(new Date(year, month - 1, 1));
  const goNext = () => setCur(new Date(year, month + 1, 1));
  const goToday = () => setCur(new Date());

  const navBtn = 'w-8 h-8 rounded-lg flex items-center justify-center text-base font-medium transition-all flex-shrink-0';
  const navStyle = { background: dm ? '#2a2a31' : '#F2F2F7', color: dm ? '#a1a1aa' : '#777' };

  const LEGEND = [
    { c: STATUS_COLORS.pending, label: 'Pending' },
    { c: STATUS_COLORS.confirmed, label: 'Confirmed' },
    { c: STATUS_COLORS.completed, label: 'Completed' },
    { c: STATUS_COLORS.cancelled, label: 'Cancelled' },
    { c: CONSULT_INK.light, label: 'Consultation' },
    { c: '#C76BA6', label: 'Makeup Class' },
  ];

  // ── Expanded single day ──
  const focusEvents = focusDay ? (evMap[focusDay] || []) : [];
  const focusTitle = focusDay
    ? new Date(focusDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: dm ? '#1e1e24' : '#fff', animation: 'fadeRiseIn 0.28s cubic-bezier(0.22,1,0.36,1)' }}
      role="dialog"
      aria-label={focusDay ? focusTitle : 'All appointments'}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6"
        style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {focusDay && (
              <button
                onClick={() => setFocusDay(null)}
                aria-label="Back to month"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all active:scale-90"
                style={{ background: dm ? '#2e2e38' : '#F0F0F4' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#d4d4d8' : '#83838d'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <h2 className="font-serif text-[1.6rem] sm:text-[2rem] font-light leading-none tracking-[-0.01em]"
                style={{ color: dm ? '#e4e4e7' : '#111' }}>{focusDay ? focusTitle : 'All Appointments'}</h2>
              <p className="text-[0.74rem] mt-2" style={{ color: dm ? '#71717a' : '#a3a3ad' }}>
                {focusDay
                  ? (focusEvents.length > 0
                      ? `${focusEvents.length} ${focusEvents.length === 1 ? 'appointment' : 'appointments'} · tap one to open`
                      : 'Nothing scheduled on this day')
                  : (monthCount > 0
                      ? `${monthCount} ${monthCount === 1 ? 'item' : 'items'} in ${monthLabel} · tap a day to expand`
                      : `Nothing scheduled in ${monthLabel}`)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ background: dm ? '#2e2e38' : '#F0F0F4' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#d4d4d8' : '#83838d'} strokeWidth="2.2" strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Month nav + legend (month view only) */}
        {!focusDay && (
          <div className="flex items-center justify-between gap-3 flex-wrap pb-4">
            <div className="flex items-center gap-2">
              <button onClick={goPrev} className={navBtn} style={navStyle} aria-label="Previous month">‹</button>
              <span className="text-[0.95rem] font-semibold tracking-tight text-center min-w-[150px]" style={{ color: dm ? '#e4e4e7' : '#111' }}>{monthLabel}</span>
              <button onClick={goNext} className={navBtn} style={navStyle} aria-label="Next month">›</button>
              <button onClick={goToday}
                className="ml-1 text-[0.68rem] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                style={{ background: dm ? 'rgba(113,113,122,0.14)' : '#EFEFF6', color: dm ? '#a1a1aa' : '#52525b' }}>
                Today
              </button>
            </div>
            <div className="hidden md:flex items-center gap-3.5 flex-wrap">
              {LEGEND.map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.c }} /> {l.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Expanded day: rich agenda ── */}
      {focusDay ? (
        <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-[720px] mx-auto">
            {focusEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: dm ? '#26262e' : '#F5F5F9' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c4c4cc'} strokeWidth="1.6" className="w-6 h-6">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-[0.9rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>Nothing scheduled this day</p>
                <p className="text-[0.78rem] mt-1" style={{ color: dm ? '#71717a' : '#b6b6bf' }}>This day is wide open.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {focusEvents.map(ev => {
                  const dot = dotOf(ev);
                  const cancelled = ev.kind === 'appt' && ev.status === 'cancelled';
                  return (
                    <button
                      key={ev.id}
                      onClick={() => { ev.onOpen(); onClose(); }}
                      className="w-full flex items-center gap-3.5 text-left rounded-2xl px-4 py-3.5 transition-all"
                      style={{
                        background: dm ? '#26262e' : '#fff',
                        border: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}`,
                        boxShadow: dm ? 'none' : '0 1px 2px rgba(30,30,40,0.05), 0 2px 6px rgba(30,30,40,0.04)',
                        borderLeft: `3px solid ${dot}`,
                        opacity: cancelled ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = dm ? '#2e2e37' : '#FAFAFC'; e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'; e.currentTarget.style.borderLeftColor = dot; }}
                      onMouseLeave={e => { e.currentTarget.style.background = dm ? '#26262e' : '#fff'; e.currentTarget.style.borderColor = dm ? '#2e2e38' : '#ECEDF1'; e.currentTarget.style.borderLeftColor = dot; }}
                    >
                      <div className="w-[68px] flex-shrink-0 text-right">
                        <p className="text-[0.8rem] font-semibold tabular-nums leading-tight" style={{ color: dm ? '#e4e4e7' : '#1a1a1f' }}>{startTime(ev.time) || '—'}</p>
                      </div>
                      <div className="w-px self-stretch flex-shrink-0" style={{ background: dm ? '#34343d' : '#EDEDF2' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[0.92rem] font-semibold leading-snug" style={{ color: dm ? '#e4e4e7' : '#1a1a1a', textDecoration: cancelled ? 'line-through' : 'none' }}>{ev.name}</p>
                          {ev.bridal && (
                            <span className="text-[0.5rem] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: dm ? 'rgba(154,84,116,0.3)' : '#F0D9E3', color: dm ? '#f0d5e1' : '#7A4055' }}>Bridal</span>
                          )}
                          {ev.source === 'booksy' && (
                            <span className="text-[0.5rem] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: dm ? 'rgba(14,165,175,0.18)' : '#E0F5F6', color: dm ? '#5EEAD4' : '#0E8F98' }}>Booksy</span>
                          )}
                        </div>
                        <p className="text-[0.74rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
                          {ev.detail}{ev.time && String(ev.time).includes('–') ? ` · ${ev.time}` : ''}
                        </p>
                      </div>
                      <span className="text-[0.6rem] font-bold tracking-[0.04em] uppercase px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: `${dot}22`, color: dot }}>{labelOf(ev)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Month grid (scrolls) ── */
        <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="min-w-[720px]">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[0.62rem] font-semibold py-1 uppercase tracking-widest" style={{ color: dm ? '#71717a' : '#bbb' }}>{d}</div>
              ))}
            </div>

            {/* Day cells — tap a cell to expand the day, tap a chip to open the card */}
            <div className="grid grid-cols-7 gap-2">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} className="rounded-xl" style={{ background: dm ? 'rgba(255,255,255,0.015)' : '#FBFBFD' }} />;
                const key = `${monthPrefix}-${pad(day)}`;
                const events = evMap[key] || [];
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFocusDay(key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusDay(key); } }}
                    title="Open this day"
                    className="group rounded-xl p-1.5 flex flex-col gap-1 cursor-pointer transition-colors outline-none"
                    style={{
                      minHeight: 104,
                      background: dm ? '#26262e' : '#fff',
                      border: `1px solid ${isToday ? '#D4A0B0' : (dm ? '#2e2e38' : '#ECECF1')}`,
                      boxShadow: isToday ? '0 0 0 1px #D4A0B0' : 'none',
                    }}
                    onMouseEnter={e => { if (!isToday) e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'; }}
                    onMouseLeave={e => { if (!isToday) e.currentTarget.style.borderColor = dm ? '#2e2e38' : '#ECECF1'; }}
                  >
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[0.72rem] font-semibold tabular-nums"
                        style={{ color: isToday ? '#A0607A' : (dm ? '#a1a1aa' : '#9c9ca4') }}>{day}</span>
                      {events.length > 0 && (
                        <span className="text-[0.58rem] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
                          style={{ background: dm ? '#2e2e38' : '#F0F0F5', color: dm ? '#a1a1aa' : '#9c9ca4' }}>{events.length}</span>
                      )}
                    </div>

                    {events.map(ev => {
                      const dot = dotOf(ev);
                      const cancelled = ev.kind === 'appt' && ev.status === 'cancelled';
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); ev.onOpen(); onClose(); }}
                          className="w-full flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-md text-left transition-colors"
                          style={{
                            background: dm ? '#2e2e38' : '#F7F7FB',
                            borderLeft: `2.5px solid ${dot}`,
                            opacity: cancelled ? 0.55 : 1,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = dm ? '#3a3a44' : '#EFEFF5'}
                          onMouseLeave={e => e.currentTarget.style.background = dm ? '#2e2e38' : '#F7F7FB'}
                          title={`${ev.name}${ev.time ? ` · ${ev.time}` : ''}`}
                        >
                          {startTime(ev.time) && (
                            <span className="text-[0.62rem] font-semibold tabular-nums flex-shrink-0" style={{ color: dm ? '#8b8b95' : '#9c9ca6' }}>
                              {startTime(ev.time)}
                            </span>
                          )}
                          <span
                            className="text-[0.68rem] font-medium truncate flex-1 min-w-0"
                            style={{ color: dm ? '#e4e4e7' : '#333', textDecoration: cancelled ? 'line-through' : 'none' }}
                          >
                            {ev.name}
                            {ev.bridal && <span className="ml-1" style={{ color: '#A0607A' }} title="Bridal">·</span>}
                          </span>
                          {ev.source === 'booksy' && (
                            <span className="text-[0.5rem] font-bold tracking-[0.06em] uppercase px-1 py-px rounded flex-shrink-0"
                              style={{ background: dm ? 'rgba(14,165,175,0.18)' : '#E0F5F6', color: dm ? '#5EEAD4' : '#0E8F98' }}>B</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
