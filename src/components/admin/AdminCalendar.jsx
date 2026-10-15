import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateBlockPopup from './DateBlockPopup';
import ScheduleView from './ScheduleView';
import MonthCalendar, { CLASS_PINK } from './MonthCalendar';
import CalendarHeader from './CalendarHeader';
import { buildEventMap, buildBookedMap } from './calendarEvents';
import { useTimeBlocks } from './useTimeBlocks';
import { STATUS_COLORS, STATUS_COLORS_DM, EVENT_COLORS, CONSULT_INK, BLOCK_INK } from './statusColors';
import { Segmented, cx } from './ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// A day in the Week strip: one number you can read at a glance, the day's
// kinds as dots under it, and the capacity as plain small text that only takes
// on colour when the day is actually tight. Square, like every card. The
// selected day is the filled one; today says so with its label, not a ring, so
// "which day am I looking at" always has one answer.
function WeekDayCell({ d, todayKey, selectedDate, dateMap, confirmedDateMap = {}, consultationDateMap = {}, classRegDateMap = {}, blockedSet, blockedMap, onSingleClick, onDoubleClick, onUnblock, maxPerDay, dayCapacityMap = {}, dm }) {
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const effectiveCap = dayCapacityMap[key] ?? maxPerDay;
  const isCustom = dayCapacityMap[key] != null; // day has its own limit, not the default
  const isToday = key === todayKey;
  const isSel = key === selectedDate;
  const isBlocked = blockedSet.has(key);
  const activeStatuses = (dateMap[key] || []).filter(s => s !== 'cancelled');
  const hasConsultation = (consultationDateMap[key] || []).length > 0;
  const hasClassReg = (classRegDateMap[key] || []).length > 0;
  const count = (confirmedDateMap[key] || []).length;
  const isFull = count >= effectiveCap;
  const isFillingUp = count > 0 && !isFull;

  const dots = [
    ...[...new Set(activeStatuses)].slice(0, 3).map(st => (dm ? STATUS_COLORS_DM : STATUS_COLORS)[st] || '#999'),
    ...(hasConsultation ? [CONSULT_INK[dm ? 'dark' : 'light']] : []),
    ...(hasClassReg ? [CLASS_PINK] : []),
  ].slice(0, 4);

  return (
    <button
      type="button"
      onClick={() => { if (!isBlocked) onSingleClick(key); }}
      onDoubleClick={(e) => { e.preventDefault(); if (isBlocked) onUnblock(blockedMap[key]?.id); else onDoubleClick(key); }}
      title={isBlocked ? 'Day off · double-click to reopen' : isFull ? `Fully booked (${count})` : isFillingUp ? `${effectiveCap - count} spot(s) left` : 'Click to select · double-click to close the day'}
      className={cx(
        'press relative flex w-full select-none flex-col items-center gap-1 border px-0.5 py-2.5 sm:gap-1.5 sm:px-1 sm:py-4',
        isSel ? 'border-ink bg-ink text-paper'
          : isBlocked ? 'border-tone-alert/25 bg-tone-alert/[0.05]'
          : isFull ? 'border-tone-alert/20 bg-tone-alert/[0.03] hover:border-tone-alert/40'
          : 'border-line bg-paper hover:border-ink/30',
      )}
    >
      {/* Custom-limit marker: this day has its own cap, not the default. */}
      {isCustom && !isBlocked && (
        <span className={cx('absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full', isSel ? 'bg-paper/80' : 'bg-rose')} title="Custom limit" />
      )}

      <span className={cx('text-[0.55rem] font-semibold uppercase tracking-[0.12em] sm:text-[0.58rem]',
        isSel ? 'text-paper/60' : isBlocked ? 'text-tone-alert' : isToday ? 'text-rose' : 'text-ink-muted')}>
        {DAYS[d.getDay()]}
      </span>
      <span className={cx('text-[1.15rem] leading-none tabular-nums sm:text-[1.45rem]',
        isSel ? 'font-semibold text-paper' : isBlocked ? 'text-tone-alert' : isToday ? 'font-semibold text-rose' : 'text-ink')}>
        {d.getDate()}
      </span>

      {/* What's on the day, one dot per kind. Height is reserved either way so
          empty days don't sit a few pixels shorter than busy ones. */}
      <span className="flex h-[5px] items-center gap-[3px]">
        {dots.map((c, i) => (
          <span key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: isSel ? 'rgb(var(--c-paper) / 0.85)' : c }} />
        ))}
      </span>

      {isBlocked ? (
        <span className="inline-flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-tone-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="h-2 w-2" aria-hidden>
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
          Off
        </span>
      ) : (
        <span className={cx('text-[0.62rem] tabular-nums',
          isSel ? 'text-paper/60' : isFull ? 'font-semibold text-tone-alert' : isFillingUp ? 'font-semibold text-tone-pending' : 'text-ink-muted')}>
          {count}/{effectiveCap}
        </span>
      )}
    </button>
  );
}

