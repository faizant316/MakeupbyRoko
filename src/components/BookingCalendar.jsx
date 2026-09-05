'use client';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BRIDAL_LEAD_DAYS, leadDate } from '@/lib/bookingLeadTime';
import { studioToday } from '@/lib/studio';

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
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// One-time mount assemble (see .cal-head-in / calCellIn in index.css).
// Cells step 9ms apart but the total is capped, so a 6-row month doesn't take
// noticeably longer to build than a 5-row one.
const CELL_STEP_MS = 9;
const ASSEMBLE_CELLS_MS = 340;
// Every public use of this calendar sits inside a sheet that slides up for
// 0.42s, and the assemble used to start in the same frame as that slide. Two
// dozen cells all promoting their own compositor layer while a full-screen sheet
// is mid-animation is what made the calendar arrive in a stutter. Holding the
// grid back until the sheet has all but landed (its ease-out covers most of the
// distance in the first ~170ms) gives each animation the frame to itself, and
// reads as the calendar assembling once the sheet settles rather than fighting
// it on the way in.
const ASSEMBLE_START_MS = 220;
// Long enough to cover the last cell's delay plus its own 320ms, after which the
// inline animation is dropped from every cell for good.
const ASSEMBLE_MS = ASSEMBLE_START_MS + ASSEMBLE_CELLS_MS + 420;

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
// `today` is passed in rather than read here: studioToday() runs an
// Intl.DateTimeFormat and two Date constructions, and this function is called
// once per cell across three months. One call per grid build is plenty.
function dayState({ day, year, month, today, minDate, blockedSet, bookedDateMap, maxPerDay, allowClosedDays }) {
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

// `enterDelay` is a millisecond offset for the one-time mount assemble, or null
// once it has played (see ASSEMBLE_MS in BookingCalendar). Null means no inline
// animation at all, so nothing lingers on the cell during a swipe.
//
// memo'd, and deliberately given only props that hold their identity: the
// pre-built `state` object, the `day`, a plain `isSel` boolean, and a `onPick`
// that never changes. Three months of cells live in the swipe track at once, so
// without this every month step re-rendered ~126 buttons in the same frame that
// the track snapped back to centre — a heavy frame landing exactly as the swipe
// finished, which is what you felt as the swipe not quite settling cleanly.
// Passing `isSel` rather than the whole selectedDate string matters for the same
// reason: picking a date now re-renders the two cells that changed, not all of
// them.
const CalDay = memo(function CalDay({ state, day, panelKey, isSel, onPick, enterDelay = null }) {
  const { isTooSoon, closedWeekday, isBlocked, isFull, isPartial, isToday, disabled, isOpen } = state;
  const assembling = enterDelay !== null;
  // Dots land after the grid has finished settling, so availability reads as a
  // second beat rather than arriving with the numbers.
  const dotStyle = assembling
    ? { animation: `calDotIn 0.26s var(--ease) ${ASSEMBLE_START_MS + ASSEMBLE_CELLS_MS + 40}ms both` }
    : undefined;

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
      onClick={() => onPick(panelKey, day)}
      disabled={disabled}
      title={
        isBlocked ? 'Roko is away this day'
        : isFull ? 'Fully booked'
        : closedWeekday ? 'Roko is closed this day'
        : undefined
      }
      // transition-colors, NOT transition-all: three months of cells live in the
      // swipe track at once, and `all` puts every one of them on the animation
      // path for any style change — including the track's own transform, which
      // is what made the drag stutter. Colour is the only thing that ever
      // transitions here anyway.
      className={`w-full aspect-square max-w-[2.75rem] sm:max-w-[3.15rem] flex flex-col items-center justify-center text-[0.875rem] sm:text-[1rem] transition-colors relative rounded-none touch-manipulation ${tone}`}
      style={assembling ? { animation: `calCellIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) ${enterDelay}ms both` } : undefined}
    >
      <span>{day.d}</span>
      {/* Red = "she can't take this date". Deliberately NOT shown on a weekday
          the studio is simply closed: that day is greyed out for a structural
          reason, and a red away-dot on top of it reads as a second, alarming
          problem. (In bridal, closedWeekday is never true, so a blocked Monday
          there still gets its dot — Mondays are bookable for weddings.) */}
      {!isSel && !isTooSoon && !closedWeekday && (isBlocked || isFull) && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-300" style={dotStyle} />
      )}
      {!isSel && !disabled && isPartial && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#F0C27A]" style={dotStyle} />
      )}
      {!isSel && isOpen && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" style={dotStyle} />
      )}
    </button>
  );
});

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

  // Mount-once grid assemble. Deliberately NOT keyed on the month: it must not
  // replay when the visitor swipes or jumps months, only the first time the
  // calendar appears. Flipping this back to false removes the inline animation
  // from every cell, so nothing is left on the animation path during a drag.
  //
  // Reduced motion is checked here rather than in CSS because the per-cell delay
  // has to be an inline style, and inline animation beats any media query.
  const [assembling, setAssembling] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (!assembling) return;
    const t = setTimeout(() => setAssembling(false), ASSEMBLE_MS);
    return () => clearTimeout(t);
    // Mount only: re-running this on the assembling flip would re-arm the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Builds one month's grid and its day states, memoised per month.
  //
  // Stepping months slides the window by one, so two of the three panels are
  // always ones we just built. Rebuilding all three from scratch on every step
  // meant ~126 day-states (each a handful of Date comparisons and Set lookups)
  // recomputed for the sake of the 42 that were genuinely new. The cache lives
  // inside the memo, so ANY change to the inputs below throws the whole thing
  // away and rebuilds — a newly blocked day can never be served stale.
  //
  // It also keeps object identity: the same month handed back the same `states`
  // objects and the same `day` objects lets memo'd CalDay skip re-rendering.
  const getPanel = useMemo(() => {
    const cache = new Map();
    const today = studioToday(); // the studio's day, same one the lead time counts from
    return (y, m) => {
      const cacheKey = `${y}-${m}`;
      const hit = cache.get(cacheKey);
      if (hit) return hit;
      const days = buildMonthGrid(y, m);
      const states = new Map();
      days.forEach(day => {
        if (!day) return;
        const key = dateKey(y, m, day.d);
        states.set(key, dayState({
          day, year: y, month: m, today, minDate, blockedSet, bookedDateMap,
          maxPerDay: getMaxForDay(key), allowClosedDays,
        }));
      });
      const panel = { y, m, key: cacheKey, days, states };
      cache.set(cacheKey, panel);
      return panel;
    };
  }, [minDate, blockedSet, bookedDateMap, getMaxForDay, allowClosedDays]);

  // Previous · current · next, all built up front so a swipe reveals a real
  // month under the finger rather than empty space.
  const panels = useMemo(() => {
    const built = [-1, 0, 1].map(off => {
      const d = new Date(year, month + off, 1);
      return getPanel(d.getFullYear(), d.getMonth());
    });

    // Pad all three to the same row count. Months are 5 or 6 rows deep, and a
    // track whose panels disagree would grow and shrink under the finger
    // mid-swipe. Padding only to the tallest of the three (rather than always
    // six) keeps the common 5-row case from carrying a permanent empty row.
    //
    // Padding produces a COPY rather than pushing into the cached panel: how
    // many trailing blanks a month needs depends on the two months either side
    // of it, so it isn't a property of the month and must not be baked into the
    // cache entry. The day objects and the states map are shared by reference,
    // so the copy costs nothing that matters.
    const rows = Math.max(...built.map(p => Math.ceil(p.days.length / 7)));
    return built.map(p => p.days.length === rows * 7
      ? p
      : { ...p, days: [...p.days, ...Array(rows * 7 - p.days.length).fill(null)] });
  }, [year, month, getPanel]);

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

  // Direct jump, no track animation. Used by the month board, which can land any
  // distance away — there is no meaningful slide between June and next March, so
  // those swap instantly.
  const goToMonth = useCallback((y, m) => {
    const target = new Date(y, m);
    const clamped = (target.getFullYear() < floor.y || (target.getFullYear() === floor.y && target.getMonth() < floor.m))
      ? new Date(floor.y, floor.m)
      : target;
    if (clamped.getFullYear() === year && clamped.getMonth() === month) return;
    onMonthChange(clamped);
  }, [floor, year, month, onMonthChange]);

  // ── Month board ───────────────────────────────────────────────────────────
  // Jumping used to be two dropdowns, month and year, each a scrolling list in a
  // popup. That is four taps to reach April 2027, and inside the booking sheet
  // the lists barely scrolled at all. This replaces both: tapping the title
  // turns the day grid into a board of all twelve months with the year stepping
  // above it. One tap to land, nothing to scroll, and it reads the same under a
  // thumb as under a mouse.
  const [picking, setPicking] = useState(false);
  const [pickYear, setPickYear] = useState(year);
  const boardRef = useRef(null);
  const titleRef = useRef(null);
  const gridBoxRef = useRef(null);
  const [boardRect, setBoardRect] = useState(null);

  // The board opens as a lifted card over a dimmed screen, not as a quiet swap
  // in place. In place it was easy to miss entirely: the panel is white, the
  // board is white, and on a phone the only thing that changed was a block of
  // text most of the way down the page. Dimming everything behind it is the
  // whole signal — it says a picker took over, the same way any sheet does.
  //
  // Which is why it's a portal: fixed positioning inside the booking sheet is
  // relative to the sheet's own transform, and a scrim that only dims the
  // calendar would be dimming the one thing you're looking at. Measured off the
  // grid so it still lands where the grid was.
  const placeBoard = useCallback(() => {
    const el = gridBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const PAD = 10;
    const width = Math.min(window.innerWidth - 16, r.width + PAD * 2);
    const height = Math.min(window.innerHeight - 16, r.height + PAD * 2);
    setBoardRect({
      left: Math.max(8, Math.min(r.left - PAD, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(r.top - PAD, window.innerHeight - height - 8)),
      width,
      height,
    });
  }, []);

  // How far out the year stepper can run. The bottom is the first month holding
  // a bookable date; the top matches the old dropdown's six-year window.
  const yearRange = useMemo(() => ({
    min: floor.y,
    max: Math.max(floor.y, studioToday().getFullYear() + 5),
  }), [floor]);

  // Opening always starts on the year being shown, however far the visitor
  // wandered the last time they had the board open.
  const togglePicking = useCallback(() => {
    setPickYear(year);
    setPicking(p => !p);
  }, [year]);

  const chooseMonth = useCallback((m) => {
    goToMonth(pickYear, m);
    setPicking(false);
  }, [goToMonth, pickYear]);

  // Escape, or a tap anywhere off the board — both are what a visitor expects
  // of something that opened over the top of what they were looking at. The
  // trigger is exempt so its own toggle isn't closed out from under it.
  useIsoLayoutEffect(() => {
    if (!picking) { setBoardRect(null); return; }
    placeBoard();
    const onKey = (e) => { if (e.key === 'Escape') setPicking(false); };
    const onDown = (e) => {
      if (boardRef.current?.contains(e.target) || titleRef.current?.contains(e.target)) return;
      setPicking(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    // Capture, because the sheet scrolls in its own container rather than the
    // window — without it the board would sit still while the grid moved.
    window.addEventListener('scroll', placeBoard, true);
    window.addEventListener('resize', placeBoard);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', placeBoard, true);
      window.removeEventListener('resize', placeBoard);
    };
  }, [picking, placeBoard]);

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

      // Plain pixels, not calc() against a percentage. -33.3333% of a track that
      // is 300% wide is exactly one viewport, so this is the same position — but
      // the browser doesn't have to resolve a percentage against a freshly
      // measured box on every touchmove to get there.
      track.style.transform = `translate3d(${(shift - w).toFixed(2)}px,0,0)`;
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

  // Stable across renders, on purpose: an inline `d => pick(p, d)` per cell
  // would hand every memo'd CalDay a fresh prop on every render and defeat the
  // memo entirely. The live values are read through a ref instead, so the
  // callback identity never changes while the behaviour is always current.
  const pickRef = useRef(null);
  pickRef.current = (panelKey, day) => {
    const panel = panels.find(p => p.key === panelKey);
    if (!panel) return;
    const key = dateKey(panel.y, panel.m, day.d);
    const s = panel.states.get(key);
    if (!s || s.disabled) return;
    onSelectDate(selectedDate === key ? null : key); // tap again to clear
  };
  const pick = useCallback((panelKey, day) => pickRef.current(panelKey, day), []);

  return (
    <div className="relative z-10">
      {/* Month nav.
          The ‹ › steppers run on phones too, at the same size and the same quiet
          grey as desktop — swiping still works, but it isn't discoverable on its
          own, and a stepper you can see is worth more than a strip with one less
          chevron in it. Phones get an active state instead of a hover one. */}
      <div className="flex items-center gap-1 pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => stepMonth('prev')}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className={`flex w-9 h-9 items-center justify-center transition-all text-xl flex-shrink-0 ${
            canGoPrev
              ? 'text-gray-300 hover:text-[#D4A0B0] active:text-[#D4A0B0] active:scale-90'
              : 'text-gray-100 cursor-not-allowed'
          }`}
        >
          ‹
        </button>

        {/* The title is the control. One chevron, one tap target, and it opens
            the month board over the grid rather than a list beside it. */}
        <button
          ref={titleRef}
          type="button"
          onClick={togglePicking}
          aria-expanded={picking}
          aria-label="Choose a month"
          className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 font-serif text-[1.15rem] sm:text-[1.2rem] text-[#111] tracking-tight rounded-lg px-2 py-1 transition-colors cursor-pointer outline-none ${
            picking ? 'bg-[#D4A0B0]/12' : 'hover:bg-[#F6EEF1] active:bg-[#F6EEF1]'
          }`}
        >
          <span className="truncate">{MONTHS[month]} {year}</span>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-3.5 h-3.5 flex-shrink-0 text-[#C4849A] transition-transform duration-200"
            style={{ transform: picking ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => stepMonth('next')}
          aria-label="Next month"
          className="flex w-9 h-9 items-center justify-center text-gray-300 hover:text-[#D4A0B0] active:text-[#D4A0B0] active:scale-90 transition-all text-xl flex-shrink-0"
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

      {/* Month availability summary, with the swipe hint riding quietly on the
          right of the same row. */}
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
          <span className="sm:hidden ml-auto text-[0.58rem] text-gray-300 tracking-[0.04em]">Swipe to change month</span>
        </div>
      )}

      {/* Measured, not just laid out: the month board is a portal (see
          placeBoard) and lands on this box's rect, so the card it opens as sits
          exactly where the grid was. */}
      <div ref={gridBoxRef} className="relative">
        <div
          className={`grid grid-cols-7 gap-1.5 sm:gap-2 text-center mt-4 mb-3 ${assembling ? 'cal-head-in' : ''}`}
          // Same hold-back as the cells, so the header leads the grid in by a
          // beat instead of arriving while the sheet is still sliding.
          style={assembling ? { animationDelay: `${ASSEMBLE_START_MS}ms` } : undefined}
        >
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
                        panelKey={p.key}
                        state={p.states.get(dateKey(p.y, p.m, day.d))}
                        isSel={selectedDate === dateKey(p.y, p.m, day.d)}
                        onPick={pick}
                        // Centre panel only. The neighbours are off-screen, and
                        // animating them too would put three months of cells on the
                        // animation path for the track's own transform.
                        enterDelay={assembling && i === 1
                          ? ASSEMBLE_START_MS + Math.min(idx * CELL_STEP_MS, ASSEMBLE_CELLS_MS)
                          : null}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Month board. Dimming the whole screen behind it is what makes the tap
          register — see placeBoard. */}
      {picking && boardRect && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            style={{ background: 'rgba(44,26,20,0.34)', animation: 'calScrimIn 0.18s ease-out both' }}
          />
          <div
            ref={boardRef}
            className="fixed z-[9999] bg-white rounded-2xl border border-[#F2E6EC] flex flex-col justify-center px-3"
            style={{
              left: boardRect.left,
              top: boardRect.top,
              width: boardRect.width,
              height: boardRect.height,
              boxShadow: '0 26px 64px rgba(60,30,45,0.26)',
              animation: 'calBoardIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
            }}
          >
            {/* Year stepper. A range this short (six years) is faster to step
                than to pick from a list, and stepping needs no scrolling. */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <button
                type="button"
                onClick={() => setPickYear(y => Math.max(yearRange.min, y - 1))}
                disabled={pickYear <= yearRange.min}
                aria-label="Previous year"
                className={`w-9 h-9 flex items-center justify-center text-xl transition-all ${
                  pickYear > yearRange.min
                    ? 'text-gray-300 hover:text-[#D4A0B0] active:text-[#D4A0B0] active:scale-90'
                    : 'text-gray-100 cursor-not-allowed'
                }`}
              >
                ‹
              </button>
              <span className="font-serif text-[1.15rem] text-[#111] tracking-tight w-[4.25rem] text-center tabular-nums">{pickYear}</span>
              <button
                type="button"
                onClick={() => setPickYear(y => Math.min(yearRange.max, y + 1))}
                disabled={pickYear >= yearRange.max}
                aria-label="Next year"
                className={`w-9 h-9 flex items-center justify-center text-xl transition-all ${
                  pickYear < yearRange.max
                    ? 'text-gray-300 hover:text-[#D4A0B0] active:text-[#D4A0B0] active:scale-90'
                    : 'text-gray-100 cursor-not-allowed'
                }`}
              >
                ›
              </button>
            </div>

            {/* All twelve at once. Months with nothing bookable in them are dead
                on the board for the same reason they're dead in the grid. */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {MONTHS_SHORT.map((label, i) => {
                const tooSoon = pickYear < floor.y || (pickYear === floor.y && i < floor.m);
                const isCurrent = pickYear === year && i === month;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => chooseMonth(i)}
                    disabled={tooSoon}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`py-2.5 rounded-xl font-serif text-[0.95rem] transition-colors ${
                      tooSoon
                        ? 'text-gray-200 cursor-not-allowed'
                        : isCurrent
                          ? 'bg-[#111] text-white'
                          : 'text-[#3A2C26] hover:bg-[#FAF4F7] active:bg-[#F6EEF1] cursor-pointer'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

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
