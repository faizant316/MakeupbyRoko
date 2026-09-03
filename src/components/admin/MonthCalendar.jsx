import { useRef } from 'react';
import { STATUS_COLORS, STATUS_COLORS_DM, CONSULT_INK } from './statusColors';

// The one month grid used by every admin calendar: the Calendar tab and the
// compact Home picker (dense). Keeping a single grid is the point — three
// different-looking calendars for the same data was the confusing part.
//
// Two things share each cell and used to get conflated: bookings count toward
// the day's capacity, consultations and classes do not. So the corner pill
// counts EVERYTHING on the day, and a separate footer line says how much of
// the booking capacity is used. Neither number contradicts the other.
//
// The grid always fits the screen width — no sideways scrolling to reach the
// 25th. Phones get dots instead of named chips (a 50px column can't hold a
// name); tapping the day shows the full list in the panel.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
export const OFF_RED = '#EF4444';
export const CLASS_PINK = '#C76BA6';
const DOUBLE_TAP_MS = 340;

export const startTime = (t) => (t ? String(t).split(/[–-]/)[0].trim() : '');

export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  );
}

// The month stepper. It renders up in the page header on the Calendar tab —
// arrows belong at the top of the screen where you look first, not tucked in a
// small row halfway down beside the grid.
export function MonthNav({ month, onStep, onToday, dm, className = '' }) {
  const label = month.toLocaleString('default', { month: 'long', year: 'numeric' });
  const btn = 'w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 active:scale-90';
  const btnStyle = {
    background: dm ? '#26262e' : '#fff',
    border: `1px solid ${dm ? '#34343d' : '#E9E9F0'}`,
    color: dm ? '#a1a1aa' : '#77777f',
  };
  const hoverIn = (e) => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#A0607A'; };
  const hoverOut = (e) => { e.currentTarget.style.borderColor = dm ? '#34343d' : '#E9E9F0'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#77777f'; };
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <button type="button" onClick={() => onStep(-1)} className={btn} style={btnStyle}
        onMouseEnter={hoverIn} onMouseLeave={hoverOut} aria-label="Previous month">
        <Chevron dir="left" />
      </button>
      <span className="font-serif text-center tabular-nums text-[1rem] sm:text-[1.12rem] flex-1 sm:flex-none min-w-[126px] sm:min-w-[152px]"
        style={{ color: dm ? '#e4e4e7' : '#111' }}>
        {label}
      </span>
      <button type="button" onClick={() => onStep(1)} className={btn} style={btnStyle}
        onMouseEnter={hoverIn} onMouseLeave={hoverOut} aria-label="Next month">
        <Chevron dir="right" />
      </button>
      <button type="button" onClick={onToday}
        className="h-9 px-3 sm:px-3.5 ml-0.5 sm:ml-1 rounded-xl text-[0.64rem] font-semibold tracking-[0.1em] uppercase transition-all flex-shrink-0 active:scale-95"
        style={{ background: dm ? 'rgba(212,160,176,0.14)' : '#F6EEF2', color: dm ? '#d8b4c2' : '#A0607A' }}>
        Today
      </button>
    </div>
  );
}

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

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // The Home grid is a picker sitting in a narrow column, with the full detail
  // already listed beside it — so it shows one name and a count of the rest,
  // in bigger type, instead of cramming the day into a 74px box.
  const maxChips = dense ? 1 : 4;

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

  const cellPad = dense ? 'p-2 sm:p-2.5' : 'p-1.5 sm:p-2';
  // The Calendar tab now spends its vertical budget on the grid instead of on
  // blurb and stat cards, so the cells get to breathe.
  //
  // The Home grid used to be the tighter of the two (56/92px) on the theory
  // that a side column should stay small. It read as cramped rather than
  // compact: four lines of 10px type stacked in a 64px-wide box. It is the
  // calendar Roko actually looks at every morning, so it now gets MORE room
  // per cell than the full-page one and spends it on fewer, larger things.
  const cellMinH = dense ? 'min-h-[72px] sm:min-h-[120px]' : 'min-h-[70px] sm:min-h-[114px] xl:min-h-[126px]';

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
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="rounded-lg sm:rounded-xl" style={{ background: dm ? 'rgba(255,255,255,0.015)' : '#FBFBFD' }} />;
          }
          const key = `${monthPrefix}-${pad(day)}`;
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

          const restBorder = picked ? '#E05549'
            : isActive ? '#D4A0B0'
            : off ? (dm ? 'rgba(153,27,27,0.4)' : '#FECACA')
            : (dm ? '#2e2e38' : '#ECECF1');

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
              className={`group rounded-lg sm:rounded-xl ${cellPad} ${cellMinH} flex flex-col gap-0.5 sm:gap-1 cursor-pointer transition-colors outline-none select-none`}
              style={{
                touchAction: 'manipulation', // kills the iOS double-tap zoom
                background: picked ? (dm ? 'rgba(224,85,73,0.16)' : '#FFF4F2')
                  : off ? (dm ? 'rgba(153,27,27,0.16)' : '#FEF5F4')
                  : (dm ? '#26262e' : '#fff'),
                border: `1px solid ${isToday && !picked ? '#D4A0B0' : restBorder}`,
                boxShadow: picked ? '0 0 0 1px #E05549' : isToday ? '0 0 0 1px #D4A0B0' : 'none',
              }}
              onMouseEnter={e => { if (!isToday && !picked) e.currentTarget.style.borderColor = off ? OFF_RED : 'rgba(212,160,176,0.5)'; }}
              onMouseLeave={e => { if (!isToday && !picked) e.currentTarget.style.borderColor = restBorder; }}
            >
              <div className="flex items-center justify-between gap-0.5 sm:gap-1 px-0.5">
                <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  {selectMode && <Checkbox on={picked} dm={dm} />}
                  <span className={`${dense ? 'text-[0.85rem] sm:text-[0.98rem]' : 'text-[0.68rem] sm:text-[0.72rem]'} font-semibold tabular-nums leading-none flex-shrink-0`}
                    style={{ color: isToday ? '#A0607A' : off ? OFF_RED : dense ? (dm ? '#c4c4cc' : '#6b6b76') : (dm ? '#a1a1aa' : '#9c9ca4') }}>{day}</span>
                </span>
                {/* Counts EVERY item on the day, so it never disagrees with the
                    booking line below. Not on the Home grid at any width: the
                    chip and its "+N more" say it there on a laptop, the dots
                    say it on a phone, and on a phone it was also stealing the
                    line the date needs. */}
                {events.length > 0 && !dense && (
                  <span className="text-[0.52rem] sm:text-[0.58rem] font-semibold tabular-nums px-1 sm:px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: dm ? '#2e2e38' : '#F0F0F5', color: dm ? '#a1a1aa' : '#9c9ca4' }}>{events.length}</span>
                )}
              </div>

              {/* Day off, with the reason she typed. Phones get the ✕ alone. */}
              {off && (
                <div className="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-md min-w-0"
                  style={{ background: dm ? 'rgba(153,27,27,0.3)' : '#FDE4E1' }}>
                  <span className="text-[0.55rem] sm:text-[0.6rem] leading-none flex-shrink-0" style={{ color: OFF_RED }}>✕</span>
                  <span className={`hidden sm:block ${dense ? 'text-[0.58rem]' : 'text-[0.53rem]'} font-bold tracking-[0.08em] uppercase truncate`}
                    style={{ color: dm ? '#fca5a5' : '#C0392B' }} title={reason || 'Day off'}>
                    {reason || 'Day off'}
                  </span>
                </div>
              )}

              {/* Phones: coloured dots. Names never fit a 7-column phone grid,
                  and tapping the day lists them all in full underneath. */}
              {events.length > 0 && (
                <div className={`flex sm:hidden flex-wrap px-0.5 ${dense ? 'gap-1' : 'gap-[3px]'}`}>
                  {events.slice(0, 6).map(ev => (
                    <span key={ev.id} className={dense ? 'w-1.5 h-1.5 rounded-full' : 'w-[5px] h-[5px] rounded-full'} style={{ background: dotOf(ev, dm) }} />
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
                      className={`w-full rounded-md text-left transition-colors outline-none ${dense ? 'px-2 py-1.5' : 'flex items-center gap-1.5 px-1.5 py-1'}`}
                      style={{
                        // A dot, not a coloured bar welded to the left edge.
                        // The bar was the same decoration the booking rows
                        // carried, and it fought the chip's own rounded corner
                        // every time. A dot states the status just as clearly
                        // and lets the chip keep its shape.
                        background: dm ? '#2e2e38' : '#F5F5F9',
                        opacity: cancelled ? 0.55 : 1,
                        cursor: onEventClick && !selectMode ? 'pointer' : 'inherit',
                      }}
                      onMouseEnter={e => { if (onEventClick && !selectMode) e.currentTarget.style.background = dm ? '#3a3a44' : '#EBEBF3'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = dm ? '#2e2e38' : '#F5F5F9'; }}
                      title={`${ev.name}${ev.time ? ` · ${ev.time}` : ''} · ${ev.detail || ''}`}
                    >
                      {/* Home stacks time over name. One line could only ever
                          fit the time plus a mystery badge in a 64px column --
                          the name, the one thing that makes a day
                          recognisable, was always what got truncated away.
                          Two lines fit both at a size worth reading. */}
                      <div className={dense ? 'flex items-center gap-1.5 min-w-0' : 'contents'}>
                        <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: dot }} />
                        {startTime(ev.time) && (
                          <span className={`${dense ? 'text-[0.68rem]' : 'text-[0.62rem]'} font-semibold tabular-nums flex-shrink-0`} style={{ color: dm ? '#8b8b95' : '#8e8e99' }}>
                            {startTime(ev.time)}
                          </span>
                        )}
                        {!dense && (
                          <>
                            <span className="text-[0.68rem] font-medium truncate flex-1 min-w-0"
                              style={{ color: dm ? '#e4e4e7' : '#333', textDecoration: cancelled ? 'line-through' : 'none' }}>
                              {ev.name}
                              {ev.bridal && <span className="ml-1" style={{ color: '#A0607A' }} title="Bridal">·</span>}
                            </span>
                            {ev.source === 'booksy' && (
                              <span className="text-[0.5rem] font-bold tracking-[0.06em] uppercase px-1 py-px rounded flex-shrink-0"
                                style={{ background: dm ? 'rgba(14,165,175,0.18)' : '#E0F5F6', color: dm ? '#5EEAD4' : '#0E8F98' }}>B</span>
                            )}
                          </>
                        )}
                      </div>
                      {dense && (
                        <span className="block text-[0.76rem] font-medium truncate mt-0.5"
                          style={{ color: dm ? '#e4e4e7' : '#2c2c34', textDecoration: cancelled ? 'line-through' : 'none' }}>
                          {ev.name}
                        </span>
                      )}
                    </div>
                  );
                })}
                {events.length > maxChips && (
                  <span className={`${dense ? 'text-[0.66rem] pl-2' : 'text-[0.58rem] pl-1.5'} font-semibold`} style={{ color: dm ? '#8e8e99' : '#9a9aa6' }}>
                    +{events.length - maxChips} more
                  </span>
                )}
              </div>

              {/* Booking capacity, spelled out. Consultations and classes are
                  deliberately NOT in this number, which is why it says
                  "booked" rather than sitting bare as "0/4". On Home an empty
                  day stays empty: thirty grey "0/4 booked" lines were most of
                  what made that grid look busy. */}
              {cap != null && !off && (!dense || booked > 0) && (
                <span className={`mt-auto pl-0.5 ${dense ? 'text-[0.58rem] sm:text-[0.62rem]' : 'text-[0.5rem] sm:text-[0.56rem]'} font-semibold tabular-nums tracking-wide whitespace-nowrap`}
                  style={{ color: full ? '#E0795B' : booked > 0 ? (dm ? '#a1a1aa' : '#83838d') : (dm ? '#7a7a84' : '#c2c2cb') }}>
                  {full ? <><span className="hidden sm:inline">Fully booked</span><span className="sm:hidden">Full</span></>
                        : <>{booked}/{cap}<span className="hidden sm:inline"> booked</span></>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
