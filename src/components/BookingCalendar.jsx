'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

// The swipe track holds three months side by side (previous · current · next)
// and is three viewports wide, so "one viewport" is 33.3333% of the track.
// Resting position shows the middle panel.
const BASE_X = 'translate3d(-33.3333%,0,0)';
const PREV_X = 'translate3d(0%,0,0)';
const NEXT_X = 'translate3d(-66.6667%,0,0)';
// Short and hard-eased-out, so a released swipe lands rather than glides. New
// touches are ignored for its duration (see onStart), which is why it stays well
// under 300ms — long enough to read as motion, short enough that a second swipe
// never feels dropped.
const SETTLE = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)';

// useLayoutEffect is the right hook for "fix the transform before the browser
// paints", but React warns about it during SSR. Same hook, no warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

  const viewportRef = useRef(null);
  const trackRef = useRef(null);

  // Previous · current · next, all built up front so a swipe reveals a real
  // month under the finger rather than empty space.
  const panels = useMemo(() => {
    const built = [-1, 0, 1].map(off => {
      const d = new Date(year, month + off, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const days = buildMonthGrid(y, m);
      const states = new Map();
      days.forEach(day => {
        if (!day) return;
        const key = dateKey(y, m, day.d);
        states.set(key, dayState({
          day, year: y, month: m, minDate, blockedSet, bookedDateMap,
          maxPerDay: getMaxForDay(key), allowClosedDays,
        }));
      });
      return { y, m, key: `${y}-${m}`, days, states };
    });

    // Pad all three to the same row count. Months are 5 or 6 rows deep, and a
    // track whose panels disagree would grow and shrink under the finger
    // mid-swipe. Padding only to the tallest of the three (rather than always
    // six) keeps the common 5-row case from carrying a permanent empty row.
    const rows = Math.max(...built.map(p => Math.ceil(p.days.length / 7)));
    built.forEach(p => { while (p.days.length < rows * 7) p.days.push(null); });
    return built;
  }, [year, month, minDate, blockedSet, bookedDateMap, getMaxForDay, allowClosedDays]);

  const current = panels[1];

  // Month tally. Counts only Roko's regular open days, matching the dots.
  const summary = useMemo(() => {
    let open = 0, filling = 0, full = 0;
    current.days.forEach(day => {
      if (!day) return;
      const s = current.states.get(dateKey(current.y, current.m, day.d));
      if (!s || s.isTooSoon || !AVAILABLE_DAYS.includes(day.date.getDay()) || s.isBlocked) return;
      if (s.isFull) full++;
      else if (s.isPartial) filling++;
      else open++;
    });
    return { open, filling, full };
  }, [current]);

  // Never navigate earlier than the first month that holds a bookable date —
  // there is nothing to see there, every day is greyed out.
  const floor = useMemo(
    () => ({ y: minDate.getFullYear(), m: minDate.getMonth() }),
    [minDate],
  );
  const canGoPrev = year > floor.y || (year === floor.y && month > floor.m);

  // Direct jump, no track animation. Used by the month/year dropdowns, which can
  // land any distance away — there is no meaningful slide between June and next
  // March, so those swap instantly.
  const goToMonth = useCallback((y, m) => {
    const target = new Date(y, m);
    const clamped = (target.getFullYear() < floor.y || (target.getFullYear() === floor.y && target.getMonth() < floor.m))
      ? new Date(floor.y, floor.m)
      : target;
    if (clamped.getFullYear() === year && clamped.getMonth() === month) return;
    onMonthChange(clamped);
  }, [floor, year, month, onMonthChange]);

  // ── Swipe / step animation ────────────────────────────────────────────────
  // The track is moved directly on the DOM node, never through React state: a
  // setState per touchmove would re-render 30-odd day buttons on every frame of
  // the drag, which is exactly what made the old threshold-based swipe feel
  // stiff. React only hears about it once, when the month actually changes.
  //
  // A commit is two beats: animate the track to the neighbour panel, then (once
  // that lands) tell the parent about the new month and snap the track back to
  // centre in the same layout pass. The panel under the finger and the panel
  // that ends up centred hold identical content, so the snap is invisible.
  const commitRef = useRef(null);   // 'next' | 'prev' while an animation is in flight
  const fallbackRef = useRef(null);
  const commitFnRef = useRef(() => {});

  // Reassigned every render so the timer/transition callbacks always commit from
  // the month that is current NOW, not the one captured when the drag started.
  commitFnRef.current = () => {
    const dir = commitRef.current;
    if (!dir) return;
    clearTimeout(fallbackRef.current);
    onMonthChange(new Date(year, month + (dir === 'next' ? 1 : -1)));
  };

  const settle = useCallback((dir) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animation = 'none';   // cancel the first-run nudge if it's mid-flight
    track.style.transition = SETTLE;
    if (!dir) { track.style.transform = BASE_X; return; }
    commitRef.current = dir;
    track.style.transform = dir === 'next' ? NEXT_X : PREV_X;
    // Belt and braces: if transitionend never arrives (element hidden mid-swipe,
    // reduced-motion killing the transition) the calendar would otherwise jam
    // with commitRef stuck set and every further gesture ignored.
    clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => commitFnRef.current(), 460);
  }, []);

  const handleTrackTransitionEnd = (e) => {
    if (e.target !== trackRef.current || e.propertyName !== 'transform') return;
    commitFnRef.current();
  };

  // Runs before paint, so the track is already back at centre by the time the
  // new month's panels are drawn — no flash of the wrong month.
  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !commitRef.current) return;
    commitRef.current = null;
    track.style.transition = 'none';
    track.style.transform = BASE_X;
  }, [year, month]);

  useEffect(() => () => clearTimeout(fallbackRef.current), []);

  const stepMonth = useCallback((dir) => {
    if (commitRef.current) return;
    if (dir === 'prev' && !canGoPrev) return;
    settle(dir);
  }, [canGoPrev, settle]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  // Attached natively (not via React's onTouchMove) because React registers
  // touchmove as a PASSIVE listener on its root, and a passive listener cannot
  // preventDefault. Without that call, a horizontal drag would scroll the sheet
  // vertically at the same time as dragging the month.
  //
  // The axis is locked once, within the first ~6px, and horizontal has to beat
  // vertical by 1.2x to win. That bias matters: this grid lives in a tall
  // scrolling sheet, and a slightly-diagonal flick should still scroll the page.
  //
  // Handlers read live values through refs and the effect runs ONCE. Depending
  // on the callbacks directly would tear the listeners down and rebuild them on
  // every re-render, and a re-render landing mid-gesture (a capacity query
  // resolving, say) would drop the in-progress touch on the floor.
  const liveRef = useRef({ canPrev: true });
  liveRef.current.canPrev = canGoPrev;

  useEffect(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    let drag = null;

    const onStart = (e) => {
      if (commitRef.current) return;          // still landing the last swipe
      if (e.touches.length !== 1) { drag = null; return; }
      track.style.animation = 'none';
      track.style.transition = 'none';        // from here the track tracks the thumb 1:1
      const t = e.touches[0];
      drag = { x0: t.clientX, y0: t.clientY, axis: null, dx: 0, lastX: t.clientX, lastT: e.timeStamp, v: 0 };
    };

    const onMove = (e) => {
      if (!drag || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.x0;
      const dy = t.clientY - drag.y0;

      if (drag.axis === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        drag.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      }
      if (drag.axis !== 'x') return;
      if (e.cancelable) e.preventDefault();

      const w = vp.offsetWidth || 1;
      // Dragging back past the earliest bookable month has nothing real behind
      // it, so it rubber-bands instead of revealing a month of dead dates.
      let shift = dx > 0 && !liveRef.current.canPrev ? dx * 0.22 : dx;
      shift = Math.max(-w, Math.min(w, shift));
      drag.dx = shift;

      const dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = (t.clientX - drag.lastX) / dt;
      drag.lastX = t.clientX;
      drag.lastT = e.timeStamp;

      track.style.transform = `translate3d(calc(-33.3333% + ${shift}px),0,0)`;
    };

    const onEnd = () => {
      const d = drag;
      drag = null;
      if (!d || d.axis !== 'x') return;
      const w = vp.offsetWidth || 1;
      // Either drag it a fifth of the way across, or flick it. The flick path is
      // what makes a short, fast swipe work the way a phone user expects.
      const far = Math.abs(d.dx) > w * 0.2;
      const flick = Math.abs(d.v) > 0.35 && Math.abs(d.dx) > 18;
      if (!far && !flick) { settle(null); return; }
      if (d.dx < 0) settle('next');
      else if (liveRef.current.canPrev) settle('prev');
      else settle(null);
    };

    vp.addEventListener('touchstart', onStart, { passive: true });
    vp.addEventListener('touchmove', onMove, { passive: false });
    vp.addEventListener('touchend', onEnd, { passive: true });
    vp.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      vp.removeEventListener('touchstart', onStart);
      vp.removeEventListener('touchmove', onMove);
      vp.removeEventListener('touchend', onEnd);
      vp.removeEventListener('touchcancel', onEnd);
    };
  }, [settle]);

  // One-time nudge on phones: the grid slides a little and comes back, which
  // says "this moves" faster than any label can. Only on a coarse pointer, only
  // once per mount, and never when the visitor has asked for less motion.
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const on = setTimeout(() => setNudge(true), 600);
    const off = setTimeout(() => setNudge(false), 2400);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, []);

  const pick = useCallback((panel, day) => {
    const key = dateKey(panel.y, panel.m, day.d);
    const s = panel.states.get(key);
    if (!s || s.disabled) return;
    onSelectDate(selectedDate === key ? null : key); // tap again to clear
  }, [selectedDate, onSelectDate]);

  return (
    <div className="relative z-10">
      {/* Month nav.
          The ‹ › steppers are DESKTOP ONLY. On a phone this strip was carrying
          six separate chevrons within about 40px of each other, which is what
          made the calendar read as busy; phones swipe instead. */}
      <div className="flex items-center gap-1 pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => stepMonth('prev')}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className={`hidden sm:flex w-9 h-9 items-center justify-center transition-colors text-xl flex-shrink-0 ${
            canGoPrev ? 'text-gray-300 hover:text-[#D4A0B0]' : 'text-gray-100 cursor-not-allowed'
          }`}
        >
          ‹
        </button>

        {/* Month + year read as one control: only the year carries the chevron,
            so the pair says "tap me" once instead of twice. */}
        <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
          <CalendarNavSelect
            ariaLabel="Month"
            align="right"
            hideChevron
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
          onClick={() => stepMonth('next')}
          aria-label="Next month"
          className="hidden sm:flex w-9 h-9 items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl flex-shrink-0"
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

      {/* Swipe cue — mobile only, sitting directly on top of the grid it
          describes. The old version was 0.58rem grey text tucked at the end of a
          row and nobody saw it; this one is centred, in the accent colour, and
          its chevrons drift outward so it reads as a gesture rather than a
          caption. Pairs with the one-time nudge of the grid itself. */}
      <div className="sm:hidden flex items-center justify-center gap-2 mt-3 mb-0.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="cal-cue-l w-3 h-3 text-[#D4A0B0]">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#c9a4b2]">Swipe to change month</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="cal-cue-r w-3 h-3 text-[#D4A0B0]">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mt-3 mb-3">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-[0.6rem] sm:text-[0.68rem] font-semibold text-gray-400 uppercase py-2 tracking-[0.08em]">{d}</div>
        ))}
      </div>

      {/* touchAction pan-y tells the browser this area scrolls vertically only,
          so a horizontal drag is ours to interpret. */}
      <div ref={viewportRef} className="overflow-hidden" style={{ touchAction: 'pan-y' }}>
        <div
          ref={trackRef}
          onTransitionEnd={handleTrackTransitionEnd}
          className="flex"
          style={{
            width: '300%',
            transform: BASE_X,
            willChange: 'transform',
            animation: nudge ? 'calSwipeNudge 1.25s cubic-bezier(0.4,0,0.2,1) 1' : undefined,
          }}
        >
          {panels.map((p, i) => (
            // Only the centred month is tappable. The neighbours are off-screen
            // except mid-drag, where a stray tap would otherwise select a date in
            // a month the visitor isn't actually looking at.
            <div key={p.key} className="w-1/3 flex-shrink-0" style={{ pointerEvents: i === 1 ? 'auto' : 'none' }}>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center justify-items-center">
                {p.days.map((day, idx) => !day
                  ? <div key={`e-${idx}`} className="w-11 h-11 sm:w-[3.15rem] sm:h-[3.15rem]" />
                  : (
                    <CalDay
                      key={dateKey(p.y, p.m, day.d)}
                      day={day}
                      state={p.states.get(dateKey(p.y, p.m, day.d))}
                      selectedDate={selectedDate}
                      onPick={(d) => pick(p, d)}
                    />
                  )
                )}
              </div>
            </div>
          ))}
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
    </div>
  );
}
