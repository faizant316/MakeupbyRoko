import { useMemo, useState } from 'react';
import { PLUM } from './classTheme';

// Calendar Wednesday picker. Any Wednesday at least two weeks out is open and
// tappable, EXCEPT ones already taken (one client per Wednesday) or blocked by
// Roko. Wednesdays inside the two-week lead window show as "too soon"; the
// client can page forward through the months to any open Wednesday they like.

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEDNESDAY = 3;

export default function ClassWednesdayPicker({ selectedDate, onSelectDate, firstOpenKey, bookedSet = new Set(), blockedSet = new Set() }) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);

  // Start on the month of the first open Wednesday.
  const firstOpen = firstOpenKey ? new Date(firstOpenKey + 'T00:00:00') : today;
  const [currentDate, setCurrentDate] = useState(new Date(firstOpen.getFullYear(), firstOpen.getMonth()));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push({ d, date: new Date(year, month, d) });
    return days;
  }, [year, month]);

  // Don't page earlier than the month that holds the first open Wednesday, and
  // keep it open ~12 months ahead.
  const firstOpenMonth = new Date(firstOpen.getFullYear(), firstOpen.getMonth());
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 12);
  const canGoPrev = new Date(year, month) > firstOpenMonth;
  const canGoNext = new Date(year, month) < maxMonth;

  const arrowStyle = { color: PLUM.grayLt };

  return (
    <div className="rounded-xl p-4" style={{ background: PLUM.tint, border: `1px solid ${PLUM.border}` }}>
      {/* Month nav */}
      <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: `1px solid ${PLUM.border}` }}>
        <button type="button" disabled={!canGoPrev}
          onClick={() => canGoPrev && setCurrentDate(new Date(year, month - 1))}
          className="w-8 h-8 flex items-center justify-center transition-colors text-xl disabled:opacity-25"
          style={arrowStyle}
          onMouseEnter={e => { if (canGoPrev) e.currentTarget.style.color = PLUM.rose; }}
          onMouseLeave={e => { e.currentTarget.style.color = PLUM.grayLt; }}>
          ‹
        </button>
        <span className="font-serif text-[1.1rem] tracking-tight" style={{ color: '#1a1015' }}>{monthName}</span>
        <button type="button" disabled={!canGoNext}
          onClick={() => canGoNext && setCurrentDate(new Date(year, month + 1))}
          className="w-8 h-8 flex items-center justify-center transition-colors text-xl disabled:opacity-25"
          style={arrowStyle}
          onMouseEnter={e => { if (canGoNext) e.currentTarget.style.color = PLUM.rose; }}
          onMouseLeave={e => { e.currentTarget.style.color = PLUM.grayLt; }}>
          ›
        </button>
      </div>

      {/* Weekday header — Wednesday called out */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
          <div key={i} className="text-[0.55rem] font-semibold uppercase py-1.5 tracking-[0.1em]"
            style={{ color: i === WEDNESDAY ? PLUM.rose : PLUM.grayLt }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
        {calDays.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="w-10 h-11" />;
          const key = dateKey(year, month, day.d);
          const isWed = day.date.getDay() === WEDNESDAY;
          const isPast = day.date <= today;
          const tooSoon = isWed && !isPast && firstOpenKey && key < firstOpenKey;
          const isBooked = isWed && !isPast && !tooSoon && bookedSet.has(key);
          const isBlocked = isWed && !isPast && !tooSoon && blockedSet.has(key);
          const isOpen = isWed && !isPast && !tooSoon && !isBooked && !isBlocked;
          const isSel = selectedDate === key;

          return (
            <button key={key} type="button"
              onClick={() => isOpen && onSelectDate(isSel ? null : key)}
              disabled={!isOpen}
              title={
                isBooked ? 'Booked — this Wednesday is taken'
                : isBlocked ? 'Unavailable'
                : tooSoon ? 'Too soon — classes book at least two weeks out'
                : isOpen ? 'Available' : undefined
              }
              className="w-10 h-11 flex flex-col items-center justify-center text-[0.9rem] transition-all relative rounded-lg"
              style={
                isSel ? { background: PLUM.ink, color: '#fff', fontWeight: 600, boxShadow: '0 6px 16px rgba(42,22,32,0.24)' }
                : isOpen ? { border: `1px solid ${PLUM.rose}66`, background: '#fff', color: '#1a1015', fontWeight: 500 }
                : isBooked ? { color: '#d99ab0', textDecoration: 'line-through', textDecorationColor: '#d99ab0', cursor: 'not-allowed' }
                : isBlocked ? { color: '#e0a0a0', textDecoration: 'line-through', textDecorationColor: '#e0a0a0', cursor: 'not-allowed' }
                : tooSoon ? { color: PLUM.grayLt, cursor: 'not-allowed' }
                : { color: '#dcd2d8', cursor: 'not-allowed' }
              }
              onMouseEnter={e => { if (isOpen && !isSel) e.currentTarget.style.background = PLUM.tint2; }}
              onMouseLeave={e => { if (isOpen && !isSel) e.currentTarget.style.background = '#fff'; }}>
              <span>{day.d}</span>
              {isOpen && !isSel && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{ background: '#5cc98f' }} />}
              {isBooked && <span className="absolute bottom-0.5 text-[0.42rem] font-bold tracking-[0.05em] uppercase" style={{ color: '#d99ab0' }}>Booked</span>}
              {tooSoon && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: PLUM.border }} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-4 pt-3" style={{ borderTop: `1px solid ${PLUM.border}` }}>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium" style={{ color: PLUM.gray }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#5cc98f' }} /> Open
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium" style={{ color: PLUM.gray }}>
          <span className="inline-block line-through leading-none" style={{ color: '#d99ab0' }}>15</span> Booked
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium" style={{ color: PLUM.gray }}>
          <span className="w-1 h-1 rounded-full inline-block" style={{ background: PLUM.border }} /> Too soon
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium" style={{ color: PLUM.gray }}>
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PLUM.ink }} /> Selected
        </span>
      </div>
    </div>
  );
}
