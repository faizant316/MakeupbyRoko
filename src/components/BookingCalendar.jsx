'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CalendarNavSelect from './CalendarNavSelect';
import { BRIDAL_LEAD_DAYS, leadDate } from '@/lib/bookingLeadTime';

// One calendar for every public booking flow.
//
// This used to be two near-identical implementations (CalDay in
// BridalInquiryForm, BookingCalDay in BookingModal) that had already drifted
// apart in small ways: blocked days showed a red dot in one and nothing in the
// other, month navigation was a month/year dropdown in one and a plain label in
// the other, and the "too soon" vs "Roko is away" precedence disagreed inside
// the 14-day lead-time window. Everything below is the merged behaviour, with
// the one REAL difference between the flows kept as a prop (see allowClosedDays).

// Days Roko normally works: Sun, Tue, Wed, Fri, Sat (closed Mon/Thu).
export const AVAILABLE_DAYS = [0, 2, 3, 5, 6];

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// How far out a flow can book is NOT a property of the calendar — bridal and
// non-bridal deliberately differ now (see src/lib/bookingLeadTime.js). Each
// flow passes its own window in; the calendar just draws what it's told.
export function getMinBookingDate(days = BRIDAL_LEAD_DAYS) {
  return leadDate(days);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Leading blanks to line the 1st up under its weekday, then one entry per day.
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push({ d, date: new Date(year, month, d) });
  return days;
}

// The single source of truth for what one day means. Every visual decision (text
// colour, dot colour, whether the button is disabled) and the month summary
// counts read from this, so a cell can never disagree with the tally above it.
function dayState({ day, year, month, minDate, blockedSet, bookedDateMap, maxPerDay, allowClosedDays }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const key = dateKey(year, month, day.d);

  // Lead time is checked FIRST and wins over everything else: a date you cannot
  // book yet should read as simply not-yet-available, not as "Roko is away".
  const isTooSoon = day.date < minDate; // also covers every past date
  const isOpenWeekday = AVAILABLE_DAYS.includes(day.date.getDay());
  const isBlocked = !isTooSoon && !!blockedSet?.has(key);
  const count = bookedDateMap?.[key] || 0;
  const isFull = !isTooSoon && count >= maxPerDay;
  const isPartial = !isTooSoon && count > 0 && !isFull;
  const isToday = day.date.getTime() === today.getTime();

  // The one genuine difference between the flows. A wedding is a wedding, so
  // bridal can land on any weekday including the ones the studio is normally
  // closed; every other service is limited to Roko's regular open days.
  const closedWeekday = !allowClosedDays && !isOpenWeekday;
  const disabled = isTooSoon || closedWeekday || isBlocked || isFull;

  // Green means "genuinely open". Note this still requires a regular open day
  // even in bridal: a bride CAN pick a Monday, but Roko doesn't advertise it as
  // an open slot, so it stays undotted rather than green.
  const isOpen = !disabled && !isPartial && isOpenWeekday;

  return { key, isTooSoon, closedWeekday, isBlocked, isFull, isPartial, isToday, disabled, isOpen };
}

function CalDay({ state, day, selectedDate, onPick }) {
  const { key, isTooSoon, closedWeekday, isBlocked, isFull, isPartial, isToday, disabled, isOpen } = state;
  const isSel = selectedDate === key;

  const tone =
    isTooSoon || closedWeekday ? 'text-gray-200 cursor-not-allowed'
    : isBlocked ? 'text-red-300 cursor-not-allowed line-through decoration-red-300'
    : isFull ? 'text-red-300 cursor-not-allowed'
    : isSel ? 'bg-[#111] text-white font-semibold rounded-sm'
    : isToday ? 'text-[#D4A0B0] font-bold cursor-pointer'
    : isPartial ? 'text-[#555] font-medium hover:text-[#111] cursor-pointer'
    : 'text-[#888] hover:text-[#111] cursor-pointer';

  return (
    <button
      type="button"
      onClick={() => onPick(day)}
      disabled={disabled}
      title={
        isBlocked ? 'Roko is away this day'
        : isFull ? 'Fully booked'
        : closedWeekday ? 'Roko is closed this day'
        : undefined
      }
      className={`w-full aspect-square max-w-[2.75rem] sm:max-w-[3.15rem] flex flex-col items-center justify-center text-[0.875rem] sm:text-[1rem] transition-all relative rounded-none touch-manipulation ${tone}`}
    >
      <span>{day.d}</span>
      {/* Red = "she can't take this date". Deliberately NOT shown on a weekday
          the studio is simply closed: that day is greyed out for a structural
          reason, and a red away-dot on top of it reads as a second, alarming
          problem. (In bridal, closedWeekday is never true, so a blocked Monday
          there still gets its dot — Mondays are bookable for weddings.) */}
      {!isSel && !isTooSoon && !closedWeekday && (isBlocked || isFull) && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-300" />
      )}
      {!isSel && !disabled && isPartial && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#F0C27A]" />
      )}
      {!isSel && isOpen && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}

