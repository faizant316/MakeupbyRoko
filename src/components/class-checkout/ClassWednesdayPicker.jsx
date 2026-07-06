import { useMemo, useState } from 'react';

// Calendar-style Wednesday picker for the class flow. Looks like the main
// booking calendar, but only the next 2 OPEN Wednesdays are tappable (one
// client per Wednesday, so booked/blocked dates are crossed out and later
// Wednesdays show as "opens later").

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEDNESDAY = 3;

export default function ClassWednesdayPicker({ selectedDate, onSelectDate, openDates = [], bookedSet = new Set(), blockedSet = new Set() }) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const openSet = useMemo(() => new Set(openDates), [openDates]);

  // Start the calendar on the month of the first open Wednesday.
  const firstOpen = openDates[0] ? new Date(openDates[0] + 'T00:00:00') : today;
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

  // Keep nav inside a small window: current month through 2 months ahead.
  const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 2);
  const canGoNext = new Date(year, month) < maxMonth;

  return (
    <div className="rounded-xl border border-[#ede8e4] p-4" style={{ background: '#FAFAF9' }}>
      {/* Month nav */}
      <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #ede8e4' }}>
        <button type="button" disabled={!canGoPrev}
          onClick={() => canGoPrev && setCurrentDate(new Date(year, month - 1))}
          className="w-8 h-8 flex items-center justify-center transition-colors text-xl disabled:opacity-25"
          style={{ color: '#c9c1bb' }}
          onMouseEnter={e => { if (canGoPrev) e.currentTarget.style.color = '#D4A0B0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#c9c1bb'; }}>
          ‹
        </button>
        <span className="font-serif text-[1.1rem] text-[#111] tracking-tight">{monthName}</span>
        <button type="button" disabled={!canGoNext}
          onClick={() => canGoNext && setCurrentDate(new Date(year, month + 1))}
          className="w-8 h-8 flex items-center justify-center transition-colors text-xl disabled:opacity-25"
          style={{ color: '#c9c1bb' }}
          onMouseEnter={e => { if (canGoNext) e.currentTarget.style.color = '#D4A0B0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#c9c1bb'; }}>
          ›
        </button>
      </div>

      {/* Weekday header — Wednesday called out */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
          <div key={i} className="text-[0.55rem] font-semibold uppercase py-1.5 tracking-[0.1em]"
            style={{ color: i === WEDNESDAY ? '#C4849A' : '#d5cdc6' }}>
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
          const isOpen = openSet.has(key);
          const isBooked = isWed && !isPast && bookedSet.has(key);
          const isBlocked = isWed && !isPast && blockedSet.has(key);
          const isLater = isWed && !isPast && !isOpen && !isBooked && !isBlocked;
          const isSel = selectedDate === key;

          return (
            <button key={key} type="button"
              onClick={() => isOpen && onSelectDate(isSel ? null : key)}
              disabled={!isOpen}
              title={isBooked ? 'Booked — this Wednesday is taken' : isBlocked ? 'Unavailable' : isLater ? 'Opens once the earlier Wednesdays fill' : isWed && !isPast ? 'Available' : undefined}
              className={`w-10 h-11 flex flex-col items-center justify-center text-[0.9rem] transition-all relative rounded-lg ${
                isSel ? 'bg-[#111] text-white font-semibold shadow-lg'
                : isOpen ? 'text-[#111] font-medium hover:bg-[#F7EEF2]'
                : isBooked ? 'text-[#d99a9a] cursor-not-allowed line-through decoration-[#d99a9a]'
                : isBlocked ? 'text-red-300 cursor-not-allowed line-through decoration-red-300'
                : isLater ? 'text-[#cfc5bd] cursor-not-allowed'
                : 'text-gray-200 cursor-not-allowed'
              }`}
              style={isOpen && !isSel ? { border: '1px solid rgba(212,160,176,0.5)', background: '#fff' } : undefined}>
              <span>{day.d}</span>
              {isOpen && !isSel && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              {isBooked && <span className="absolute bottom-0.5 text-[0.42rem] font-bold tracking-[0.05em] uppercase" style={{ color: '#d99a9a', textDecoration: 'none' }}>Booked</span>}
              {isLater && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: '#e0d8d0' }} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-4 pt-3" style={{ borderTop: '1px solid #ede8e4' }}>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Open
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="inline-block text-[#d99a9a] line-through leading-none">15</span> Booked
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-1 h-1 rounded-full inline-block" style={{ background: '#e0d8d0' }} /> Opens later
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-[#111] inline-block" /> Selected
        </span>
      </div>
    </div>
  );
}
