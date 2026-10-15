import { useRef } from 'react';
import { STATUS_COLORS, STATUS_COLORS_DM, CONSULT_INK, BLOCK_INK, blockHatch } from './statusColors';
import { cx } from './ui';

// The one month grid used by every admin calendar: the Calendar tab (full
// size) and the compact Home picker (dense). Keeping a single grid is the
// point: three different-looking calendars for the same data was the
// confusing part.
//
// The two sizes now hold DIFFERENT things on purpose, because they answer
// different questions:
//
//   Full size (Calendar tab) is the whole page, so a cell is wide enough for
//   real named chips and the reason a day is closed.
//
//   Dense (Home) sits in a narrow column beside the Appointments list. A 74px
//   cell can't hold a name (every chip in it was truncated to "Merc…"), so it
//   stopped trying. It's a picker: a date you can read, dots for what's on the
//   day, and the booking count. Tapping it fills the list beside it with the
//   full detail, which is where the names were always legible anyway.
//
// The grid always fits the screen width: no sideways scrolling to reach the
// 25th. Cells are square tiles on hairlines, the same as the Week strip on
// Home, so the two views read as one calendar.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
export const CLASS_PINK = '#C76BA6';
const DOUBLE_TAP_MS = 340;

export const startTime = (t) => (t ? String(t).split(/[–-]/)[0].trim() : '');

export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Sunday of the week a date falls in. The week view renders from here.
export const weekStartOf = (d) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
};

export const dotOf = (ev, dm) =>
  ev.kind === 'block' ? BLOCK_INK[dm ? 'dark' : 'light']
  : ev.kind === 'consult' ? CONSULT_INK[dm ? 'dark' : 'light']
  : ev.kind === 'class' ? CLASS_PINK
  : (dm ? STATUS_COLORS_DM : STATUS_COLORS)[ev.status] || 'rgb(var(--c-line-strong))';

// Plain-words readout of a day, used as the cell tooltip.
export function daySummary(events, booked, cap) {
  const parts = [];
  if (cap != null) parts.push(`${booked} of ${cap} booked`);
  const consults = events.filter(e => e.kind === 'consult').length;
  const classes = events.filter(e => e.kind === 'class').length;
  const blocks = events.filter(e => e.kind === 'block').length;
  if (consults) parts.push(`${consults} consultation${consults === 1 ? '' : 's'}`);
  if (classes) parts.push(`${classes} class${classes === 1 ? '' : 'es'}`);
  if (blocks) parts.push(`${blocks} blocked`);
  return parts.join(' · ');
}

