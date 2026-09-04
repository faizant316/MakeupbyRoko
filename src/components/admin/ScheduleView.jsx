import { useEffect, useMemo, useRef, useState } from 'react';
import { parseRange, apptToMin } from '@/lib/timeWindow';
import { EVENT_COLORS, isBridalService } from './statusColors';
import { classesOfReg } from '@/lib/classCatalog';
import CalendarHeader from './CalendarHeader';

// Booksy-style schedule. Day is a real time grid, Week is a 7-column grid you
// read as a shape (a busy day is visibly dense, a free day is visibly empty, no
// "Free day" label to read), Month is a density map of type bars.
//
// Everything sizes off one small type scale — 11 / 13 / 15 / 20px at weights
// 400-600. The previous version mixed 14 different font sizes with 8px tracked
// all-caps labels, which is why the panel read as a cheaper, older typeface than
// the rest of the admin even though it was always the same Inter.
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
const DEFAULT_DUR = { bridal: 120, appt: 120, class: 90, consult: 30 };

// Px per hour in the day grid. At 58 the baseline 7 AM–8 PM ran to ~750px of
// grid before the header, the week strip and the legend, which is most of a
// phone screen spent on a day that usually holds one appointment. 46 keeps an
// hour block tall enough for both its lines and takes 150px off the page.
const HOUR_H = 46;
const WEEK_HOUR_H = 26; // week grid, px per hour — the whole day fits without scrolling

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
  onSelectBooking, onSelectClassReg, dm, withViews = false, headerRight = null,
}) {
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
    return map;
  }, [bookings, classRegs, onSelectBooking, onSelectClassReg]);

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

  // ── Palette ──
  const line = dm ? '#2e2e38' : '#efe9e4';
  const softLine = dm ? '#26262e' : '#f7f2ee';
  const muted = dm ? '#8b8b95' : '#9c9ca6';
  const ink = dm ? '#ECEDF1' : '#1a1a1f';
  const accent = '#C4849A';
  const surface = dm ? '#1a1a20' : '#fff';

  // The header names whatever the arrows move — the day, the week's span, the
  // month — and the year always rides underneath it as the small line, so the
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
  const blockStyle = (ev) => {
    const color = EVENT_COLORS[ev.type];
    if (ev.status === 'pending') {
      return {
        background: dm ? `${color}2e` : `${color}14`,
        color: dm ? '#e9dfe5' : color,
        border: `1.5px dashed ${color}`,
      };
    }
    return {
      background: color,
      color: '#fff',
      border: `1px solid ${dm ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'}`,
    };
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

  const renderWeekStrip = () => (
    <div ref={stripVpRef} className="overflow-hidden mb-2" style={{ touchAction: 'pan-y' }}>
    <div ref={stripTrackRef} className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {weekDays.map(d => {
        const k = keyOf(d);
        const isSel = k === dateKey;
        const isTod = k === todayKey;
        const kinds = kindsByDate.get(k);
        return (
          <button key={k} onClick={() => onChangeDate(k)}
            className="flex flex-col items-center gap-1 py-1 min-w-0 select-none"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            <span className="text-[0.68rem] font-medium" style={{ color: isTod ? accent : muted }}>
              {DAYS[d.getDay()]}
            </span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[0.94rem] tabular-nums transition-colors"
              style={isSel
                ? { background: dm ? '#ECEDF1' : '#1a1a1f', color: dm ? '#111' : '#fff', fontWeight: 500 }
                : { color: isTod ? accent : ink, fontWeight: isTod ? 600 : 400 }}>
              {d.getDate()}
            </span>
            <span className="flex items-center gap-[3px] h-[3px]">
              {kinds && [...kinds].slice(0, 3).map(t => (
                <span key={t} className="w-[3px] h-[3px] rounded-full"
                  style={{ background: isSel ? (dm ? '#8a8a94' : '#c9c9d1') : EVENT_COLORS[t] }} />
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
      {untimed.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-medium" style={{ color: muted }}>No time set</span>
          {untimed.map(ev => (
            <button key={ev.id} onClick={ev.onOpen}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-md text-[0.8rem] transition-opacity hover:opacity-75"
              style={{ background: `${EVENT_COLORS[ev.type]}1a`, color: dm ? '#e4e4e7' : '#33333a' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: EVENT_COLORS[ev.type] }} />
              <span className="truncate max-w-[150px]">{ev.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* The grid always renders. An empty day reads as an empty grid, which is
          faster to parse than a sentence saying the day is empty. */}
      <div className="relative" style={{ height: gridH }}>
        {hours.map(m => (
          <div key={m} className="absolute left-0 right-0 flex items-start" style={{ top: ((m - gridStart) / 60) * HOUR_H }}>
            <span className="w-[46px] flex-shrink-0 text-[0.68rem] -translate-y-1/2 pr-2.5 text-right tabular-nums"
              style={{ color: muted }}>{minToLabel(m)}</span>
            <div className="flex-1 h-px" style={{ background: line }} />
          </div>
        ))}
        {hours.slice(0, -1).map(m => (
          <div key={`h-${m}`} className="absolute right-0 h-px" style={{
            top: ((m + 30 - gridStart) / 60) * HOUR_H, left: 46,
            background: softLine,
          }} />
        ))}

        {isToday && nowMin >= gridStart && nowMin <= gridEnd && (
          <div className="absolute right-0 z-20 pointer-events-none flex items-center" style={{ left: 42, top: ((nowMin - gridStart) / 60) * HOUR_H }}>
            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 -translate-x-1/2" style={{ background: accent }} />
            <div className="flex-1 h-px" style={{ background: accent }} />
          </div>
        )}

        <div className="absolute inset-y-0 right-0" style={{ left: 52 }}>
          {timed.map(ev => {
            const top = ((ev.start - gridStart) / 60) * HOUR_H;
            const height = Math.max(((ev.end - ev.start) / 60) * HOUR_H, 24);
            const width = 100 / ev.cols;
            const compact = height < 40;   // a one-hour block still gets both lines
            return (
              <button key={ev.id} onClick={ev.onOpen}
                className="absolute rounded-md text-left overflow-hidden transition-opacity hover:opacity-85 z-10"
                style={{
                  top, height,
                  left: `calc(${ev.col * width}% + ${ev.col === 0 ? 0 : 2}px)`,
                  width: `calc(${width}% - ${ev.cols > 1 ? 2 : 0}px)`,
                  opacity: ev.status === 'completed' ? 0.5 : 1,
                  padding: compact ? '2px 7px' : '5px 8px',
                  ...blockStyle(ev),
                }}>
                {compact ? (
                  <p className="text-[0.8rem] truncate leading-tight">
                    <span className="tabular-nums" style={{ opacity: 0.85 }}>{ev.timeStr ? parseRange(ev.timeStr).start : ''}</span>{' '}
                    <span style={{ fontWeight: 500 }}>{ev.name}</span>
                  </p>
                ) : (
                  <>
                    <p className="text-[0.68rem] tabular-nums leading-tight" style={{ opacity: 0.85 }}>{ev.timeStr}</p>
                    <p className="text-[0.8rem] truncate leading-snug" style={{ fontWeight: 500 }}>{ev.name}</p>
                    {height >= 62 && <p className="text-[0.68rem] truncate leading-snug" style={{ opacity: 0.8 }}>{ev.detail}</p>}
                    {/* Needs a taller block than the service line, so it only
                        appears once there's genuinely room for a third row. */}
                    {height >= 80 && ev.location && (
                      <p className="text-[0.66rem] truncate leading-snug" style={{ opacity: 0.72 }}>◎ {ev.location}</p>
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
        <div className="flex mb-1.5">
          <span className="w-[34px] flex-shrink-0" />
          <div className="grid flex-1 min-w-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {perDay.map(({ d }) => {
              const k = keyOf(d);
              const isTod = k === todayKey;
              const isSel = k === dateKey;
              return (
                <button key={k} onClick={() => { onChangeDate(k); setView('day'); }}
                  className="flex flex-col items-center gap-0.5 py-0.5 min-w-0 select-none"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                  <span className="text-[0.68rem] font-medium" style={{ color: isTod ? accent : muted }}>
                    {DAYS[d.getDay()].charAt(0)}
                  </span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[0.8rem] tabular-nums"
                    style={isSel
                      ? { background: dm ? '#ECEDF1' : '#1a1a1f', color: dm ? '#111' : '#fff', fontWeight: 500 }
                      : { color: isTod ? accent : ink, fontWeight: isTod ? 600 : 400 }}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Anything without a time, pinned above its column */}
        {anyUntimed && (
          <div className="flex mb-1">
            <span className="w-[34px] flex-shrink-0" />
            <div className="grid flex-1 min-w-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {perDay.map(({ d, untimed: u }) => (
                <span key={keyOf(d)} className="px-[2px]">
                  {u.length > 0 && (
                    <button onClick={u[0].onOpen} title={u.map(e => e.name).join(', ')}
                      className="w-full h-[14px] rounded-[3px] transition-opacity hover:opacity-75"
                      style={{ background: `${EVENT_COLORS[u[0].type]}26`, border: `1px dashed ${EVENT_COLORS[u[0].type]}` }} />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="flex" style={{ height: totalH }}>
          <div className="w-[34px] flex-shrink-0 relative">
            {wHours.map((m, i) => (
              i % 2 === 0 ? (
                <span key={m} className="absolute right-1.5 text-[0.68rem] tabular-nums -translate-y-1/2"
                  style={{ top: ((m - ws) / 60) * WEEK_HOUR_H, color: muted }}>
                  {minToLabel(m).replace(' ', '')}
                </span>
              ) : null
            ))}
          </div>
          <div className="flex-1 min-w-0 relative">
            {/* Hour lines across all 7 columns */}
            {wHours.map(m => (
              <div key={m} className="absolute left-0 right-0 h-px"
                style={{ top: ((m - ws) / 60) * WEEK_HOUR_H, background: m % 120 === ws % 120 ? line : softLine }} />
            ))}
            <div className="grid absolute inset-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {perDay.map(({ d, timed: t }) => {
                const k = keyOf(d);
                const isTod = k === todayKey;
                return (
                  <div key={k} className="relative min-w-0" style={{ borderLeft: `1px solid ${softLine}` }}>
                    {isTod && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: dm ? 'rgba(196,132,154,0.07)' : 'rgba(196,132,154,0.06)' }} />
                    )}
                    {t.map(ev => {
                      const top = ((ev.start - ws) / 60) * WEEK_HOUR_H;
                      const height = Math.max(((ev.end - ev.start) / 60) * WEEK_HOUR_H, 9);
                      const width = 100 / ev.cols;
                      return (
                        <button key={ev.id} onClick={ev.onOpen}
                          title={[ev.timeStr || 'No time', ev.name, ev.detail, ev.location].filter(Boolean).join(' · ')}
                          className="absolute rounded-[3px] transition-opacity hover:opacity-75 z-10"
                          style={{
                            top, height,
                            left: `calc(${ev.col * width}% + 1px)`,
                            width: `calc(${width}% - 2px)`,
                            opacity: ev.status === 'completed' ? 0.45 : 1,
                            ...blockStyle(ev),
                          }} />
                      );
                    })}
                    {isTod && nowMin >= ws && nowMin <= we && (
                      <div className="absolute left-0 right-0 h-px z-20 pointer-events-none"
                        style={{ top: ((nowMin - ws) / 60) * WEEK_HOUR_H, background: accent }} />
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
        <div className="grid mb-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {DAYS.map(dl => (
            <span key={dl} className="text-center text-[0.68rem] font-medium py-1" style={{ color: muted }}>
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
              <button key={k} onClick={() => { onChangeDate(k); setView('day'); }}
                className="flex flex-col items-center gap-1 py-0.5 min-w-0 select-none"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[0.94rem] tabular-nums transition-colors"
                  style={isSel
                    ? { background: dm ? '#ECEDF1' : '#1a1a1f', color: dm ? '#111' : '#fff', fontWeight: 500 }
                    : { color: isTod ? accent : ink, fontWeight: isTod ? 600 : 400 }}>
                  {d}
                </span>
                {/* One bar per kind of thing booked that day: the more bars, the
                    fuller the day. Reads as density without a number to parse. */}
                <span className="flex items-center gap-[2px] h-[3px]">
                  {kinds && [...kinds].slice(0, 3).map(t => (
                    <span key={t} className="w-[7px] h-[3px] rounded-full" style={{ background: EVENT_COLORS[t] }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

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
        <div className="flex p-[3px] rounded-lg mb-3" style={{ background: dm ? '#1e1e24' : '#f4f0f2' }}>
          {['day', 'week', 'month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-1 rounded-md text-[0.8rem] transition-colors capitalize"
              style={view === v
                ? { background: surface, color: ink, fontWeight: 500, boxShadow: dm ? 'none' : '0 1px 2px rgba(40,25,35,0.08)' }
                : { color: muted, fontWeight: 400 }}>
              {v}
            </button>
          ))}
        </div>
      )}

      {activeView === 'day' && (
        <>
          {renderWeekStrip()}
          {renderDayGrid()}
        </>
      )}
      {activeView === 'week' && renderWeekGrid()}
      {activeView === 'month' && renderMonthGrid()}

      {/* ── Legend: one line, short labels ── */}
      <div className="flex items-center gap-x-3 gap-y-1 mt-4 pt-3 flex-wrap" style={{ borderTop: `1px solid ${line}` }}>
        {Object.entries(SHORT_LABELS).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5 text-[0.68rem]" style={{ color: muted }}>
            <span className="w-2 h-2 rounded-[3px] inline-block" style={{ background: EVENT_COLORS[k] }} /> {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[0.68rem]" style={{ color: muted }}>
          <span className="w-2 h-2 rounded-[3px] inline-block" style={{ border: `1.5px dashed ${muted}` }} /> Pending
        </span>
      </div>
    </div>
  );
}