/**
 * @param {Date}     value          the month currently shown (day component ignored)
 * @param {Function} onMonthChange  (Date) => void
 * @param {string?}  selectedDate   'YYYY-MM-DD' or null
 * @param {Function} onSelectDate   (key) => void, called only for pickable days
 * @param {boolean}  allowClosedDays  bridal: Mon/Thu are pickable
 * @param {boolean}  focused        mobile focus mode is on (parent hides its own blocks)
 */
export default function BookingCalendar({
  value,
  onMonthChange,
  minDate,
  selectedDate,
  onSelectDate,
  blockedSet,
  bookedDateMap,
  getMaxForDay,
  allowClosedDays = false,
  unavailableLabel = 'Unavailable',
  helperText = null,
  focused = false,
  onToggleFocus = null,
}) {
  const year = value.getFullYear();
  const month = value.getMonth();

  // 'forward' | 'back' — which way the month grid should slide in.
  const [slideDir, setSlideDir] = useState('forward');
  const gridRef = useRef(null);

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const states = useMemo(() => {
    const out = new Map();
    days.forEach(day => {
      if (!day) return;
      const key = dateKey(year, month, day.d);
      out.set(key, dayState({
        day, year, month, minDate, blockedSet, bookedDateMap,
        maxPerDay: getMaxForDay(key), allowClosedDays,
      }));
    });
    return out;
  }, [days, year, month, minDate, blockedSet, bookedDateMap, getMaxForDay, allowClosedDays]);

  // Month tally. Counts only Roko's regular open days, matching the dots.
  const summary = useMemo(() => {
    let open = 0, filling = 0, full = 0;
    days.forEach(day => {
      if (!day) return;
      const s = states.get(dateKey(year, month, day.d));
      if (!s || s.isTooSoon || !AVAILABLE_DAYS.includes(day.date.getDay()) || s.isBlocked) return;
      if (s.isFull) full++;
      else if (s.isPartial) filling++;
      else open++;
    });
    return { open, filling, full };
  }, [days, states, year, month]);

  // Never navigate earlier than the first month that holds a bookable date —
  // there is nothing to see there, every day is greyed out.
  const floor = useMemo(
    () => ({ y: minDate.getFullYear(), m: minDate.getMonth() }),
    [minDate],
  );
  const canGoPrev = year > floor.y || (year === floor.y && month > floor.m);

  const goToMonth = useCallback((y, m) => {
    // Normalise (month -1 / 12 roll over the year) then clamp to the floor.
    const target = new Date(y, m);
    const clamped = (target.getFullYear() < floor.y || (target.getFullYear() === floor.y && target.getMonth() < floor.m))
      ? new Date(floor.y, floor.m)
      : target;
    const isForward = clamped.getFullYear() > year || (clamped.getFullYear() === year && clamped.getMonth() > month);
    if (clamped.getFullYear() === year && clamped.getMonth() === month) return;
    setSlideDir(isForward ? 'forward' : 'back');
    onMonthChange(clamped);
  }, [floor, year, month, onMonthChange]);

  const prevMonth = useCallback(() => goToMonth(year, month - 1), [goToMonth, year, month]);
  const nextMonth = useCallback(() => goToMonth(year, month + 1), [goToMonth, year, month]);

  // ── Swipe between months ──────────────────────────────────────────────────
  // Attached natively (not via React's onTouchMove) because React registers
  // touchmove as a PASSIVE listener on its root, and a passive listener cannot
  // preventDefault. Without that call, a horizontal drag would scroll the sheet
  // vertically at the same time as changing the month.
  //
  // The axis is locked once, on the first ~8px of movement, and horizontal has
  // to beat vertical by 1.4x to win. That bias matters: this grid lives in a
  // tall scrolling sheet, and a slightly-diagonal flick should still scroll the
  // page rather than silently jumping the month.
  //
  // The handlers read the current month navigation through a ref and the effect
  // runs ONCE. Depending on the callbacks directly would tear the listeners down
  // and rebuild them on every re-render, and a re-render landing mid-gesture
  // (a capacity query resolving, say) would drop the in-progress touch on the
  // floor and silently swallow the swipe.
  const navRef = useRef(null);
  navRef.current = { next: nextMonth, prev: prevMonth, canPrev: canGoPrev };

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let touch = null;

    const onStart = (e) => {
      if (e.touches.length !== 1) { touch = null; return; }
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
    };

    const onMove = (e) => {
      if (!touch || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touch.x;
      const dy = e.touches[0].clientY - touch.y;
      if (touch.axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        touch.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
      }
      if (touch.axis === 'x' && e.cancelable) e.preventDefault();
    };

    const onEnd = (e) => {
      const t = touch;
      touch = null;
      if (!t || t.axis !== 'x') return;
      const dx = e.changedTouches[0].clientX - t.x;
      if (Math.abs(dx) < 45) return; // too small to be deliberate
      const nav = navRef.current;
      if (dx < 0) nav.next();
      else if (nav.canPrev) nav.prev();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = useCallback((day) => {
    if (!day) return;
    const key = dateKey(year, month, day.d);
    const s = states.get(key);
    if (!s || s.disabled) return;
    onSelectDate(selectedDate === key ? null : key); // tap again to clear
  }, [year, month, states, selectedDate, onSelectDate]);

  return (
    <div className="relative z-10">
      {/* Month nav */}
      <div className="flex items-center gap-1 pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className={`w-9 h-9 flex items-center justify-center transition-colors text-xl flex-shrink-0 ${
            canGoPrev ? 'text-gray-300 hover:text-[#D4A0B0]' : 'text-gray-100 cursor-not-allowed'
          }`}
        >
          ‹
        </button>

        <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
          <CalendarNavSelect
            ariaLabel="Month"
            align="right"
            value={month}
            onChange={v => goToMonth(year, Number(v))}
            options={MONTHS.map((m, i) => ({ value: i, label: m }))}
          />
          <CalendarNavSelect
            ariaLabel="Year"
            align="left"
            menuMinWidth={120}
            value={year}
            onChange={v => goToMonth(Number(v), month)}
            options={Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map(y => ({ value: y, label: String(y) }))}
          />
        </div>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl flex-shrink-0"
        >
          ›
        </button>

        {/* Focus mode — mobile only. Everything around the calendar folds away so
            the grid and its CTA are the only things on screen. */}
        {onToggleFocus && (
          <button
            type="button"
            onClick={onToggleFocus}
            aria-pressed={focused}
            aria-label={focused ? 'Show full booking details' : 'Focus on the calendar'}
            title={focused ? 'Show full booking details' : 'Focus on the calendar'}
            className="sm:hidden w-9 h-9 -mr-1 flex items-center justify-center rounded-lg text-[#c9a4b2] hover:text-[#D4A0B0] active:scale-90 transition-all flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              {focused
                ? <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m8 0v-3a2 2 0 0 1 2-2h3" />
                : <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />}
            </svg>
          </button>
        )}
      </div>

      {/* Month availability summary */}
      {(summary.open + summary.filling + summary.full > 0) && (
        <div className="flex items-center gap-2 flex-wrap mt-3 mb-2">
          {summary.open > 0 && (
            <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{summary.open} open
            </span>
          )}
          {summary.filling > 0 && (
            <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,194,122,0.15)', color: '#92400e' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A] inline-block" />{summary.filling} filling
            </span>
          )}
          {summary.full > 0 && (
            <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#b91c1c' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />{summary.full} full
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mt-4 mb-3">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-[0.6rem] sm:text-[0.68rem] font-semibold text-gray-400 uppercase py-2 tracking-[0.08em]">{d}</div>
        ))}
      </div>

      {/* touchAction pan-y tells the browser this area scrolls vertically only,
          so a horizontal drag is ours to interpret. */}
      <div ref={gridRef} style={{ touchAction: 'pan-y' }}>
        <div
          key={`${year}-${month}`}
          style={{ animation: `${slideDir === 'back' ? 'stepInLeft' : 'stepInRight'} 0.28s cubic-bezier(0.22, 1, 0.36, 1)` }}
          className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center justify-items-center"
        >
          {days.map((day, idx) => !day
            ? <div key={`e-${idx}`} className="w-11 h-11 sm:w-[3.15rem] sm:h-[3.15rem]" />
            : (
              <CalDay
                key={dateKey(year, month, day.d)}
                day={day}
                state={states.get(dateKey(year, month, day.d))}
                selectedDate={selectedDate}
                onPick={handlePick}
              />
            )
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Open
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A] inline-block" /> Filling
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" /> {unavailableLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
          <span className="w-3.5 h-3.5 rounded-sm bg-[#111] inline-block" /> Selected
        </span>
      </div>

      {helperText && (
        <p className="text-center text-[0.66rem] text-gray-400 mt-3 leading-[1.6]">{helperText}</p>
      )}

      {/* Swipe affordance — mobile only, and only where swiping is the fastest
          way to move. Static rather than animated: it's a label, not a nudge. */}
      <p className="sm:hidden text-center text-[0.6rem] text-gray-300 mt-2 tracking-[0.04em]">
        Swipe the calendar to change months
      </p>
    </div>
  );
}