function OffCross({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className={className} aria-hidden>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

// Select mode's tick box. Red, because every day ticked here is a day about
// to be closed.
function Checkbox({ on }) {
  return (
    <span className={cx(
      'flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-colors duration-150 sm:h-[18px] sm:w-[18px]',
      on ? 'border-tone-alert bg-tone-alert text-paper' : 'border-line-strong',
    )}>
      {on && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="h-2 w-2 sm:h-2.5 sm:w-2.5" aria-hidden>
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
  onDoubleActivate,     // (key) => void: double-click / double-tap a day
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

  // A phone's full-size cell is ~43px wide, so the side padding gives way to
  // the date and its count.
  const cellPad = dense ? 'px-1 py-2 sm:py-2.5' : 'px-0.5 py-1 sm:p-2';
  const cellMinH = dense
    ? 'min-h-[66px] sm:min-h-[78px]'
    : (weekOf ? 'min-h-[104px] sm:min-h-[150px]' : 'min-h-[70px] sm:min-h-[118px] xl:min-h-[132px]');

  return (
    <>
      <div className="mb-1.5 grid grid-cols-7 gap-1 sm:mb-2 sm:gap-1.5">
        {DAYS.map((d, i) => (
          <div key={d} className="py-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{DAYS_SHORT[i]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
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

          // Selected has to be unmistakable NEXT TO today, and it wasn't:
          // both wore a rose border and today wore the heavier one, so the day
          // she had just tapped looked like the less important of the two.
          //
          // Only the selected day changes the cell now (ink, the way the Week
          // strip fills its chosen day), and today says today from inside the
          // cell with a ringed date. Two different signals instead of two
          // weights of the same one.
          const tone = picked ? 'border-tone-alert bg-tone-alert/[0.06]'
            : isActive ? (dense ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper shadow-[inset_0_0_0_1px_rgb(var(--c-ink))]')
            : off ? 'border-tone-alert/25 bg-tone-alert/[0.05] hover:border-tone-alert/50'
            : 'border-line bg-paper hover:border-ink/30';

          // Filled cell, so everything inside it switches to paper.
          const inked = dense && isActive;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-pressed={selectMode ? !!picked : isActive}
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
              className={cx(
                // touch-manipulation kills the iOS double-tap zoom.
                'group flex min-w-0 cursor-pointer touch-manipulation select-none flex-col rounded-ctl border transition-[border-color,background-color,box-shadow] duration-200',
                cellPad, cellMinH, tone,
                dense ? 'press items-center gap-1' : 'gap-0.5 sm:gap-1',
                outside && 'opacity-50',
              )}
            >
              {dense ? (
                <>
                  {/* The date, in a badge big enough to tap and to read. The
                      cell fills when it's the day you picked; the badge rings
                      when it's today. */}
                  <span className="flex items-center gap-1">
                    {selectMode && <Checkbox on={picked} />}
                    <span className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-full text-[0.86rem] leading-none tabular-nums',
                      inked ? cx('font-semibold text-paper', isToday && 'border-[1.5px] border-paper/50')
                        : off ? 'font-semibold text-tone-alert'
                        : isToday ? 'border-[1.5px] border-rose-soft font-semibold text-rose'
                        : 'font-medium text-ink',
                    )}>
                      {day}
                    </span>
                  </span>

                  {/* What's on the day. Dots, not names: a name never fit this
                      column, and the list beside the calendar spells the day
                      out in full the moment you tap it. Fixed height, so an
                      empty day is the same size as a busy one. Blocked time is
                      a small square, not a dot, so it can't be mistaken for a
                      completed client in a similar grey. */}
                  <span className="flex h-[6px] items-center justify-center gap-[3px]">
                    {events.slice(0, 4).map(ev => (
                      <span
                        key={ev.id}
                        className={cx('h-[6px] w-[6px]', ev.kind !== 'block' && 'rounded-full')}
                        style={{ background: inked ? 'rgb(var(--c-paper) / 0.85)' : dotOf(ev, dm) }}
                      />
                    ))}
                  </span>

                  {/* One line of words, and only when it has something to say:
                      how much of the day is spoken for, or that it's closed. */}
                  {off ? (
                    <span className={cx('inline-flex h-[9px] items-center gap-1 text-[0.58rem] font-semibold uppercase leading-none tracking-[0.08em]', inked ? 'text-paper/80' : 'text-tone-alert')}>
                      <OffCross className="h-2 w-2" />
                      Off
                    </span>
                  ) : (
                    <span className={cx(
                      'h-[9px] text-[0.62rem] font-semibold leading-none tabular-nums',
                      inked ? 'text-paper/60' : full ? 'text-tone-alert' : 'text-ink-muted',
                    )}>
                      {(cap != null && booked > 0) ? `${booked}/${cap}` : ''}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                    <span className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
                      {selectMode && <Checkbox on={picked} />}
                      <span className={cx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-semibold leading-none tabular-nums sm:h-6 sm:w-6 sm:text-[0.74rem]',
                        off ? 'text-tone-alert'
                          : isToday ? 'border-[1.5px] border-rose-soft text-rose'
                          : isActive ? 'text-ink'
                          : 'text-ink-soft',
                      )}>
                        {day}
                      </span>
                    </span>
                    {/* Counts EVERY item on the day, so it never disagrees with
                        the booking line below. Laptop only: a phone cell is
                        ~43px, and beside a two-digit date the count slid over
                        it ("1(1" for the 11th). There the dots and the booked
                        line already say what the day holds. */}
                    {events.length > 0 && !selectMode && (
                      <span className="hidden h-[18px] shrink-0 items-center bg-canvas px-1.5 text-[0.56rem] font-semibold tabular-nums text-ink-muted sm:flex">
                        {events.length}
                      </span>
                    )}
                  </div>

                  {/* Day off, with the reason she typed. Phones get the cross
                      alone. The reason WRAPS. It used to truncate, which turned
                      five closed days into five cells reading "BOOKSY TIM...",
                      with the one word that would have explained them cut off. */}
                  {off && (
                    <div className="flex min-w-0 items-start gap-1 rounded-[5px] bg-tone-alert/10 px-1 py-1 text-tone-alert sm:px-1.5">
                      <OffCross className="mt-[3px] h-[7px] w-[7px] shrink-0" />
                      <span className="hidden min-w-0 text-[0.56rem] font-semibold uppercase leading-[1.35] tracking-[0.06em] [overflow-wrap:anywhere] sm:block" title={reason || 'Day off'}>
                        {reason || 'Day off'}
                      </span>
                    </div>
                  )}

                  {/* Phones: coloured dots. Names never fit a 7-column phone
                      grid, and tapping the day lists them all in full. */}
                  {events.length > 0 && (
                    <div className="flex flex-wrap gap-[3px] px-0.5 sm:hidden">
                      {events.slice(0, 6).map(ev => (
                        <span key={ev.id} className={cx('h-[5px] w-[5px]', ev.kind !== 'block' && 'rounded-full')} style={{ background: dotOf(ev, dm) }} />
                      ))}
                    </div>
                  )}

                  {/* Everything wider than a phone: the named chips */}
                  <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                    {events.slice(0, maxChips).map(ev => {
                      const cancelled = ev.kind === 'appt' && ev.status === 'cancelled';
                      const isBlock = ev.kind === 'block';
                      const live = onEventClick && !selectMode;
                      return (
                        <div
                          key={ev.id}
                          role={live ? 'button' : undefined}
                          tabIndex={live ? 0 : undefined}
                          onClick={(e) => { e.stopPropagation(); if (!onEventClick || selectMode) return; onEventClick(ev); }}
                          onKeyDown={(e) => {
                            if (!onEventClick || selectMode) return;
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEventClick(ev); }
                          }}
                          className={cx(
                            'w-full px-1.5 py-1 text-left transition-colors duration-150',
                            // Blocked time wears its hatching on a hairline, so
                            // it reads as taken but never as a client.
                            isBlock ? 'bg-paper shadow-[inset_0_0_0_1px_rgb(var(--c-line))]' : 'bg-canvas',
                            live ? cx('cursor-pointer', !isBlock && 'hover:bg-line/70') : 'cursor-[inherit]',
                            cancelled && 'opacity-[0.55]',
                          )}
                          style={isBlock ? { backgroundImage: blockHatch(dm) } : undefined}
                          title={`${ev.name}${ev.time ? ` · ${ev.time}` : ''} · ${ev.detail || ''}`}
                        >
                          {/* Name on its own line, time under it. Sharing one
                              line with a time and two badges left the name about
                              sixty pixels, which is why every client in the grid
                              read as "Merc...". The name is what makes a day
                              recognisable, so it gets the width and the rest
                              goes on the line below. */}
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className={cx('h-[6px] w-[6px] shrink-0', !isBlock && 'rounded-full')} style={{ background: dotOf(ev, dm) }} />
                            <span className={cx('min-w-0 truncate text-[0.68rem] font-medium', isBlock ? 'text-ink-soft' : 'text-ink', cancelled && 'line-through')}>
                              {ev.name}
                            </span>
                            {/* Bridal mark: a drawn dot, so it can't be read
                                as a full stop typed after the name. */}
                            {ev.bridal && <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-rose" title="Bridal" />}
                          </span>
                          <span className="flex items-center gap-1 pl-[13px]">
                            {(startTime(ev.time) || isBlock) && (
                              <span className="text-[0.62rem] font-semibold tabular-nums text-ink-muted">
                                {startTime(ev.time) || 'All day'}
                              </span>
                            )}
                            {ev.source === 'booksy' && (
                              <span
                                title="Imported from Booksy"
                                className="shrink-0 px-1 text-[0.5rem] font-bold uppercase leading-[14px] tracking-[0.06em] text-ink-muted shadow-[inset_0_0_0_1px_rgb(var(--c-line-strong))]"
                              >
                                B
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                    {events.length > maxChips && (
                      <span className="pl-1.5 text-[0.62rem] font-semibold text-ink-muted">
                        +{events.length - maxChips} more
                      </span>
                    )}
                  </div>

                  {/* Booking capacity, spelled out. Consultations and classes
                      are deliberately NOT in this number, which is why it says
                      "booked" rather than sitting bare as "0/4". */}
                  {cap != null && !off && (
                    <span className={cx(
                      'mt-auto whitespace-nowrap pl-0.5 text-[0.56rem] font-semibold tabular-nums tracking-wide',
                      full ? 'text-tone-alert' : booked > 0 ? 'text-ink-soft' : 'text-ink-muted/70',
                    )}>
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
