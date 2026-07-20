import { useEffect, useMemo, useState } from 'react';
import { parseRange, apptToMin } from '@/lib/timeWindow';
import { EVENT_COLORS, EVENT_LABELS, isBridalService } from './statusColors';
import { classesOfReg } from '@/lib/classCatalog';

// Booksy-style day schedule: a week strip up top, then a real time grid where
// every appointment is a color-coded block sized by its time window. Blocks
// are colored by what they are (bridal, appointment, class, consultation);
// pending ones render hollow so unconfirmed time is obvious at a glance, and
// overlapping events split side by side like a proper calendar.
//
// `withViews` (used by the client-card drawer) adds a Day / Week / Month
// switcher on top of the same data; AdminCalendar keeps its own switcher and
// uses this component as day-only. The month name is always a button that
// opens a month + year jumper, so "get me to next March" is two taps.

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Default durations (minutes) when a booking only has a start time.
const DEFAULT_DUR = { bridal: 120, appt: 120, class: 90, consult: 30 };

const HOUR_H = 60; // px per hour

function minToLabel(min) {
  let h = Math.floor(min / 60);
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
  onSelectBooking, onSelectClassReg, dm, withViews = false,
}) {
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  const [view, setView] = useState('day');
  const [showJump, setShowJump] = useState(false);
  const [jumpYear, setJumpYear] = useState(() => new Date(dateKey + 'T00:00:00').getFullYear());

  // Keep the "now" line moving while the schedule is open.
  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60000);
    return () => clearInterval(t);
  }, []);

  const date = new Date(dateKey + 'T00:00:00');
  const todayKey = keyOf(new Date());
  const isToday = dateKey === todayKey;

  // ── Every event, grouped by date, built once ──
  // Day view, week agenda, and the month/strip dots all read from this map.
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

  // Which kinds of events each date has (for strip + month dots).
  const kindsByDate = useMemo(() => {
    const m = new Map();
    for (const [dk, evs] of eventsByDate) {
      const set = new Set();
      evs.forEach(ev => set.add(ev.type === 'bridal' ? 'appt' : ev.type));
      m.set(dk, set);
    }
    return m;
  }, [eventsByDate]);

  const hasConsultOn = (k) => kindsByDate.get(k)?.has('consult');
  const hasApptOn = (k) => { const s = kindsByDate.get(k); return s?.has('appt') || s?.has('class'); };

  // ── The shown day's events, laid out for the time grid ──
  const { timed, untimed } = useMemo(() => {
    const timed = [], untimed = [];
    for (const ev of (eventsByDate.get(dateKey) || [])) {
      if (ev.start == null) untimed.push(ev);
      else timed.push(ev);
    }
    return { timed: layoutEvents(timed), untimed };
  }, [eventsByDate, dateKey]);

  // ── Week strip days (Sun–Sat around the shown date) ──
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // ── Grid range: 7 AM–8 PM baseline, stretched to fit outliers ──
  let gridStart = 7 * 60, gridEnd = 20 * 60;
  for (const ev of timed) {
    gridStart = Math.min(gridStart, Math.floor(ev.start / 60) * 60);
    gridEnd = Math.max(gridEnd, Math.ceil(ev.end / 60) * 60);
  }
  if (isToday) {
    // Keep the now-line on the grid during working hours.
    if (nowMin > gridStart && nowMin < 22 * 60) gridEnd = Math.max(gridEnd, Math.ceil((nowMin + 30) / 60) * 60);
  }
  const hours = [];
  for (let m = gridStart; m <= gridEnd; m += 60) hours.push(m);
  const gridH = ((gridEnd - gridStart) / 60) * HOUR_H;

  const moveWeek = (dir) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dir * 7);
    onChangeDate(keyOf(d));
  };
  const moveMonth = (dir) => {
    const day = date.getDate();
    const target = new Date(date.getFullYear(), date.getMonth() + dir, 1);
    target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
    onChangeDate(keyOf(target));
  };
  const jumpTo = (monthIdx) => {
    const day = Math.min(date.getDate(), new Date(jumpYear, monthIdx + 1, 0).getDate());
    onChangeDate(keyOf(new Date(jumpYear, monthIdx, day)));
    setShowJump(false);
  };

  const line = dm ? '#2e2e38' : '#f0eae4';
  const softLine = dm ? '#26262e' : '#f7f2ee';
  const muted = dm ? '#71717a' : '#a8a8b1';

  // Month (and year) shown in the header — in day view it spans two months when
  // the week strip crosses one, so "what month am I in?" always has an answer.
  const stripFirst = weekDays[0], stripLast = weekDays[6];
  const monthLabel = (withViews && view !== 'day') || stripFirst.getMonth() === stripLast.getMonth()
    ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${stripFirst.toLocaleDateString('en-US', { month: 'short' })} – ${stripLast.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  const selectedLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const activeView = withViews ? view : 'day';

  // ── Shared pieces ──

  const eventChipStyle = (ev) => {
    const color = EVENT_COLORS[ev.type];
    if (ev.status === 'pending') {
      return { background: dm ? `${color}2e` : `${color}14`, color: dm ? '#e9dfe5' : color, border: `1.5px dashed ${color}` };
    }
    return {
      background: dm ? `${color}26` : `${color}14`,
      color: dm ? '#ECEDF1' : '#3a3038',
      border: `1px solid ${dm ? `${color}40` : `${color}2e`}`,
      borderLeft: `3px solid ${color}`,
    };
  };

  const renderWeekStrip = () => (
    <div className="flex items-center gap-1 mb-1">
      <button onClick={() => moveWeek(-1)} aria-label="Previous week"
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
        style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
      <div className="grid flex-1 min-w-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {weekDays.map(d => {
          const k = keyOf(d);
          const isSel = k === dateKey;
          const isTod = k === todayKey;
          return (
            <button key={k} onClick={() => onChangeDate(k)}
              className="flex flex-col items-center gap-1 py-1.5 min-w-0 select-none"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              <span className="text-[0.55rem] font-semibold tracking-[0.1em]"
                style={{ color: isTod ? '#E05B7F' : muted }}>{DAYS[d.getDay()]}</span>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-[0.9rem] font-semibold transition-all"
                style={isSel
                  ? { background: dm ? '#ECEDF1' : '#111', color: dm ? '#111' : '#fff' }
                  : { color: isTod ? '#E05B7F' : (dm ? '#d4d4d8' : '#333') }}>
                {d.getDate()}
              </span>
              <span className="flex items-center gap-[2px] h-1">
                {hasConsultOn(k) && <span className="w-1 h-1 rounded-full" title="Consultation" style={{ background: '#A855F7' }} />}
                {hasApptOn(k) && <span className="w-1 h-1 rounded-full" title="Appointment" style={{ background: dm ? '#8a6a76' : '#D4A0B0' }} />}
              </span>
            </button>
          );
        })}
      </div>
      <button onClick={() => moveWeek(1)} aria-label="Next week"
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
        style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
    </div>
  );

  const renderDayGrid = () => (
    <>
      {/* ── Untimed events ── */}
      {untimed.length > 0 && (
        <div className="mb-3 mt-2 rounded-xl px-3 py-2.5" style={{ background: dm ? '#26262e' : '#FAFAFB', border: `1px solid ${line}` }}>
          <p className="text-[0.55rem] font-bold tracking-[0.14em] uppercase mb-1.5" style={{ color: muted }}>No time set</p>
          <div className="flex flex-wrap gap-1.5">
            {untimed.map(ev => (
              <button key={ev.id} onClick={ev.onOpen}
                className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-[0.7rem] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
                style={{ background: `${EVENT_COLORS[ev.type]}1a`, color: dm ? '#e4e4e7' : '#333', border: `1px solid ${EVENT_COLORS[ev.type]}40` }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: EVENT_COLORS[ev.type] }} />
                <span className="truncate max-w-[160px]">{ev.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Time grid ── */}
      {timed.length === 0 && untimed.length === 0 ? (
        <div className="text-center py-10 mt-2">
          <p className="text-[0.85rem]" style={{ color: dm ? '#52525b' : '#bcbcc4' }}>Nothing scheduled this day</p>
        </div>
      ) : (
        <div className="relative mt-2" style={{ height: gridH }}>
          {/* Hour lines + labels */}
          {hours.map(m => (
            <div key={m} className="absolute left-0 right-0 flex items-start" style={{ top: ((m - gridStart) / 60) * HOUR_H }}>
              <span className="w-[52px] flex-shrink-0 text-[0.6rem] font-medium -translate-y-1/2 pr-2 text-right tabular-nums"
                style={{ color: muted }}>{minToLabel(m)}</span>
              <div className="flex-1 h-px" style={{ background: line }} />
            </div>
          ))}
          {/* Half-hour dashed lines */}
          {hours.slice(0, -1).map(m => (
            <div key={`h-${m}`} className="absolute right-0 h-px" style={{
              top: ((m + 30 - gridStart) / 60) * HOUR_H, left: 52,
              backgroundImage: `repeating-linear-gradient(90deg, ${softLine} 0 5px, transparent 5px 11px)`,
            }} />
          ))}

          {/* Now line */}
          {isToday && nowMin >= gridStart && nowMin <= gridEnd && (
            <div className="absolute right-0 z-20 pointer-events-none flex items-center" style={{ left: 46, top: ((nowMin - gridStart) / 60) * HOUR_H }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 -translate-x-1/2" style={{ background: '#E05B7F' }} />
              <div className="flex-1 h-[1.5px]" style={{ background: '#E05B7F' }} />
            </div>
          )}

          {/* Event blocks */}
          <div className="absolute inset-y-0 right-0" style={{ left: 58 }}>
            {timed.map(ev => {
              const top = ((ev.start - gridStart) / 60) * HOUR_H;
              const height = Math.max(((ev.end - ev.start) / 60) * HOUR_H, 26);
              const width = 100 / ev.cols;
              const color = EVENT_COLORS[ev.type];
              const isPending = ev.status === 'pending';
              const isDone = ev.status === 'completed';
              const compact = height < 48;
              const style = isPending
                ? {
                    background: dm ? `${color}2e` : `${color}16`,
                    color: dm ? '#e9dfe5' : color,
                    border: `1.5px dashed ${color}`,
                  }
                : {
                    background: color,
                    color: '#fff',
                    border: `1px solid ${dm ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)'}`,
                    boxShadow: dm ? 'none' : '0 1px 4px rgba(40,25,20,0.14)',
                  };
              return (
                <button key={ev.id} onClick={ev.onOpen}
                  className="absolute rounded-lg text-left overflow-hidden transition-all hover:opacity-90 active:scale-[0.99] z-10"
                  style={{
                    top, height,
                    left: `calc(${ev.col * width}% + ${ev.col === 0 ? 0 : 2}px)`,
                    width: `calc(${width}% - ${ev.cols > 1 ? 2 : 0}px)`,
                    opacity: isDone ? 0.55 : 1,
                    padding: compact ? '3px 8px' : '6px 9px',
                    ...style,
                  }}>
                  {compact ? (
                    <p className="text-[0.68rem] font-semibold truncate leading-tight">
                      <span className="tabular-nums">{ev.timeStr ? parseRange(ev.timeStr).start : ''}</span> {ev.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-[0.62rem] font-bold tracking-[0.02em] tabular-nums leading-tight" style={{ opacity: 0.92 }}>{ev.timeStr}</p>
                      <p className="text-[0.78rem] font-semibold truncate leading-snug mt-0.5">{ev.name}</p>
                      {height >= 66 && <p className="text-[0.65rem] truncate leading-snug" style={{ opacity: 0.82 }}>{ev.detail}</p>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  // ── Week agenda: the 7 days as tappable sections with their events ──
  const renderWeekAgenda = () => (
    <div className="flex flex-col gap-1 mt-1">
      {weekDays.map(d => {
        const k = keyOf(d);
        const isTod = k === todayKey;
        const isSel = k === dateKey;
        const evs = (eventsByDate.get(k) || []).slice()
          .sort((a, b) => (a.start ?? 24 * 60 + 1) - (b.start ?? 24 * 60 + 1));
        return (
          <div key={k} className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${isSel ? (dm ? '#4a3a42' : '#E8CDD8') : line}`, background: dm ? '#1a1a20' : '#fff' }}>
            <button onClick={() => { onChangeDate(k); setView('day'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:opacity-85"
              style={{ background: isSel ? (dm ? 'rgba(196,132,154,0.1)' : '#FDF6F9') : 'transparent' }}>
              <span className="w-8 h-8 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                style={isTod ? { background: '#E05B7F', color: '#fff' } : { background: dm ? '#26262e' : '#F7F2EE', color: dm ? '#d4d4d8' : '#555' }}>
                <span className="text-[0.78rem] font-bold leading-none tabular-nums">{d.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.74rem] font-semibold" style={{ color: isTod ? '#E05B7F' : (dm ? '#ECEDF1' : '#111') }}>
                  {d.toLocaleDateString('en-US', { weekday: 'long' })}{isTod ? ' · Today' : ''}
                </span>
                <span className="block text-[0.6rem] mt-[1px]" style={{ color: muted }}>
                  {evs.length === 0 ? 'Free day' : `${evs.length} ${evs.length === 1 ? 'event' : 'events'}`}
                </span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" className="w-3 h-3 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {evs.length > 0 && (
              <div className="px-3 pb-2.5 flex flex-col gap-1">
                {evs.map(ev => (
                  <button key={ev.id} onClick={ev.onOpen}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:opacity-85 active:scale-[0.99]"
                    style={eventChipStyle(ev)}>
                    <span className="text-[0.62rem] font-bold tabular-nums flex-shrink-0" style={{ opacity: 0.85, minWidth: 52 }}>
                      {ev.start != null ? parseRange(ev.timeStr).start : 'No time'}
                    </span>
                    <span className="text-[0.72rem] font-semibold truncate flex-1 min-w-0">{ev.name}</span>
                    <span className="text-[0.6rem] truncate flex-shrink-0 max-w-[38%]" style={{ opacity: 0.7 }}>{ev.detail}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Month grid: dots per day, tap a day to open it ──
  const renderMonthGrid = () => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return (
      <div className="mt-1">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => moveMonth(-1)} aria-label="Previous month"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
          <p className="text-[0.78rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>
            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <button onClick={() => moveMonth(1)} aria-label="Next month"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
        </div>
        <div className="grid mb-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {DAYS.map(dl => (
            <span key={dl} className="text-center text-[0.52rem] font-semibold tracking-[0.1em] py-1" style={{ color: muted }}>{dl}</span>
          ))}
        </div>
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={`e-${i}`} />;
            const k = keyOf(new Date(date.getFullYear(), date.getMonth(), d));
            const isSel = k === dateKey;
            const isTod = k === todayKey;
            const kinds = kindsByDate.get(k);
            return (
              <button key={k} onClick={() => { onChangeDate(k); setView('day'); }}
                className="flex flex-col items-center gap-0.5 py-1 min-w-0 select-none"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[0.8rem] font-semibold transition-all tabular-nums"
                  style={isSel
                    ? { background: dm ? '#ECEDF1' : '#111', color: dm ? '#111' : '#fff' }
                    : { color: isTod ? '#E05B7F' : (dm ? '#d4d4d8' : '#333') }}>
                  {d}
                </span>
                <span className="flex items-center gap-[2px] h-1">
                  {kinds?.has('consult') && <span className="w-1 h-1 rounded-full" style={{ background: EVENT_COLORS.consult }} />}
                  {(kinds?.has('appt')) && <span className="w-1 h-1 rounded-full" style={{ background: dm ? '#8a6a76' : '#D4A0B0' }} />}
                  {kinds?.has('class') && <span className="w-1 h-1 rounded-full" style={{ background: EVENT_COLORS.class }} />}
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
      {/* ── Header: tappable month + year (opens the jumper) ── */}
      <div className="flex items-end justify-between gap-2 mb-2 px-1">
        <div className="min-w-0">
          <button onClick={() => { setJumpYear(date.getFullYear()); setShowJump(v => !v); }}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-75"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            <span className="font-serif text-[1.15rem] leading-tight" style={{ color: dm ? '#ECEDF1' : '#111' }}>{monthLabel}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.2" className="w-3.5 h-3.5 mt-0.5"
              style={{ transition: 'transform 200ms ease', transform: showJump ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <p className="text-[0.68rem] mt-0.5" style={{ color: isToday ? '#E05B7F' : muted }}>{isToday ? `Today · ${selectedLabel}` : selectedLabel}</p>
        </div>
        {!isToday && (
          <button onClick={() => onChangeDate(todayKey)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[0.62rem] font-bold tracking-[0.06em] uppercase transition-all active:scale-95"
            style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#d4d4d8' : '#6B4055', border: `1px solid ${line}` }}>
            Today
          </button>
        )}
      </div>

      {/* ── Month + year jumper ── */}
      {showJump && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowJump(false)} aria-hidden="true" />
          <div className="absolute left-1 right-1 z-50 rounded-2xl p-3.5"
            style={{
              top: '2.6rem',
              background: dm ? '#27272a' : '#fff',
              border: `1px solid ${dm ? '#3f3f46' : '#eadfe4'}`,
              boxShadow: dm ? '0 18px 48px rgba(0,0,0,0.5)' : '0 18px 48px rgba(60,30,45,0.18)',
            }}>
            <div className="flex items-center justify-between mb-2.5">
              <button onClick={() => setJumpYear(y => y - 1)} aria-label="Previous year"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
              <p className="text-[0.9rem] font-bold tabular-nums" style={{ color: dm ? '#ECEDF1' : '#111' }}>{jumpYear}</p>
              <button onClick={() => setJumpYear(y => y + 1)} aria-label="Next year"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTHS.map((m, i) => {
                const isCur = jumpYear === date.getFullYear() && i === date.getMonth();
                const isNow = jumpYear === new Date().getFullYear() && i === new Date().getMonth();
                return (
                  <button key={m} onClick={() => jumpTo(i)}
                    className="py-2 rounded-lg text-[0.72rem] font-semibold transition-all active:scale-95"
                    style={isCur
                      ? { background: dm ? '#ECEDF1' : '#111', color: dm ? '#111' : '#fff' }
                      : { background: dm ? '#1e1e24' : '#FAF7F5', color: isNow ? '#E05B7F' : (dm ? '#d4d4d8' : '#444'), border: `1px solid ${line}` }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Day / Week / Month switcher (drawer only) ── */}
      {withViews && (
        <div className="flex p-0.5 rounded-full mb-2.5" style={{ background: dm ? '#1e1e24' : '#F5EFF1', border: `1px solid ${line}` }}>
          {['day', 'week', 'month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-1.5 rounded-full text-[0.62rem] font-bold tracking-[0.08em] uppercase transition-all"
              style={view === v
                ? { background: dm ? '#ECEDF1' : '#fff', color: dm ? '#111' : '#6B4055', boxShadow: '0 1px 4px rgba(60,30,45,0.14)' }
                : { color: muted }}>
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
      {activeView === 'week' && renderWeekAgenda()}
      {activeView === 'month' && renderMonthGrid()}

      {/* ── Legend ── */}
      <div className="flex items-center gap-x-4 gap-y-1.5 mt-4 pt-3 flex-wrap" style={{ borderTop: `1px solid ${line}` }}>
        {Object.entries(EVENT_LABELS).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: muted }}>
            <span className="w-2.5 h-2.5 rounded-[4px] inline-block" style={{ background: EVENT_COLORS[k] }} /> {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: muted }}>
          <span className="w-2.5 h-2.5 rounded-[4px] inline-block" style={{ border: `1.5px dashed ${muted}` }} /> Pending
        </span>
      </div>
    </div>
  );
}