export default function AdminCalendar({ bookings, classRegs = [], currentMonth, setCurrentMonth, selectedDate, setSelectedDate, setStatusFilter, maxPerDay = 3, dayCapacityMap = {}, darkMode: dm, onSelectBooking, onSelectClassReg, onSelectTimeBlock, defaultDay = false }) {
  // The Home page lands on the day grid (matches the Booksy app: today's
  // appointments front and center), but remembers Roko's last choice if she
  // switches to Week/Month. The Availability tab always opens on Month.
  const [view, setView] = useState(() => {
    if (defaultDay && typeof window !== 'undefined') {
      return localStorage.getItem('admin-home-cal-view') || 'day';
    }
    return defaultDay ? 'day' : 'month';
  });
  const [blockPopup, setBlockPopup] = useState(null);
  const queryClient = useQueryClient();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
  });

  const blockedMap = {};
  blockedDates.forEach(b => { blockedMap[b.date] = b; });
  const blockedSet = new Set(Object.keys(blockedMap));

  const blockMutation = useMutation({
    mutationFn: ({ date, reason }) => api.entities.BlockedDate.create({ date, reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocked-dates'] }); setBlockPopup(null); },
  });

  const unblockMutation = useMutation({
    mutationFn: (id) => api.entities.BlockedDate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocked-dates'] }); setBlockPopup(null); },
  });

  // Every status on a day, for its dots.
  const dateMap = {};
  bookings.forEach(b => {
    if (!b.date) return;
    if (!dateMap[b.date]) dateMap[b.date] = [];
    dateMap[b.date].push(b.status || 'pending');
  });

  // Only pending/confirmed count toward capacity: completed appointments free up the slot.
  const confirmedDateMap = {};
  bookings.forEach(b => {
    if (!b.date || !['confirmed', 'pending'].includes(b.status)) return;
    if (!confirmedDateMap[b.date]) confirmedDateMap[b.date] = [];
    confirmedDateMap[b.date].push(b.status);
  });

  const consultationDateMap = {};
  bookings.forEach(b => {
    if (!b.consultation_date) return;
    if (!consultationDateMap[b.consultation_date]) consultationDateMap[b.consultation_date] = [];
    consultationDateMap[b.consultation_date].push(b.name || 'Client');
  });

  const classRegDateMap = {};
  classRegs.forEach(r => {
    if (!r.appointment_date) return;
    if (!classRegDateMap[r.appointment_date]) classRegDateMap[r.appointment_date] = [];
    classRegDateMap[r.appointment_date].push(r.full_name || 'Client');
  });

  // Shared with the Calendar tab so both surfaces agree on what a day holds.
  const timeBlocks = useTimeBlocks();
  const evMap = buildEventMap(bookings, classRegs, timeBlocks);
  const bookedMap = buildBookedMap(bookings);
  const openEvent = (ev) => {
    if (ev.kind === 'block') onSelectTimeBlock?.(ev.raw);
    else if (ev.kind === 'class') onSelectClassReg?.(ev.raw);
    else onSelectBooking?.(ev.raw);
  };

  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(todayKey); setStatusFilter?.('all'); };
  const handleSingleClick = (key) => {
    const isNewSelection = key !== selectedDate;
    setSelectedDate(isNewSelection ? key : null);
    // Keep the calendar's reference date on the day you tapped so Week/Day
    // views open on that same date instead of drifting back to today.
    if (isNewSelection) { setCurrentMonth(new Date(key + 'T00:00:00')); setStatusFilter?.('all'); }
  };
  // Switching views re-centers on the selected day (if any) so the chosen date
  // stays put whether you look at it by day, week, or month.
  const changeView = (v) => {
    setView(v);
    if (defaultDay && typeof window !== 'undefined') localStorage.setItem('admin-home-cal-view', v);
    if (selectedDate) setCurrentMonth(new Date(selectedDate + 'T00:00:00'));
  };
  const handleDoubleClick = (key) => setBlockPopup({ date: key });
  const handleUnblock = (id) => unblockMutation.mutate(id);

  const sharedCellProps = {
    todayKey, selectedDate, dateMap, confirmedDateMap, consultationDateMap, classRegDateMap, blockedSet, blockedMap, maxPerDay, dayCapacityMap, dm,
    onSingleClick: handleSingleClick,
    onDoubleClick: handleDoubleClick,
    onUnblock: handleUnblock,
  };

  // ─── MONTH VIEW ───
  const renderMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    return (
      <>
        <CalendarHeader
          title={currentMonth.toLocaleString('default', { month: 'long' })}
          subtitle={String(year)}
          onStep={(n) => setCurrentMonth(new Date(year, month + n, 1))}
          stepUnit="month"
          jumpDate={currentMonth}
          onJump={(m, y) => setCurrentMonth(new Date(y, m, 1))}
          onToday={goToToday}
          isToday={year === today.getFullYear() && month === today.getMonth()}
          dm={dm}
          className="mb-4"
        />

        {/* Same grid as the Calendar tab, just denser. */}
        <MonthCalendar
          cur={currentMonth}
          evMap={evMap}
          offMap={blockedMap}
          todayKey={todayKey}
          dm={dm}
          capFor={(k) => dayCapacityMap[k] ?? maxPerDay}
          bookedFor={(k) => bookedMap[k] || 0}
          dense
          activeDay={selectedDate}
          onOpenDay={handleSingleClick}
          onDoubleActivate={(key) => (blockedSet.has(key) ? handleUnblock(blockedMap[key]?.id) : handleDoubleClick(key))}
          onEventClick={openEvent}
        />
      </>
    );
  };

  // ─── WEEK VIEW ───
  const renderWeek = () => {
    const weekStart = getWeekStart(currentMonth);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const stepWeek = (n) => { const d = new Date(currentMonth); d.setDate(d.getDate() + n * 7); setCurrentMonth(d); };
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
    const thisWeek = days.some(d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === todayKey);

    return (
      <>
        <CalendarHeader
          title={`${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          subtitle={weekStart.getFullYear() === weekEnd.getFullYear()
            ? String(weekStart.getFullYear())
            : `${weekStart.getFullYear()} – ${weekEnd.getFullYear()}`}
          onStep={stepWeek}
          stepUnit="week"
          jumpDate={currentMonth}
          onJump={(m, y) => setCurrentMonth(new Date(y, m, Math.min(currentMonth.getDate(), new Date(y, m + 1, 0).getDate())))}
          onToday={goToToday}
          isToday={thisWeek}
          dm={dm}
          className="mb-4"
        />
        {/* minmax(0,1fr) so seven cells always fit the card: with the default
            auto minimum, "SUN" plus its tracking sets a floor and the last day
            hangs off the right edge on a phone. */}
        <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {days.map(d => (
            <WeekDayCell key={`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`} d={d} {...sharedCellProps} />
          ))}
        </div>
      </>
    );
  };

  // ─── DAY VIEW ─── (Booksy-style: week strip + color-coded time grid)
  const renderDay = () => {
    const d = currentMonth;
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const isBlocked = blockedSet.has(key);
    const goKey = (k) => { setCurrentMonth(new Date(k + 'T00:00:00')); setSelectedDate(k); setStatusFilter?.('all'); };

    // The date, the arrows and Today all live in ScheduleView's own header;
    // Block day rides along in the same row.
    const blockBtn = (
      <button
        type="button"
        onClick={() => isBlocked ? unblockMutation.mutate(blockedMap[key].id) : setBlockPopup({ date: key })}
        className={cx(
          'press inline-flex h-8 shrink-0 items-center gap-1.5 rounded border px-2.5 text-[0.72rem] font-medium transition-colors',
          isBlocked ? 'border-tone-alert/30 text-tone-alert hover:border-tone-alert/60' : 'border-line-strong text-ink-muted hover:border-tone-alert/40 hover:text-tone-alert',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-2.5 w-2.5" aria-hidden>
          {isBlocked ? <path d="M5 5l14 14M19 5 5 19" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
        {isBlocked ? 'Unblock' : 'Block day'}
      </button>
    );

    return (
      <>
        {isBlocked && (
          <div className="mb-4 flex items-center gap-3 border border-tone-alert/25 bg-tone-alert/[0.05] px-4 py-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4 shrink-0 text-tone-alert" aria-hidden>
              <circle cx="12" cy="12" r="9" /><path d="M6 18 18 6" />
            </svg>
            <div>
              <p className="text-[0.78rem] font-semibold text-tone-alert">This day is blocked · clients can't book</p>
              {blockedMap[key]?.reason && <p className="mt-0.5 text-[0.74rem] text-ink-muted">{blockedMap[key].reason}</p>}
            </div>
          </div>
        )}

        <ScheduleView
          bookings={bookings}
          classRegs={classRegs}
          dateKey={key}
          onChangeDate={goKey}
          onSelectBooking={onSelectBooking}
          onSelectClassReg={onSelectClassReg}
          onSelectTimeBlock={onSelectTimeBlock}
          dm={dm}
          headerRight={blockBtn}
        />
      </>
    );
  };

  const swatch = 'flex items-center gap-1.5 text-[0.66rem] font-medium text-ink-muted';

  return (
    <>
      <section className="border border-line bg-paper p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Segmented
            size="sm"
            value={view}
            onChange={changeView}
            options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
          />
          <span className="hidden text-[0.68rem] text-ink-muted sm:block">
            {view === 'month' ? 'Tap a day to filter · double-tap to close it off' : 'Double-click to block a date'}
          </span>
        </div>

        {view === 'month' && renderMonth()}
        {view === 'week' && renderWeek()}
        {view === 'day' && renderDay()}

        {/* Legend (month and week only; the day schedule carries its own).
            Every swatch is the real thing, shrunk. */}
        {view !== 'day' && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
            {view === 'week' && (
              <span className={cx(swatch, 'text-tone-alert')}>
                <span className="inline-block h-3 w-3 border border-tone-alert/30 bg-tone-alert/[0.04]" /> Fully booked
              </span>
            )}
            <span className={cx(swatch, 'text-tone-alert')}>
              <span className="inline-flex h-3 w-3 items-center justify-center border border-tone-alert/30 bg-tone-alert/[0.06]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="h-1.5 w-1.5" aria-hidden>
                  <path d="M5 5l14 14M19 5 5 19" />
                </svg>
              </span> Day off
            </span>
            {Object.entries(STATUS_COLORS).filter(([s]) => s !== 'cancelled').map(([s, color]) => (
              <span key={s} className={cx(swatch, 'capitalize')}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} /> {s}
              </span>
            ))}
            <span className={swatch}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: view === 'month' ? CONSULT_INK[dm ? 'dark' : 'light'] : EVENT_COLORS.consult }} /> Consultation
            </span>
            <span className={swatch}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: CLASS_PINK }} /> Makeup class
            </span>
            <span className={swatch}>
              <span className="inline-block h-2 w-2" style={{ background: BLOCK_INK[dm ? 'dark' : 'light'] }} /> Blocked time
            </span>
            {view === 'week' && (
              <span className={swatch}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose" /> Custom limit
              </span>
            )}
          </div>
        )}
      </section>

      {blockPopup && (
        <DateBlockPopup
          date={blockPopup.date}
          isBlocked={blockedSet.has(blockPopup.date)}
          existingReason={blockedMap[blockPopup.date]?.reason || ''}
          onBlock={(reason) => blockMutation.mutate({ date: blockPopup.date, reason })}
          onUnblock={() => unblockMutation.mutate(blockedMap[blockPopup.date].id)}
          onClose={() => setBlockPopup(null)}
        />
      )}
    </>
  );
}
