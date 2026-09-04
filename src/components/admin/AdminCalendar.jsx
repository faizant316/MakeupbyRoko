import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateBlockPopup from './DateBlockPopup';
import ScheduleView from './ScheduleView';
import MonthCalendar, { CLASS_PINK, OFF_RED } from './MonthCalendar';
import CalendarHeader from './CalendarHeader';
import { buildEventMap, buildBookedMap } from './calendarEvents';
import { STATUS_COLORS, STATUS_COLORS_DM, EVENT_COLORS, CONSULT_INK } from './statusColors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// A day in the Week strip. This used to be a stack of tiny 10px labels on a
// block of flat colour (indigo today, amber filling up, red full) with a "0/4"
// jammed in beside three dots, which at 50px wide read as noise rather than as
// a week. Now it's a card like every other surface in the admin: one number you
// can read at a glance, the day's kinds as dots under it, and the capacity as
// plain small text that only takes on colour when the day is actually tight.
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

  const ink = dm ? '#ECEDF1' : '#1a1a1f';
  const muted = dm ? '#8b8b95' : '#9c9ca6';
  const accent = '#C4849A';
  const line = dm ? '#2e2e38' : '#EDE7EA';
  const selBg = dm ? '#ECEDF1' : '#1a1a1f';

  const bg = isSel ? selBg
    : isBlocked ? (dm ? 'rgba(239,68,68,0.10)' : '#FEF3F3')
    : isFull ? (dm ? 'rgba(239,68,68,0.07)' : '#FFF8F8')
    : (dm ? '#1e1e24' : '#fff');
  const border = isSel ? 'transparent'
    : isBlocked || isFull ? (dm ? 'rgba(239,68,68,0.34)' : '#F6DCDC')
    : isToday ? accent
    : line;
  const dayColor = isSel ? (dm ? '#6b6b75' : 'rgba(255,255,255,0.62)')
    : isBlocked ? OFF_RED : isToday ? accent : muted;
  const numColor = isSel ? (dm ? '#111' : '#fff') : isBlocked ? OFF_RED : ink;
  const countColor = isSel ? (dm ? '#6b6b75' : 'rgba(255,255,255,0.62)')
    : isFull ? OFF_RED : isFillingUp ? '#B8862F' : muted;

  const dots = [
    ...[...new Set(activeStatuses)].slice(0, 3).map(st => (dm ? STATUS_COLORS_DM : STATUS_COLORS)[st] || '#999'),
    ...(hasConsultation ? [CONSULT_INK[dm ? 'dark' : 'light']] : []),
    ...(hasClassReg ? [CLASS_PINK] : []),
  ].slice(0, 4);

  return (
    <button
      onClick={() => { if (!isBlocked) onSingleClick(key); }}
      onDoubleClick={(e) => { e.preventDefault(); if (isBlocked) onUnblock(blockedMap[key]?.id); else onDoubleClick(key); }}
      title={isBlocked ? 'Day off · double-click to reopen' : isFull ? `Fully booked (${count})` : isFillingUp ? `${effectiveCap - count} spot(s) left` : 'Click to select · double-click to close the day'}
      className="relative rounded-xl sm:rounded-2xl py-2.5 sm:py-4 px-0.5 sm:px-1 flex flex-col items-center gap-1 sm:gap-1.5 w-full select-none transition-all active:scale-[0.97]"
      style={{ background: bg, border: `1px solid ${border}`, boxShadow: isToday && !isSel ? `0 0 0 1px ${accent}` : 'none' }}
      onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor = accent; }}
      onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = border; }}
    >
      {/* Custom-limit marker — this day has its own cap, not the default */}
      {isCustom && !isBlocked && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: isSel ? (dm ? '#8a8a94' : 'rgba(255,255,255,0.85)') : '#A0607A' }} title="Custom limit" />
      )}

      <span className="text-[0.55rem] sm:text-[0.58rem] font-semibold tracking-[0.1em] sm:tracking-[0.12em] uppercase" style={{ color: dayColor }}>
        {DAYS[d.getDay()]}
      </span>
      <span className="text-[1.15rem] sm:text-[1.45rem] leading-none tabular-nums" style={{ color: numColor, fontWeight: isToday || isSel ? 600 : 400 }}>
        {d.getDate()}
      </span>

      {/* What's on the day, one dot per kind. Height is reserved either way so
          empty days don't sit a few pixels shorter than busy ones. */}
      <span className="flex items-center gap-[3px] h-[5px]">
        {dots.map((c, i) => (
          <span key={i} className="w-[5px] h-[5px] rounded-full"
            style={{ background: isSel ? (dm ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)') : c }} />
        ))}
      </span>

      {isBlocked ? (
        <span className="inline-flex items-center gap-1 text-[0.6rem] font-semibold tracking-[0.08em] uppercase" style={{ color: OFF_RED }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-2 h-2">
            <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
          </svg>
          Off
        </span>
      ) : (
        <span className="text-[0.62rem] tabular-nums" style={{ color: countColor, fontWeight: isFull || isFillingUp ? 600 : 400 }}>
          {count}/{effectiveCap}
        </span>
      )}
    </button>
  );
}

export default function AdminCalendar({ bookings, classRegs = [], currentMonth, setCurrentMonth, selectedDate, setSelectedDate, setStatusFilter, maxPerDay = 3, dayCapacityMap = {}, darkMode: dm, onSelectBooking, onSelectClassReg, defaultDay = false }) {
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

  // Only confirmed/completed bookings count toward capacity
  const dateMap = {};
  bookings.forEach(b => {
    if (!b.date) return;
    if (!dateMap[b.date]) dateMap[b.date] = [];
    dateMap[b.date].push(b.status || 'pending');
  });

  // Only pending/confirmed count toward capacity — completed appointments free up the slot
  const confirmedDateMap = {};
  bookings.forEach(b => {
    if (!b.date || !['confirmed', 'pending'].includes(b.status)) return;
    if (!confirmedDateMap[b.date]) confirmedDateMap[b.date] = [];
    confirmedDateMap[b.date].push(b.status);
  });

  // Consultation dates — purple dots
  const consultationDateMap = {};
  bookings.forEach(b => {
    if (!b.consultation_date) return;
    if (!consultationDateMap[b.consultation_date]) consultationDateMap[b.consultation_date] = [];
    consultationDateMap[b.consultation_date].push(b.name || 'Client');
  });

  // Class registration dates — pink dots
  const classRegDateMap = {};
  classRegs.forEach(r => {
    if (!r.appointment_date) return;
    if (!classRegDateMap[r.appointment_date]) classRegDateMap[r.appointment_date] = [];
    classRegDateMap[r.appointment_date].push(r.full_name || 'Client');
  });

  // Shared with the Calendar tab so both surfaces agree on what a day holds.
  const evMap = buildEventMap(bookings, classRegs);
  const bookedMap = buildBookedMap(bookings);
  const openEvent = (ev) => {
    if (ev.kind === 'class') onSelectClassReg?.(ev.raw);
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

        {/* Same grid as the Calendar tab, just denser. One calendar look
            everywhere, and each day names what's on it instead of leaving
            unexplained dots next to a booking count. */}
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
        <div className="grid gap-1 sm:gap-2" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
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

    // The date, the arrows and Today all live in ScheduleView's own header now.
    // This used to print its own date line and its own Today button right above
    // that one, so the day view carried two of each. Block day rides along in
    // the same row instead.
    const blockBtn = (
      <button onClick={() => isBlocked ? unblockMutation.mutate(blockedMap[key].id) : setBlockPopup({ date: key })}
        className={`h-7 px-2.5 rounded-md text-[0.68rem] font-semibold tracking-[0.08em] uppercase border transition-all flex-shrink-0 ${
          isBlocked
            ? 'text-red-500 border-red-200 hover:bg-red-50'
            : dm ? 'text-[#8e8e99] border-[#3a3a48] hover:text-red-400 hover:border-red-400' : 'text-[#a3a3ad] border-[#E5E7EB] hover:text-red-500 hover:border-red-200'
        }`}>
        <span className="inline-flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="w-2.5 h-2.5">
            {isBlocked ? <><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></>
                       : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
          </svg>
          {isBlocked ? 'Unblock' : 'Block day'}
        </span>
      </button>
    );

    return (
      <>
        {isBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
              <circle cx="12" cy="12" r="9" /><line x1="6" y1="18" x2="18" y2="6" />
            </svg>
            <div>
              <p className="text-[0.75rem] font-semibold text-red-500">This day is blocked · clients can't book</p>
              {blockedMap[key]?.reason && <p className="text-[0.7rem] text-[#999] mt-0.5">{blockedMap[key].reason}</p>}
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
          dm={dm}
          headerRight={blockBtn}
        />
      </>
    );
  };

  return (
    <>
      <div className="rounded-xl p-4 sm:p-6" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#ECECF1'}` }}>
        {/* View switcher + hint — minimal text tabs, soft tint when active */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {['Day', 'Week', 'Month'].map(v => {
              const active = view === v.toLowerCase();
              return (
                <button key={v} onClick={() => changeView(v.toLowerCase())}
                  className="px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.08em] uppercase rounded-full transition-colors"
                  style={active
                    ? { background: dm ? '#34343d' : '#EBEBF1', color: dm ? '#ECEDF1' : '#1a1a1a' }
                    : { background: 'transparent', color: dm ? '#6f6f78' : '#a8a8b1' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = dm ? '#a1a1aa' : '#83838d'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = dm ? '#6f6f78' : '#a8a8b1'; }}>
                  {v}
                </button>
              );
            })}
          </div>
          <span className="text-[0.62rem] tracking-wide hidden sm:block" style={{ color: dm ? '#5f5f69' : '#a8a8b2' }}>
            {view === 'month' ? 'Tap a day to filter · double-tap to close it off' : 'Double-click to block a date'}
          </span>
        </div>

        {view === 'month' && renderMonth()}
        {view === 'week' && renderWeek()}
        {view === 'day' && renderDay()}

        {/* Legend (month/week only — the day schedule carries its own) */}
        {view !== 'day' && (
        <div className="flex items-center gap-x-4 gap-y-2 mt-6 pt-4 flex-wrap" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
          {/* Every swatch here is the real thing, shrunk: today is the rose
              ring both grids draw, a full day is the soft red card. The old keys
              still described the indigo/amber blocks the week view used to
              paint, which stopped being true when those cells were redrawn. */}
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#8e8e99' : '#999' }}>
            <span className="w-3 h-3 rounded-md inline-block" style={{ border: '1px solid #C4849A', boxShadow: '0 0 0 1px #C4849A' }} /> Today
          </span>
          {view === 'week' && (
            <span className="flex items-center gap-1.5 text-[0.6rem] font-medium text-red-400">
              <span className="w-3 h-3 rounded-md inline-block" style={{ background: dm ? 'rgba(239,68,68,0.07)' : '#FFF8F8', border: `1px solid ${dm ? 'rgba(239,68,68,0.34)' : '#F6DCDC'}` }} /> Fully booked
            </span>
          )}
          {/* Days off share the red cell but carry an ✕, so they get their own
              key rather than being lumped in with "fully booked". */}
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium text-red-400">
            <span className="w-3 h-3 rounded-md inline-flex items-center justify-center"
              style={{ background: dm ? 'rgba(239,68,68,0.10)' : '#FEF3F3', border: `1px solid ${dm ? 'rgba(239,68,68,0.34)' : '#F6DCDC'}` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={OFF_RED} strokeWidth="3.5" strokeLinecap="round" className="w-1.5 h-1.5">
                <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </span> Day off
          </span>
          {Object.entries(STATUS_COLORS).filter(([s]) => s !== 'cancelled').map(([s, color]) => (
            <span key={s} className="flex items-center gap-1.5 text-[0.6rem] font-medium capitalize" style={{ color: dm ? '#8e8e99' : '#999' }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} /> {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#8e8e99' : '#999' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: view === 'month' ? CONSULT_INK[dm ? 'dark' : 'light'] : EVENT_COLORS.consult }} /> Consultation
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#8e8e99' : '#999' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: view === 'month' ? CLASS_PINK : '#D4A0B0' }} /> Makeup Class
          </span>
          {view === 'week' && (
            <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#8e8e99' : '#999' }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#A0607A' }} /> Custom limit
            </span>
          )}
        </div>
        )}
      </div>

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