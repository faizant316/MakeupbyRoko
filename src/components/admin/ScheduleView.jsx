import { useEffect, useMemo, useRef, useState } from 'react';
import { parseRange, apptToMin } from '@/lib/timeWindow';
import { EVENT_COLORS, BLOCK_INK, blockHatch, isBridalService } from './statusColors';
import { classesOfReg } from '@/lib/classCatalog';
import { blockLabel } from '@/lib/timeBlocks';
import CalendarHeader from './CalendarHeader';
import { useTimeBlocks } from './useTimeBlocks';
import { Segmented, cx } from './ui';

// Booksy-style schedule. Day is a real time grid, Week is a 7-column grid you
// read as a shape (a busy day is visibly dense, a free day is visibly empty, no
// "Free day" label to read), Month is a density map of type bars.
//
// Everything sizes off one small type scale: 11 / 13 / 15 / 20px at weights
// 400-600. The previous version mixed 14 different font sizes with 8px tracked
// all-caps labels, which is why the panel read as a cheaper, older typeface than
// the rest of the admin even though it was always the same Inter.
//
// The grid itself is hairlines and muted labels; the only colour on it is the
// events, in their kind colours from statusColors, so the day reads as its
// appointments rather than as its chrome.
//
// Navigation lives in one place: the header arrows step by week / week / month
// depending on the view, so the strip and the month grid no longer carry their
// own duplicate controls.
//
// `withViews` (the client-card drawer) shows the Day/Week/Month switcher;
// AdminCalendar keeps its own switcher and uses this component day-only.

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Short enough to keep the legend on one line at drawer width.
const SHORT_LABELS = { bridal: 'Bridal', appt: 'Appt', class: 'Class', consult: 'Consult' };

// Default durations (minutes) when a booking only has a start time.
const DEFAULT_DUR = { bridal: 120, appt: 120, class: 90, consult: 30, block: 60 };

// Px per hour in the day grid. At 58 the baseline 7 AM–8 PM ran to ~750px of
// grid before the header, the week strip and the legend, which is most of a
// phone screen spent on a day that usually holds one appointment. 46 keeps an
// hour block tall enough for both its lines and takes 150px off the page.
const HOUR_H = 46;
const WEEK_HOUR_H = 26; // week grid, px per hour: the whole day fits without scrolling

function minToLabel(min) {
  const h = Math.floor(min / 60);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}

// Group overlapping events into clusters, then assign each event a column so
// simultaneous appointments sit side by side (Booksy behavior).
function layoutEvents(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const clusters = [];
  let cluster = [], clusterEnd = -1;
  for (const ev of sorted) {
    if (cluster.length && ev.start < clusterEnd) {
      cluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.end);
    } else {
      if (cluster.length) clusters.push(cluster);
      cluster = [ev];
      clusterEnd = ev.end;
    }
  }
  if (cluster.length) clusters.push(cluster);

  for (const c of clusters) {
    const colEnds = [];
    for (const ev of c) {
      let col = colEnds.findIndex(end => end <= ev.start);
      if (col === -1) { col = colEnds.length; colEnds.push(ev.end); }
      else colEnds[col] = ev.end;
      ev.col = col;
    }
    for (const ev of c) ev.cols = colEnds.length;
  }
  return sorted;
}

