import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEDNESDAY = 3;

// Wednesday-only month calendar for the class checkout. Same look as the main
// booking calendar (BookingModal), but only Wednesdays are selectable since
// classes run Wednesdays. Roko can still close a specific Wednesday via the
// blocked_dates list.
export default function ClassWednesdayCalendar({ selectedDate, onSelectDate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Start the calendar on the month of the next upcoming Wednesday.
  const firstWed = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() + ((WEDNESDAY - d.getDay() + 7) % 7));
    return d;
  })();
  const [currentDate, setCurrentDate] = useState(new Date(firstWed.getFullYear(), firstWed.getMonth()));
  const [calDays, setCalDays] = useState([]);

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    initialData: [],
  });
  const blockedSet = new Set(blockedDates.map(b => b.date));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push({ d, date: new Date(year, month, d) });
    setCalDays(days);
  }, [year, month]);

  const handleClick = (day) => {
    if (!day) return;
    const key = dateKey(year, month, day.d);
    const isWed = day.date.getDay() === WEDNESDAY;
    const isPast = day.date < today;
    if (!isWed || isPast || blockedSet.has(key)) return;
    onSelectDate(selectedDate === key ? null : key);
  };

  // Don't let them page before the current month.
  const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());

  return (
    <div>
      {/* Month nav */}
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
        <button type="button" disabled={!canGoPrev}
          onClick={() => canGoPrev && setCurrentDate(new Date(year, month - 1))}
          className="w-8 h-8 flex items-center justify-center transition-colors text-xl disabled:opacity-25"
          style={{ color: '#c9c1bb' }}
          onMouseEnter={e => { if (canGoPrev) e.currentTarget.style.color = '#D4A0B0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#c9c1bb'; }}>
          ‹
        </button>
        <span className="font-serif text-[1.15rem] text-[#111] tracking-tight">{monthName}</span>
        <button type="button"
          onClick={() => setCurrentDate(new Date(year, month + 1))}
          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
          <div key={i} className="text-[0.55rem] font-semibold text-gray-300 uppercase py-1.5 tracking-[0.1em]">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
        {calDays.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="w-10 h-10" />;
          const key = dateKey(year, month, day.d);
          const isWed = day.date.getDay() === WEDNESDAY;
          const isPast = day.date < today;
          const isBlocked = blockedSet.has(key);
          const isAvail = isWed && !isPast && !isBlocked;
          const isSel = selectedDate === key;
          return (
            <button key={key} type="button"
              onClick={() => handleClick(day)}
              disabled={!isAvail}
              title={isWed ? (isBlocked ? 'Unavailable' : isPast ? 'Past' : undefined) : 'Classes are Wednesdays only'}
              className={`w-10 h-10 flex flex-col items-center justify-center text-[0.9rem] transition-all relative rounded-md ${
                isBlocked && isWed
                  ? 'text-red-300 cursor-not-allowed line-through decoration-red-300'
                  : !isAvail
                  ? 'text-gray-200 cursor-not-allowed'
                  : isSel
                  ? 'bg-[#111] text-white font-semibold'
                  : 'text-[#555] hover:bg-[#F7EEF2] hover:text-[#111]'
              }`}>
              <span>{day.d}</span>
              {isAvail && !isSel && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Wednesdays open
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-[#111] inline-block" /> Selected
        </span>
      </div>
    </div>
  );
}
