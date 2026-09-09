import { useRef } from 'react';
import { STATUS_COLORS, STATUS_COLORS_DM, CONSULT_INK } from './statusColors';

// The one month grid used by every admin calendar: the Calendar tab (full
// size) and the compact Home picker (dense). Keeping a single grid is the
// point — three different-looking calendars for the same data was the
// confusing part.
//
// The two sizes now hold DIFFERENT things on purpose, because they answer
// different questions:
//
//   Full size (Calendar tab) is the whole page, so a cell is wide enough for
//   real named chips and the reason a day is closed.
//
//   Dense (Home) sits in a narrow column beside the Appointments list. A 74px
//   cell can't hold a name — every chip in it was truncated to "Merc…" — so it
//   stopped trying. It's a picker: a date you can read, dots for what's on the
//   day, and the booking count. Tapping it fills the list beside it with the
//   full detail, which is where the names were always legible anyway.
//
// The grid always fits the screen width — no sideways scrolling to reach the
// 25th.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
export const OFF_RED = '#EF4444';
export const CLASS_PINK = '#C76BA6';
const ACCENT = '#C4849A';
const DOUBLE_TAP_MS = 340;

export const startTime = (t) => (t ? String(t).split(/[–-]/)[0].trim() : '');

export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Sunday of the week a date falls in — the week view renders from here.
export const weekStartOf = (d) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
};

export const dotOf = (ev, dm) =>
  ev.kind === 'consult' ? CONSULT_INK[dm ? 'dark' : 'light']
  : ev.kind === 'class' ? CLASS_PINK
  : (dm ? STATUS_COLORS_DM : STATUS_COLORS)[ev.status] || (dm ? '#52525b' : '#b6b6bf');

// Plain-words readout of a day, used as the cell tooltip.
export function daySummary(events, booked, cap) {
  const parts = [];
  if (cap != null) parts.push(`${booked} of ${cap} booked`);
  const consults = events.filter(e => e.kind === 'consult').length;
  const classes = events.filter(e => e.kind === 'class').length;
  if (consults) parts.push(`${consults} consultation${consults === 1 ? '' : 's'}`);
  if (classes) parts.push(`${classes} class${classes === 1 ? '' : 'es'}`);
  return parts.join(' · ');
}