export default function ScheduleView({
  bookings = [], classRegs = [], dateKey, onChangeDate,
  onSelectBooking, onSelectClassReg, onSelectTimeBlock, dm, withViews = false, headerRight = null,
}) {
  // Her blocked time, from the shared cache. Read here rather than passed in so
  // every schedule shows it, including the one inside the client card.
  const timeBlocks = useTimeBlocks();
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  const [view, setView] = useState('day');

  // Keep the "now" line moving while the schedule is open.
  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60000);
    return () => clearInterval(t);
  }, []);

  const date = new Date(dateKey + 'T00:00:00');
  const todayKey = keyOf(new Date());
  const isToday = dateKey === todayKey;

  // ── Every event, grouped by date, built once ──
  const eventsByDate = useMemo(() => {
    const map = new Map();
    const push = (dk, ev) => {
      const { start, end } = parseRange(ev.timeStr);
      const s = apptToMin(start);
      if (s != null) {
        let e = apptToMin(end);
        if (e == null || e <= s) e = Math.min(s + (DEFAULT_DUR[ev.type] || 90), 24 * 60);
        ev.start = s;
        ev.end = e;
      }
      if (!map.has(dk)) map.set(dk, []);
      map.get(dk).push(ev);
    };
    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date) {
        const type = isBridalService(b.service) ? 'bridal' : 'appt';
        push(b.date, {
          id: `a-${b.id}`, type, name: b.name || 'Client', detail: b.service || 'Appointment',
          // City only here. The grid is for judging whether a day is drivable,
          // and a full street address would not fit in a block anyway.
          location: b.location_city || '',
          timeStr: b.time || '', status: b.status || 'pending',
          onOpen: () => onSelectBooking?.(b),
        });
      }
      if (b.consultation_date) {
        push(b.consultation_date, {
          id: `c-${b.id}`, type: 'consult', name: b.name || 'Client',
          detail: `${b.consultation_type || 'Zoom'} consultation`,
          timeStr: b.consultation_time || '', status: b.status || 'pending',
          onOpen: () => onSelectBooking?.(b),
        });
      }
    });
    classRegs.forEach(r => {
      if (r.status === 'cancelled' || !r.appointment_date) return;
      const cls = classesOfReg(r)[0];
      const fmtTag = r.class_format === 'in_person' ? ' · Studio' : r.class_format === 'online' ? ' · Zoom' : '';
      push(r.appointment_date, {
        id: `l-${r.id}`, type: 'class', name: r.full_name || 'Client',
        detail: (cls ? cls.title.replace('Makeup ', '') : 'Makeup Class') + fmtTag,
        timeStr: r.appointment_time || '', status: r.status === 'enrolled' ? 'confirmed' : (r.status || 'pending'),
        onOpen: () => onSelectClassReg?.(r),
      });
    });
    timeBlocks.forEach(t => {
      if (!t.date) return;
      push(t.date, {
        id: `b-${t.id}`, type: 'block', name: blockLabel(t),
        detail: t.time ? 'Blocked time' : 'Blocked all day',
        timeStr: t.time || '', status: 'confirmed',
        // Only clickable where a panel can edit it. In the client card it is
        // there to be seen, not changed.
        onOpen: onSelectTimeBlock ? () => onSelectTimeBlock(t) : null,
      });
    });
    return map;
  }, [bookings, classRegs, timeBlocks, onSelectBooking, onSelectClassReg, onSelectTimeBlock]);

  // Which kinds of events each date has (strip dots + month bars).
  const kindsByDate = useMemo(() => {
    const m = new Map();
    for (const [dk, evs] of eventsByDate) {
      const set = new Set();
      evs.forEach(ev => set.add(ev.type));
      m.set(dk, set);
    }
    return m;
  }, [eventsByDate]);

  // ── The shown day's events, laid out for the time grid ──
  const { timed, untimed } = useMemo(() => {
    const timed = [], untimed = [];
    for (const ev of (eventsByDate.get(dateKey) || [])) {
      if (ev.start == null) untimed.push(ev);
      else timed.push(ev);
    }
    return { timed: layoutEvents(timed), untimed };
  }, [eventsByDate, dateKey]);

  // ── Week days (Sun–Sat around the shown date) ──
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // ── Day grid range: 7 AM–8 PM baseline, stretched to fit outliers ──
  let gridStart = 7 * 60, gridEnd = 20 * 60;
  for (const ev of timed) {
    gridStart = Math.min(gridStart, Math.floor(ev.start / 60) * 60);
    gridEnd = Math.max(gridEnd, Math.ceil(ev.end / 60) * 60);
  }
  if (isToday && nowMin > gridStart && nowMin < 22 * 60) {
    gridEnd = Math.max(gridEnd, Math.ceil((nowMin + 30) / 60) * 60);
  }
  const hours = [];
  for (let m = gridStart; m <= gridEnd; m += 60) hours.push(m);
  const gridH = ((gridEnd - gridStart) / 60) * HOUR_H;

  const activeView = withViews ? view : 'day';

  // ── One set of arrows in the header, stepping by whatever the view shows ──
  // Day steps one day at a time (Booksy behavior). The week strip is for
  // hopping around inside the visible week; the arrows are how you walk off
  // the end of it, so making them jump a whole week left no way to reach
  // tomorrow except by tapping its number.
  const stepUnit = activeView === 'month' ? 'month' : activeView === 'week' ? 'week' : 'day';
  const step = (dir) => {
    const d = new Date(date);
    if (activeView === 'month') {
      const day = d.getDate();
      const target = new Date(d.getFullYear(), d.getMonth() + dir, 1);
      target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
      onChangeDate(keyOf(target));
      return;
    }
    d.setDate(d.getDate() + dir * (activeView === 'week' ? 7 : 1));
    onChangeDate(keyOf(d));
  };
  const jumpTo = (monthIdx, year) => {
    const day = Math.min(date.getDate(), new Date(year, monthIdx + 1, 0).getDate());
    onChangeDate(keyOf(new Date(year, monthIdx, day)));
  };

  // The header names whatever the arrows move (the day, the week's span, the
  // month) and the year always rides underneath it as the small line, so the
  // big line never has to carry four numbers.
  const stripFirst = weekDays[0], stripLast = weekDays[6];
  const headerTitle = activeView === 'day'
    ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : activeView === 'week'
      ? `${stripFirst.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${stripLast.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : date.toLocaleDateString('en-US', { month: 'long' });
  const headerYear = activeView === 'week' && stripFirst.getFullYear() !== stripLast.getFullYear()
    ? `${stripFirst.getFullYear()} – ${stripLast.getFullYear()}`
    : String(date.getFullYear());

  // ── Shared bits ──

  // Solid when confirmed, hollow + dashed when the time isn't locked in yet.
  // Blocked time is its own thing: hatched grey with dark ink, like Booksy's
  // time reservations, so it never reads as a client. Returns the classes and
  // the one or two values that have to be inline (the kind colour).
  const blockInk = BLOCK_INK[dm ? 'dark' : 'light'];
  const colorOf = (type) => (type === 'block' ? blockInk : EVENT_COLORS[type]);
  const blockLook = (ev) => {
    if (ev.type === 'block') {
      return { cls: 'border border-line-strong bg-paper text-ink-soft', style: { backgroundImage: blockHatch(dm) } };
    }
    const color = EVENT_COLORS[ev.type];
    if (ev.status === 'pending') {
      return { cls: 'border-[1.5px] border-dashed text-ink', style: { background: `${color}24`, borderColor: color } };
    }
    // A paper-coloured edge keeps two blocks side by side from merging.
    return { cls: 'border border-paper/50 text-white', style: { background: color } };
  };

  // ── Swiping the week strip ────────────────────────────────────────────────
  // Tapping an arrow seven times to reach a week you can see coming is the kind
  // of thing that's fine on a laptop and miserable on a phone. The strip drags
  // with your thumb and the next week slides in from the side you threw it.
  //
  // Native listeners, bound once per view, reading live values through a ref:
  // React registers touchmove passively, so an onTouchMove prop could never call
  // preventDefault, and a horizontal drag would scroll the page at the same
  // time. Rebuilding the listeners on every render would also drop a gesture in
  // progress whenever a query resolved mid-swipe.
  const stripVpRef = useRef(null);
  const stripTrackRef = useRef(null);
  const swipeRef = useRef({ dateKey, onChangeDate });
  swipeRef.current = { dateKey, onChangeDate };

  useEffect(() => {
    if (activeView !== 'day') return;
    const vp = stripVpRef.current;
    const track = stripTrackRef.current;
    if (!vp || !track) return;
    let drag = null;

    const glide = (to, ms) => {
      track.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.22,0.61,0.36,1)` : 'none';
      track.style.transform = `translate3d(${to}px,0,0)`;
    };

    const onStart = (e) => {
      if (e.touches.length !== 1) { drag = null; return; }
      const t = e.touches[0];
      glide(0, 0);
      drag = { x0: t.clientX, y0: t.clientY, axis: null, dx: 0, lastX: t.clientX, lastT: e.timeStamp, v: 0 };
    };

    const onMove = (e) => {
      if (!drag || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.x0;
      const dy = t.clientY - drag.y0;
      // Axis locked once, in the first few pixels, with horizontal having to
      // beat vertical by 1.2x — a slightly diagonal flick should still scroll.
      if (drag.axis === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        drag.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      }
      if (drag.axis !== 'x') return;
      if (e.cancelable) e.preventDefault();
      const w = vp.offsetWidth || 1;
      drag.dx = Math.max(-w, Math.min(w, dx));
      const dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = (t.clientX - drag.lastX) / dt;
      drag.lastX = t.clientX;
      drag.lastT = e.timeStamp;
      glide(drag.dx, 0);
    };

    const onEnd = () => {
      const d = drag;
      drag = null;
      if (!d || d.axis !== 'x') return;
      const w = vp.offsetWidth || 1;
      // Drag a fifth of the way across, or flick it. The flick path is what
      // makes a short, fast swipe behave the way a phone user expects.
      const far = Math.abs(d.dx) > w * 0.2;
      const flick = Math.abs(d.v) > 0.35 && Math.abs(d.dx) > 18;
      if (!far && !flick) { glide(0, 200); return; }

      const dir = d.dx < 0 ? 1 : -1;                 // dragged left → next week
      const { dateKey: dk, onChangeDate: change } = swipeRef.current;
      const next = new Date(dk + 'T00:00:00');
      next.setDate(next.getDate() + dir * 7);
      change(keyOf(next));
      // The strip re-renders with the new week already in place, so park it off
      // the edge it came from and let it slide home. One animation, no delay
      // between the thumb leaving the glass and the dates changing.
      glide(dir * w, 0);
      requestAnimationFrame(() => requestAnimationFrame(() => glide(0, 240)));
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
  }, [activeView]);

  // ── Day: week strip + time grid ──

  // The date as a circle: ink when it's the day on screen, rose when it's
  // today. The same two signals as the Home week strip.
  const dateNum = (isSel, isTod) => cx(
    'flex items-center justify-center rounded-full tabular-nums transition-colors duration-200',
    isSel ? 'bg-ink font-semibold text-paper' : isTod ? 'font-semibold text-rose' : 'text-ink',
  );

  const renderWeekStrip = () => (
    <div ref={stripVpRef} className="mb-2 overflow-hidden" style={{ touchAction: 'pan-y' }}>
    <div ref={stripTrackRef} className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {weekDays.map(d => {
        const k = keyOf(d);
        const isSel = k === dateKey;
        const isTod = k === todayKey;
        const kinds = kindsByDate.get(k);
        return (
          <button key={k} type="button" onClick={() => onChangeDate(k)} aria-pressed={isSel}
            className="flex min-w-0 select-none flex-col items-center gap-1 py-1">
            <span className={cx('text-[0.68rem] font-medium', isTod ? 'text-rose' : 'text-ink-muted')}>
              {DAYS[d.getDay()]}
            </span>
            <span className={cx(dateNum(isSel, isTod), 'h-8 w-8 text-[0.92rem]')}>
              {d.getDate()}
            </span>
            <span className="flex h-1 items-center gap-[3px]">
              {kinds && [...kinds].slice(0, 3).map(t => (
                <span key={t} className="h-1 w-1 rounded-full"
                  style={{ background: isSel ? 'rgb(var(--c-ink-muted))' : colorOf(t) }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
    </div>
  );

  const renderDayGrid = () => (
    <>
      {/* A whole-day block isn't a missing time, it's the whole day. It gets
          its own line so "No time set" keeps meaning a client to chase. */}
      {untimed.some(ev => ev.type === 'block') && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-medium text-ink-muted">All day</span>
          {untimed.filter(ev => ev.type === 'block').map(ev => {
            const look = blockLook(ev);
            return (
              <button key={ev.id} type="button" onClick={ev.onOpen || undefined}
                className={cx('flex items-center gap-1.5 rounded-[6px] py-1 pl-2 pr-2.5 text-[0.8rem]', look.cls, ev.onOpen ? 'transition-opacity hover:opacity-75' : 'cursor-default')}
                style={look.style}>
                <span className="h-1.5 w-1.5 shrink-0" style={{ background: blockInk }} />
                <span className="max-w-[200px] truncate">{ev.name}</span>
              </button>
            );
          })}
        </div>
      )}
      {untimed.some(ev => ev.type !== 'block') && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-medium text-ink-muted">No time set</span>
          {untimed.filter(ev => ev.type !== 'block').map(ev => (
            <button key={ev.id} type="button" onClick={ev.onOpen}
              className="flex items-center gap-1.5 rounded-[6px] py-1 pl-2 pr-2.5 text-[0.8rem] text-ink transition-opacity hover:opacity-75"
              style={{ background: `${EVENT_COLORS[ev.type]}1a` }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: EVENT_COLORS[ev.type] }} />
              <span className="max-w-[150px] truncate">{ev.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* The grid always renders. An empty day reads as an empty grid, which is
          faster to parse than a sentence saying the day is empty. */}
      <div className="relative" style={{ height: gridH }}>
        {hours.map(m => (
          <div key={m} className="absolute left-0 right-0 flex items-start" style={{ top: ((m - gridStart) / 60) * HOUR_H }}>
            <span className="w-[46px] shrink-0 -translate-y-1/2 pr-2.5 text-right text-[0.68rem] tabular-nums text-ink-muted">{minToLabel(m)}</span>
            <div className="h-px flex-1 bg-line" />
          </div>
        ))}
        {hours.slice(0, -1).map(m => (
          <div key={`h-${m}`} className="absolute right-0 h-px bg-line/45" style={{
            top: ((m + 30 - gridStart) / 60) * HOUR_H, left: 46,
          }} />
        ))}

        {isToday && nowMin >= gridStart && nowMin <= gridEnd && (
          <div className="pointer-events-none absolute right-0 z-20 flex items-center" style={{ left: 42, top: ((nowMin - gridStart) / 60) * HOUR_H }}>
            <span className="h-[7px] w-[7px] shrink-0 -translate-x-1/2 rounded-full bg-rose" />
            <div className="h-px flex-1 bg-rose" />
          </div>
        )}

        <div className="absolute inset-y-0 right-0" style={{ left: 52 }}>
          {timed.map(ev => {
            const top = ((ev.start - gridStart) / 60) * HOUR_H;
            const height = Math.max(((ev.end - ev.start) / 60) * HOUR_H, 24);
            const width = 100 / ev.cols;
            const compact = height < 40;   // a one-hour block still gets both lines
            const look = blockLook(ev);
            return (
              <button key={ev.id} type="button" onClick={ev.onOpen || undefined}
                className={cx(
                  'absolute z-10 overflow-hidden rounded-[6px] text-left',
                  look.cls,
                  ev.status === 'completed' ? 'opacity-50' : ev.onOpen && 'transition-opacity hover:opacity-85',
                  !ev.onOpen && 'cursor-default',
                  compact ? 'px-[7px] py-0.5' : 'px-2 py-[5px]',
                )}
                style={{
                  top, height,
                  left: `calc(${ev.col * width}% + ${ev.col === 0 ? 0 : 2}px)`,
                  width: `calc(${width}% - ${ev.cols > 1 ? 2 : 0}px)`,
                  ...look.style,
                }}>
                {compact ? (
                  <p className="truncate text-[0.8rem] leading-tight">
                    <span className="tabular-nums opacity-85">{ev.timeStr ? parseRange(ev.timeStr).start : ''}</span>{' '}
                    <span className="font-medium">{ev.name}</span>
                  </p>
                ) : (
                  <>
                    <p className="text-[0.68rem] leading-tight tabular-nums opacity-85">{ev.timeStr}</p>
                    <p className="truncate text-[0.8rem] font-medium leading-snug">{ev.name}</p>
                    {height >= 62 && <p className="truncate text-[0.68rem] leading-snug opacity-80">{ev.detail}</p>}
                    {/* Needs a taller block than the service line, so it only
                        appears once there's genuinely room for a third row. */}
                    {height >= 80 && ev.location && (
                      <p className="flex items-center gap-1 text-[0.68rem] leading-snug opacity-75">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5 shrink-0" aria-hidden>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="truncate">{ev.location}</span>
                      </p>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  // ── Week: a real 7-column grid. Read it as a shape, not a list. ──
  const renderWeekGrid = () => {
    let ws = 8 * 60, we = 20 * 60;
    const perDay = weekDays.map(d => {
      const evs = eventsByDate.get(keyOf(d)) || [];
      evs.forEach(ev => {
        if (ev.start == null) return;
        ws = Math.min(ws, Math.floor(ev.start / 60) * 60);
        we = Math.max(we, Math.ceil(ev.end / 60) * 60);
      });
      return {
        d,
        timed: layoutEvents(evs.filter(e => e.start != null)),
        untimed: evs.filter(e => e.start == null),
      };
    });
    const wHours = [];
    for (let m = ws; m <= we; m += 60) wHours.push(m);
    const totalH = ((we - ws) / 60) * WEEK_HOUR_H;
    const anyUntimed = perDay.some(p => p.untimed.length > 0);

    return (
      <div>
        {/* Day headers */}
        <div className="mb-1.5 flex">
          <span className="w-[34px] shrink-0" />
          <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {perDay.map(({ d }) => {
              const k = keyOf(d);
              const isTod = k === todayKey;
              const isSel = k === dateKey;
              return (
                <button key={k} type="button" onClick={() => { onChangeDate(k); setView('day'); }}
                  className="flex min-w-0 select-none flex-col items-center gap-0.5 py-0.5">
                  <span className={cx('text-[0.68rem] font-medium', isTod ? 'text-rose' : 'text-ink-muted')}>
                    {DAYS[d.getDay()].charAt(0)}
                  </span>
                  <span className={cx(dateNum(isSel, isTod), 'h-6 w-6 text-[0.8rem]')}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Anything without a time, pinned above its column */}
        {anyUntimed && (
          <div className="mb-1 flex">
            <span className="w-[34px] shrink-0" />
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {perDay.map(({ d, untimed: u }) => (
                <span key={keyOf(d)} className="px-[2px]">
                  {u.length > 0 && (
                    <button type="button" onClick={u[0].onOpen} title={u.map(e => e.name).join(', ')}
                      aria-label={u.map(e => e.name).join(', ')}
                      className="h-[14px] w-full rounded-[6px] border border-dashed transition-opacity hover:opacity-75"
                      style={{ background: `${colorOf(u[0].type)}26`, borderColor: colorOf(u[0].type) }} />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="flex" style={{ height: totalH }}>
          <div className="relative w-[34px] shrink-0">
            {wHours.map((m, i) => (
              i % 2 === 0 ? (
                <span key={m} className="absolute right-1.5 -translate-y-1/2 text-[0.68rem] tabular-nums text-ink-muted"
                  style={{ top: ((m - ws) / 60) * WEEK_HOUR_H }}>
                  {minToLabel(m).replace(' ', '')}
                </span>
              ) : null
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            {/* Hour lines across all 7 columns */}
            {wHours.map(m => (
              <div key={m} className={cx('absolute left-0 right-0 h-px', m % 120 === ws % 120 ? 'bg-line' : 'bg-line/45')}
                style={{ top: ((m - ws) / 60) * WEEK_HOUR_H }} />
            ))}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {perDay.map(({ d, timed: t }) => {
                const k = keyOf(d);
                const isTod = k === todayKey;
                return (
                  <div key={k} className="relative min-w-0 border-l border-line/60">
                    {isTod && <div className="pointer-events-none absolute inset-0 bg-rose/[0.06]" />}
                    {t.map(ev => {
                      const top = ((ev.start - ws) / 60) * WEEK_HOUR_H;
                      const height = Math.max(((ev.end - ev.start) / 60) * WEEK_HOUR_H, 9);
                      const width = 100 / ev.cols;
                      const look = blockLook(ev);
                      return (
                        <button key={ev.id} type="button" onClick={ev.onOpen}
                          title={[ev.timeStr || 'No time', ev.name, ev.detail, ev.location].filter(Boolean).join(' · ')}
                          aria-label={[ev.timeStr || 'No time', ev.name, ev.detail].filter(Boolean).join(', ')}
                          className={cx('absolute z-10 rounded-[6px]', look.cls, ev.status === 'completed' ? 'opacity-45' : 'transition-opacity hover:opacity-75')}
                          style={{
                            top, height,
                            left: `calc(${ev.col * width}% + 1px)`,
                            width: `calc(${width}% - 2px)`,
                            ...look.style,
                          }} />
                      );
                    })}
                    {isTod && nowMin >= ws && nowMin <= we && (
                      <div className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-rose"
                        style={{ top: ((nowMin - ws) / 60) * WEEK_HOUR_H }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Month: date numbers + type bars, no dots, no duplicate month nav ──
  const renderMonthGrid = () => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return (
      <div>
        <div className="mb-1 grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {DAYS.map(dl => (
            <span key={dl} className="py-1 text-center text-[0.68rem] font-medium text-ink-muted">
              {dl.charAt(0)}
            </span>
          ))}
        </div>
        <div className="grid gap-y-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={`e-${i}`} />;
            const k = keyOf(new Date(date.getFullYear(), date.getMonth(), d));
            const isSel = k === dateKey;
            const isTod = k === todayKey;
            const kinds = kindsByDate.get(k);
            return (
              <button key={k} type="button" onClick={() => { onChangeDate(k); setView('day'); }} aria-pressed={isSel}
                className="flex min-w-0 select-none flex-col items-center gap-1 py-0.5">
                <span className={cx(dateNum(isSel, isTod), 'h-8 w-8 text-[0.92rem]')}>
                  {d}
                </span>
                {/* One bar per kind of thing booked that day: the more bars, the
                    fuller the day. Reads as density without a number to parse. */}
                <span className="flex h-[3px] items-center gap-[2px]">
                  {kinds && [...kinds].slice(0, 3).map(t => (
                    <span key={t} className="h-[3px] w-[7px] rounded-full" style={{ background: colorOf(t) }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const swatch = 'flex items-center gap-1.5 text-[0.66rem] font-medium text-ink-muted';

  return (
    <div className="relative">
      <CalendarHeader
        title={headerTitle}
        subtitle={headerYear}
        onStep={step}
        stepUnit={stepUnit}
        jumpDate={date}
        onJump={jumpTo}
        right={headerRight}
        onToday={() => onChangeDate(todayKey)}
        isToday={isToday}
        dm={dm}
      />

      {/* ── Day / Week / Month switcher (drawer only) ── */}
      {withViews && (
        <Segmented
          size="sm"
          className="mb-3"
          value={view}
          onChange={setView}
          options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
        />
      )}

      {activeView === 'day' && (
        <>
          {renderWeekStrip()}
          {renderDayGrid()}
        </>
      )}
      {activeView === 'week' && renderWeekGrid()}
      {activeView === 'month' && renderMonthGrid()}

      {/* ── Legend: short labels, every swatch the real thing shrunk ── */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-line pt-4">
        {Object.entries(SHORT_LABELS).map(([k, label]) => (
          <span key={k} className={swatch}>
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: EVENT_COLORS[k] }} /> {label}
          </span>
        ))}
        <span className={swatch}>
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-dashed border-ink-muted" /> Pending
        </span>
        <span className={swatch}>
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] opacity-70" style={{ background: blockInk }} /> Blocked
        </span>
      </div>
    </div>
  );
}
