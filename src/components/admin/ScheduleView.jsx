import { useEffect, useMemo, useState } from 'react';
import { parseRange, apptToMin } from '@/lib/timeWindow';
import { EVENT_COLORS, EVENT_LABELS, isBridalService } from './statusColors';
import { classesOfReg } from '@/lib/classCatalog';

// Booksy-style day schedule: a week strip up top, then a real time grid where
// every appointment is a color-coded block sized by its time window. Blocks
// are colored by what they are (bridal, appointment, class, consultation);
// pending ones render hollow so unconfirmed time is obvious at a glance, and
// overlapping events split side by side like a proper calendar.

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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
  onSelectBooking, onSelectClassReg, dm,
}) {
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });

  // Keep the "now" line moving while the schedule is open.
  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60000);
    return () => clearInterval(t);
  }, []);

  const date = new Date(dateKey + 'T00:00:00');
  const todayKey = keyOf(new Date());
  const isToday = dateKey === todayKey;

  // ── Week strip days (Sun–Sat around the shown date) ──
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Dates in this week that have something scheduled (for the strip dots).
  // Split by kind so a consultation day gets its own purple dot, matching the
  // month/week grids — Roko can spot consult days without opening them.
  const { apptDates, consultDates } = useMemo(() => {
    const appt = new Set(), consult = new Set();
    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date) appt.add(b.date);
      if (b.consultation_date) consult.add(b.consultation_date);
    });
    classRegs.forEach(r => { if (r.appointment_date && r.status !== 'cancelled') appt.add(r.appointment_date); });
    return { apptDates: appt, consultDates: consult };
  }, [bookings, classRegs]);

  // ── Build the day's events ──
  const { timed, untimed } = useMemo(() => {
    const all = [];
    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date === dateKey) {
        const type = isBridalService(b.service) ? 'bridal' : 'appt';
        all.push({
          id: `a-${b.id}`, type, name: b.name || 'Client', detail: b.service || 'Appointment',
          timeStr: b.time || '', status: b.status || 'pending',
          onOpen: () => onSelectBooking?.(b),
        });
      }
      if (b.consultation_date === dateKey) {
        all.push({
          id: `c-${b.id}`, type: 'consult', name: b.name || 'Client',
          detail: `${b.consultation_type || 'Zoom'} consultation`,
          timeStr: b.consultation_time || '', status: b.status || 'pending',
          onOpen: () => onSelectBooking?.(b),
        });
      }
    });
    classRegs.forEach(r => {
      if (r.status === 'cancelled' || r.appointment_date !== dateKey) return;
      const cls = classesOfReg(r)[0];
      const fmtTag = r.class_format === 'in_person' ? ' · Studio' : r.class_format === 'online' ? ' · Zoom' : '';
      all.push({
        id: `l-${r.id}`, type: 'class', name: r.full_name || 'Client',
        detail: (cls ? cls.title.replace('Makeup ', '') : 'Makeup Class') + fmtTag,
        timeStr: r.appointment_time || '', status: r.status === 'enrolled' ? 'confirmed' : (r.status || 'pending'),
        onOpen: () => onSelectClassReg?.(r),
      });
    });

    const timed = [], untimed = [];
    for (const ev of all) {
      const { start, end } = parseRange(ev.timeStr);
      const s = apptToMin(start);
      if (s == null) { untimed.push(ev); continue; }
      let e = apptToMin(end);
      if (e == null || e <= s) e = Math.min(s + (DEFAULT_DUR[ev.type] || 90), 24 * 60);
      ev.start = s;
      ev.end = e;
      timed.push(ev);
    }
    return { timed: layoutEvents(timed), untimed };
  }, [bookings, classRegs, dateKey, onSelectBooking, onSelectClassReg]);

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

  const line = dm ? '#2e2e38' : '#f0eae4';
  const softLine = dm ? '#26262e' : '#f7f2ee';
  const muted = dm ? '#71717a' : '#a8a8b1';

  // Month (and year) the strip is showing — spans two months when the week
  // crosses one, so "what month am I in?" always has an answer on screen.
  const stripFirst = weekDays[0], stripLast = weekDays[6];
  const monthLabel = stripFirst.getMonth() === stripLast.getMonth()
    ? stripFirst.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${stripFirst.toLocaleDateString('en-US', { month: 'short' })} – ${stripLast.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  const selectedLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* ── Month header ── */}
      <div className="flex items-end justify-between gap-2 mb-2 px-1">
        <div className="min-w-0">
          <p className="font-serif text-[1.15rem] leading-tight" style={{ color: dm ? '#ECEDF1' : '#111' }}>{monthLabel}</p>
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

      {/* ── Week strip ── */}
      <div className="flex items-center gap-1 mb-1">
        <button onClick={() => moveWeek(-1)} aria-label="Previous week"
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
        <div className="grid flex-1 min-w-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {weekDays.map(d => {
            const k = keyOf(d);
            const isSel = k === dateKey;
            const isTod = k === todayKey;
            const hasConsult = consultDates.has(k);
            const hasAppt = apptDates.has(k);
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
                  {hasConsult && <span className="w-1 h-1 rounded-full" title="Consultation" style={{ background: '#A855F7' }} />}
                  {hasAppt && <span className="w-1 h-1 rounded-full" title="Appointment" style={{ background: dm ? '#8a6a76' : '#D4A0B0' }} />}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={() => moveWeek(1)} aria-label="Next week"
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
      </div>

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