function Checkbox({ on, dm }) {
  return (
    <span className="w-[15px] h-[15px] sm:w-[18px] sm:h-[18px] rounded-md flex items-center justify-center flex-shrink-0 transition-all"
      style={{
        background: on ? '#E05549' : 'transparent',
        border: `1.5px solid ${on ? '#E05549' : (dm ? '#52525b' : '#CFCFD8')}`,
      }}>
      {on && (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2 sm:w-2.5 sm:h-2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

export default function MonthCalendar({
  cur,                  // Date anywhere in the month to render
  weekOf = null,        // Date: render only that ONE week instead of the month
  evMap = {},           // 'YYYY-MM-DD' -> [event]
  offMap = {},          // 'YYYY-MM-DD' -> blocked_dates row
  todayKey,
  dm,
  capFor,               // (key) => capacity number, or undefined to hide the line
  bookedFor,            // (key) => bookings counting toward capacity
  dense = false,        // compact cells for the Home picker
  activeDay = null,     // day drawn as selected
  onOpenDay,            // (key) => void
  onDoubleActivate,     // (key) => void — double-click / double-tap a day
  selectMode = false,
  selectedDays,         // Set of keys, only in select mode
  onToggleDay,
  onEventClick,         // (event) => void; omit to make chips non-interactive
}) {
  const lastTap = useRef({ key: null, t: 0 });

  // Cells are Dates (or null spacers), so one renderer serves both the month
  // grid and a single week row that can straddle two months.
  const cells = [];
  if (weekOf) {
    const s = weekStartOf(weekOf);
    for (let i = 0; i < 7; i++) cells.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
  } else {
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
  }

  const maxChips = weekOf ? 6 : 4;

  // One handler for both, because a phone has no double-CLICK. A second tap on
  // the same day inside the window counts as a double.
  const activate = (key) => {
    const now = Date.now();
    const prev = lastTap.current;
    if (onDoubleActivate && !selectMode && prev.key === key && now - prev.t < DOUBLE_TAP_MS) {
      lastTap.current = { key: null, t: 0 };
      onDoubleActivate(key);
      return;
    }
    lastTap.current = { key, t: now };
    selectMode ? onToggleDay?.(key) : onOpenDay?.(key);
  };

  const cellPad = dense ? 'px-1 py-2 sm:py-2.5' : 'p-1.5 sm:p-2';
  const cellMinH = dense
    ? 'min-h-[66px] sm:min-h-[78px]'
    : (weekOf ? 'min-h-[104px] sm:min-h-[150px]' : 'min-h-[70px] sm:min-h-[118px] xl:min-h-[132px]');

  return (
    <>
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2">
        {DAYS.map((d, i) => (
          <div key={d} className="text-center text-[0.55rem] sm:text-[0.62rem] font-semibold py-1 uppercase tracking-widest"
            style={{ color: dm ? '#8e8e99' : '#bbb' }}>
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{DAYS_SHORT[i]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((date, idx) => {
          // Spacer, not a cell. Deliberately invisible: a filled grey box in
          // the run-up to the 1st reads as something you can tap.
          if (date === null) return <div key={`e-${idx}`} aria-hidden="true" />;

          const day = date.getDate();
          const key = dayKey(date);
          const events = evMap[key] || [];
          const isToday = key === todayKey;
          const offRow = offMap[key];
          const off = offRow != null;
          const reason = offRow?.reason || '';
          const picked = selectMode && selectedDays?.has(key);
          const isActive = !selectMode && activeDay === key;
          const cap = capFor?.(key);
          const booked = bookedFor?.(key) ?? 0;
          const full = cap != null && cap > 0 && booked >= cap;
          // A week row can cross a month boundary; those days stay readable but
          // sit back a little so the week you asked for reads first.
          const outside = weekOf ? date.getMonth() !== weekOf.getMonth() : false;

          const restBorder = picked ? '#E05549'
            : off ? (dm ? 'rgba(153,27,27,0.4)' : '#FECACA')
            : (dm ? '#2e2e38' : '#ECECF1');

          // Selected has to be unmistakable NEXT TO today, and it wasn't:
          // both wore a rose border and today wore the heavier one, so the day
          // she had just tapped looked like the less important of the two.
          //
          // Only the selected day gets the ring now, and today says today from
          // inside the cell — a ringed date badge in the dense grid, a rose
          // date in the full one. Two different signals instead of two weights
          // of the same one.
          const border = picked ? '#E05549'
            : isActive ? ACCENT
            : isToday ? (dm ? '#4a3a42' : '#F0DCE4')
            : restBorder;
          const ring = picked ? '0 0 0 1px #E05549'
            : isActive ? `0 0 0 1.5px ${ACCENT}` : 'none';

          const numColor = isActive ? '#fff'
            : off ? OFF_RED
            : isToday ? '#A0607A'
            : dense ? (dm ? '#c4c4cc' : '#55555f') : (dm ? '#a1a1aa' : '#9c9ca4');

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => activate(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectMode ? onToggleDay?.(key) : onOpenDay?.(key);
                }
              }}
              title={selectMode
                ? (off ? 'Already closed · tap to include in reopen' : 'Tap to include in the days you are closing')
                : `${daySummary(events, booked, cap) || 'Nothing scheduled'}${off ? ` · Day off${reason ? ` (${reason})` : ''}` : ''}${onDoubleActivate ? ' · double-tap to close this day' : ''}`}
              className={`group rounded-lg sm:rounded-xl ${cellPad} ${cellMinH} flex flex-col ${dense ? 'items-center gap-1' : 'gap-0.5 sm:gap-1'} cursor-pointer transition-colors outline-none select-none`}
              style={{
                touchAction: 'manipulation', // kills the iOS double-tap zoom
                opacity: outside ? 0.5 : 1,
                background: picked ? (dm ? 'rgba(224,85,73,0.16)' : '#FFF4F2')
                  : off ? (dm ? 'rgba(153,27,27,0.16)' : '#FEF5F4')
                  : isActive ? (dm ? 'rgba(196,132,154,0.09)' : '#FDF8FA')
                  : (dm ? '#26262e' : '#fff'),
                border: `1px solid ${border}`,
                boxShadow: ring,
              }}
              onMouseEnter={e => { if (!isToday && !picked && !isActive) e.currentTarget.style.borderColor = off ? OFF_RED : 'rgba(212,160,176,0.5)'; }}
              onMouseLeave={e => { if (!isToday && !picked && !isActive) e.currentTarget.style.borderColor = restBorder; }}
            >
              {dense ? (
                <>
                  {/* The date, in a badge big enough to tap and to read. Filled
                      when it's the day you picked, ringed when it's today. */}
                  <span className="flex items-center gap-1">
                    {selectMode && <Checkbox on={picked} dm={dm} />}
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[0.88rem] font-semibold tabular-nums leading-none"
                      style={{
                        color: numColor,
                        background: isActive ? ACCENT : 'transparent',
                        border: `1.5px solid ${isToday && !isActive ? ACCENT : 'transparent'}`,
                      }}>
                      {day}
                    </span>
                  </span>

                  {/* What's on the day. Dots, not names: a name never fit this
                      column, and the list beside the calendar spells the day
                      out in full the moment you tap it. Fixed height, so an
                      empty day is the same size as a busy one. */}
                  <span className="flex items-center justify-center gap-[3px] h-[7px]">
                    {off && (
                      <svg viewBox="0 0 24 24" fill="none" stroke={OFF_RED} strokeWidth="4" strokeLinecap="round" className="w-[9px] h-[9px]">
                        <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                    )}
                    {events.slice(0, 4).map(ev => (
                      <span key={ev.id} className="w-[6px] h-[6px] rounded-full" style={{ background: dotOf(ev, dm) }} />
                    ))}
                  </span>

                  {/* One line of words, and only when it has something to say:
                      how much of the day is spoken for, or that it's closed. */}
                  <span className="text-[0.6rem] font-semibold tabular-nums leading-none h-[9px]"
                    style={{ color: off ? OFF_RED : full ? '#E0795B' : (dm ? '#a1a1aa' : '#8a8a94') }}>
                    {off ? 'Off' : (cap != null && booked > 0) ? `${booked}/${cap}` : ''}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-0.5 sm:gap-1 px-0.5">
                    <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      {selectMode && <Checkbox on={picked} dm={dm} />}
                      <span className="text-[0.68rem] sm:text-[0.72rem] font-semibold tabular-nums leading-none flex-shrink-0"
                        style={{ color: off ? OFF_RED : isToday || isActive ? '#A0607A' : (dm ? '#a1a1aa' : '#9c9ca4') }}>{day}</span>
                    </span>
                    {/* Counts EVERY item on the day, so it never disagrees with
                        the booking line below. */}
                    {events.length > 0 && (
                      <span className="text-[0.52rem] sm:text-[0.58rem] font-semibold tabular-nums px-1 sm:px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: dm ? '#2e2e38' : '#F0F0F5', color: dm ? '#a1a1aa' : '#9c9ca4' }}>{events.length}</span>
                    )}
                  </div>

                  {/* Day off, with the reason she typed. Phones get the ✕ alone. */}
                  {/* The reason WRAPS. It used to truncate, which turned five
                      closed days into five cells reading "BOOKSY TIM...", with
                      the one word that would have explained them cut off. */}
                  {off && (
                    <div className="flex items-start gap-1 px-1 sm:px-1.5 py-1 rounded-md min-w-0"
                      style={{ background: dm ? 'rgba(153,27,27,0.3)' : '#FDE4E1' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={OFF_RED} strokeWidth="4" strokeLinecap="round" className="w-[7px] h-[7px] flex-shrink-0 mt-[3px]">
                        <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                      <span className="hidden sm:block text-[0.53rem] font-bold tracking-[0.06em] uppercase leading-[1.35] min-w-0"
                        style={{ color: dm ? '#fca5a5' : '#C0392B', overflowWrap: 'anywhere' }} title={reason || 'Day off'}>
                        {reason || 'Day off'}
                      </span>
                    </div>
                  )}

                  {/* Phones: coloured dots. Names never fit a 7-column phone
                      grid, and tapping the day lists them all in full. */}
                  {events.length > 0 && (
                    <div className="flex sm:hidden flex-wrap px-0.5 gap-[3px]">
                      {events.slice(0, 6).map(ev => (
                        <span key={ev.id} className="w-[5px] h-[5px] rounded-full" style={{ background: dotOf(ev, dm) }} />
                      ))}
                    </div>
                  )}

                  {/* Everything wider than a phone: the named chips */}
                  <div className="hidden sm:flex flex-col gap-1 min-w-0">
                    {events.slice(0, maxChips).map(ev => {
                      const dot = dotOf(ev, dm);
                      const cancelled = ev.kind === 'appt' && ev.status === 'cancelled';
                      return (
                        <div
                          key={ev.id}
                          role={onEventClick && !selectMode ? 'button' : undefined}
                          tabIndex={onEventClick && !selectMode ? 0 : undefined}
                          onClick={(e) => { e.stopPropagation(); if (!onEventClick || selectMode) return; onEventClick(ev); }}
                          onKeyDown={(e) => {
                            if (!onEventClick || selectMode) return;
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEventClick(ev); }
                          }}
                          className="w-full rounded-md text-left transition-colors outline-none px-1.5 py-1"
                          style={{
                            // A dot, not a coloured bar welded to the left edge.
                            background: dm ? '#2e2e38' : '#F5F5F9',
                            opacity: cancelled ? 0.55 : 1,
                            cursor: onEventClick && !selectMode ? 'pointer' : 'inherit',
                          }}
                          onMouseEnter={e => { if (onEventClick && !selectMode) e.currentTarget.style.background = dm ? '#3a3a44' : '#EBEBF3'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = dm ? '#2e2e38' : '#F5F5F9'; }}
                          title={`${ev.name}${ev.time ? ` · ${ev.time}` : ''} · ${ev.detail || ''}`}
                        >
                          {/* Name on its own line, time under it. Sharing one
                              line with a time and two badges left the name about
                              sixty pixels, which is why every client in the grid
                              read as "Merc...". The name is what makes a day
                              recognisable, so it gets the width and the rest
                              goes on the line below. */}
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: dot }} />
                            <span className="text-[0.68rem] font-medium truncate min-w-0"
                              style={{ color: dm ? '#e4e4e7' : '#333', textDecoration: cancelled ? 'line-through' : 'none' }}>
                              {ev.name}
                            </span>
                            {/* Bridal mark: a drawn dot, so it can't be read
                                as a full stop typed after the name. */}
                            {ev.bridal && <span className="w-[3px] h-[3px] rounded-full flex-shrink-0" style={{ background: '#A0607A' }} title="Bridal" />}
                          </span>
                          <span className="flex items-center gap-1 pl-[13px]">
                            {startTime(ev.time) && (
                              <span className="text-[0.6rem] font-semibold tabular-nums" style={{ color: dm ? '#8b8b95' : '#94949e' }}>
                                {startTime(ev.time)}
                              </span>
                            )}
                            {ev.source === 'booksy' && (
                              <span className="text-[0.5rem] font-bold tracking-[0.06em] uppercase px-1 py-px rounded flex-shrink-0"
                                style={{ background: dm ? 'rgba(14,165,175,0.18)' : '#E0F5F6', color: dm ? '#5EEAD4' : '#0E8F98' }}>B</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                    {events.length > maxChips && (
                      <span className="text-[0.58rem] pl-1.5 font-semibold" style={{ color: dm ? '#8e8e99' : '#9a9aa6' }}>
                        +{events.length - maxChips} more
                      </span>
                    )}
                  </div>

                  {/* Booking capacity, spelled out. Consultations and classes
                      are deliberately NOT in this number, which is why it says
                      "booked" rather than sitting bare as "0/4". */}
                  {cap != null && !off && (
                    <span className="mt-auto pl-0.5 text-[0.5rem] sm:text-[0.56rem] font-semibold tabular-nums tracking-wide whitespace-nowrap"
                      style={{ color: full ? '#E0795B' : booked > 0 ? (dm ? '#a1a1aa' : '#83838d') : (dm ? '#7a7a84' : '#c2c2cb') }}>
                      {full ? <><span className="hidden sm:inline">Fully booked</span><span className="sm:hidden">Full</span></>
                            : <>{booked}/{cap}<span className="hidden sm:inline"> booked</span></>}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
