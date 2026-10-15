import { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scrollToTarget } from '@/lib/lenis';
import MonthCalendar, { CLASS_PINK, weekStartOf } from './MonthCalendar';
import CalendarHeader from './CalendarHeader';
import ScheduleView from './ScheduleView';
import BlockDaysSheet from './BlockDaysSheet';
import { AgendaCard, DayHead } from './DayAgenda';
import { Check, Cross } from './Glyphs';
import { buildEventMap, buildBookedMap } from './calendarEvents';
import { useTimeBlocks } from './useTimeBlocks';
import { windowMinutes, blockLabel } from '@/lib/timeBlocks';
import { STATUS_COLORS, CONSULT_INK, BLOCK_INK } from './statusColors';
import { Chevron, Fold, Label, Panel, Segmented, Tag, buttonClass, cx } from './ui';

const SETTING_KEY = 'max_bookings_per_day';
const DEFAULT_CAP = 3;
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKeyOf = () => keyOf(new Date());
const fmtDay = (key, opts) =>
  new Date(key + 'T00:00:00').toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric' });

const dayAfter = (key) => { const d = new Date(key + 'T00:00:00'); d.setDate(d.getDate() + 1); return keyOf(d); };

// Collapse a sorted list of days off into trips: consecutive days that share a
// reason become one entry, so a week away reads as one row, not seven.
const groupRuns = (rows) => {
  const runs = [];
  for (const r of rows) {
    const last = runs[runs.length - 1];
    if (last && dayAfter(last.end) === r.date && (last.reason || '') === (r.reason || '')) {
      last.end = r.date;
      last.items.push(r);
    } else {
      runs.push({ start: r.date, end: r.date, reason: r.reason || '', items: [r] });
    }
  }
  return runs;
};

// Lists in the side panels show this many, and fold the rest away.
const LIST_CAP = 5;

// The panel's full-width actions: 44px on a phone, a touch shorter on a laptop.
const panelBtn = (variant) => buttonClass(variant, 'md', 'h-11 w-full sm:h-10');

// Closing days is the one destructive thing on this page, so its button is the
// one filled in the alert red.
const alertSolid = buttonClass('alert', 'md', 'font-semibold');

const ClockIcon = ({ className = 'h-3.5 w-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

// ── Circular capacity meter ─────────────────────────────────
function CapacityRing({ booked, capacity, blocked }) {
  const size = 76, stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = blocked ? 1 : capacity > 0 ? Math.min(1, booked / capacity) : 0;
  const full = !blocked && capacity > 0 && booked >= capacity;
  const arc = blocked || full ? 'stroke-tone-alert' : booked > 0 ? 'stroke-rose-soft' : 'stroke-line-strong';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - ratio)}
          className={cx(arc, 'transition-[stroke-dashoffset] duration-500 ease-quint')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {blocked ? (
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-tone-alert">Closed</span>
        ) : (
          <>
            <span className="text-[1.3rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{booked}</span>
            <span className="mt-1 text-[0.62rem] font-medium tabular-nums text-ink-muted">of {capacity}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Stepper ─────────────────────────────────────────────────
function Stepper({ value, onChange, min = 1, max = 20 }) {
  const btn = 'flex h-11 w-11 select-none items-center justify-center text-ink-muted transition-colors hover:bg-canvas hover:text-ink sm:h-9 sm:w-9';
  return (
    <div className="flex items-center overflow-hidden rounded-ctl border border-line-strong bg-paper">
      <button type="button" aria-label="One fewer" onClick={() => onChange(Math.max(min, value - 1))} className={btn}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M5 12h14" /></svg>
      </button>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
        className="h-11 w-11 border-x border-line bg-paper text-center text-[16px] font-semibold tabular-nums text-ink outline-none sm:h-9 sm:text-[0.92rem]"
      />
      <button type="button" aria-label="One more" onClick={() => onChange(Math.min(max, value + 1))} className={btn}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

// `month` and `selectedDate` live up in Admin so the month arrows can sit in
// the page header alongside the "Calendar" title.
export default function AvailabilityTab({
  bookings = [], classRegs = [], darkMode: dm, onSelect, onSelectClassReg, onSelectTimeBlock, onBlockTime,
  month, setMonth, selectedDate, setSelectedDate,
}) {
  const qc = useQueryClient();
  const [editCap, setEditCap] = useState(DEFAULT_CAP);
  const [defaultEdit, setDefaultEdit] = useState(DEFAULT_CAP);
  const [defaultSaved, setDefaultSaved] = useState(false);
  const [daySaved, setDaySaved] = useState(false);
  // Tap-to-pick multi day selection. This replaces typing dates into a form:
  // hit Select, tap the days, close them.
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [bulkDone, setBulkDone] = useState('');
  // Days waiting on the confirm sheet. Nothing is written until she confirms.
  const [pendingBlock, setPendingBlock] = useState(null);
  const [showAllDaysOff, setShowAllDaysOff] = useState(false);
  const [showAllTimeBlocks, setShowAllTimeBlocks] = useState(false);
  // Day / Week / Month, the same three the Home calendar has. The Calendar tab
  // used to be month-only, which meant the one page devoted to the calendar
  // could show less than the picker on the home screen.
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'month';
    return localStorage.getItem('admin-calendar-view') || 'month';
  });
  const panelRef = useRef(null);

  // ── Data ──
  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => api.entities.AppSettings.filter({ key: SETTING_KEY }),
    staleTime: 30000,
  });
  const defaultCap = settings[0] ? parseInt(settings[0].value, 10) : DEFAULT_CAP;

  const { data: overrides = [] } = useQuery({
    queryKey: ['day-capacities'],
    queryFn: () => api.entities.DayCapacity.list('-date', 200),
    staleTime: 30000,
  });

  const { data: blocked = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
  });

  // ── Derived maps ──
  const overrideMap = useMemo(() => { const m = {}; overrides.forEach(o => { m[o.date] = o.capacity; }); return m; }, [overrides]);
  const overrideRecByDate = useMemo(() => { const m = {}; overrides.forEach(o => { m[o.date] = o; }); return m; }, [overrides]);
  const blockedRecByDate = useMemo(() => { const m = {}; blocked.forEach(b => { m[b.date] = b; }); return m; }, [blocked]);
  const blockedSet = useMemo(() => new Set(blocked.map(b => b.date)), [blocked]);
  const offMap = blockedRecByDate;

  const timeBlocks = useTimeBlocks();
  const evMap = useMemo(() => buildEventMap(bookings, classRegs, timeBlocks), [bookings, classRegs, timeBlocks]);
  const bookedMap = useMemo(() => buildBookedMap(bookings), [bookings]);

  const capFor = (key) => overrideMap[key] ?? defaultCap;
  const bookedFor = (key) => bookedMap[key] || 0;

  const tk = todayKeyOf();
  const upcomingOverrides = useMemo(
    () => overrides.filter(o => o.date >= tk).sort((a, b) => a.date.localeCompare(b.date)),
    [overrides, tk],
  );
  const upcomingBlocked = useMemo(
    () => blocked.filter(b => b.date >= tk).sort((a, b) => a.date.localeCompare(b.date)),
    [blocked, tk],
  );
  const blockedRuns = useMemo(() => groupRuns(upcomingBlocked), [upcomingBlocked]);
  // Today onward, soonest first; within a day, all-day blocks lead and the
  // rest run in start-time order.
  const upcomingTimeBlocks = useMemo(
    () => timeBlocks
      .filter(t => t.date >= tk)
      .sort((a, b) => a.date.localeCompare(b.date)
        || (windowMinutes(a.time)?.start ?? -1) - (windowMinutes(b.time)?.start ?? -1)),
    [timeBlocks, tk],
  );
  const fullyBookedSoon = useMemo(() => {
    let n = 0; const d = new Date();
    for (let i = 0; i < 30; i++) {
      const k = keyOf(d);
      const eff = overrideMap[k] ?? defaultCap;
      if (!blockedSet.has(k) && eff > 0 && (bookedMap[k] || 0) >= eff) n++;
      d.setDate(d.getDate() + 1);
    }
    return n;
  }, [overrideMap, bookedMap, blockedSet, defaultCap]);

  // ── Selected-day derived ──
  const selBooked = selectedDate ? bookedFor(selectedDate) : 0;
  const selBlocked = selectedDate ? blockedSet.has(selectedDate) : false;
  const selHasOverride = selectedDate ? overrideRecByDate[selectedDate] != null : false;
  const effForSelected = selectedDate ? capFor(selectedDate) : 0;
  const selEvents = selectedDate ? (evMap[selectedDate] || []) : [];

  // Day view IS a selection: the day on screen is the day the panel beside it
  // should be describing. Coming back to the tab with Day remembered left the
  // schedule showing today while the panel still said "Pick a day".
  useEffect(() => {
    if (view === 'day' && !selectedDate) setSelectedDate(todayKeyOf());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => { setDefaultEdit(defaultCap); }, [defaultCap]);
  useEffect(() => { if (selectedDate) setEditCap(effForSelected || defaultCap); }, [selectedDate, effForSelected, defaultCap]);

  // ── Mutations ──
  const invalidateCaps = () => {
    qc.invalidateQueries({ queryKey: ['app-settings'] });
    qc.invalidateQueries({ queryKey: ['booking-capacity'] });
  };
  const saveDefault = useMutation({
    mutationFn: async (val) => {
      const ex = settings[0];
      if (ex) await api.entities.AppSettings.update(ex.id, { value: String(val) });
      else await api.entities.AppSettings.create({ key: SETTING_KEY, value: String(val) });
    },
    onSuccess: () => { invalidateCaps(); setDefaultSaved(true); setTimeout(() => setDefaultSaved(false), 1800); },
  });
  const saveOverride = useMutation({
    mutationFn: async ({ date, capacity }) => {
      const ex = overrideRecByDate[date];
      if (ex) await api.entities.DayCapacity.update(ex.id, { capacity });
      else await api.entities.DayCapacity.create({ date, capacity });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['day-capacities'] }); setDaySaved(true); setTimeout(() => setDaySaved(false), 1600); },
  });
  const removeOverride = useMutation({
    mutationFn: async (date) => { const ex = overrideRecByDate[date]; if (ex) await api.entities.DayCapacity.delete(ex.id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['day-capacities'] }),
  });
  // Block / unblock update optimistically so the panel flips instantly.
  const blockDay = useMutation({
    mutationFn: (date) => api.entities.BlockedDate.create({ date, reason: '' }),
    onMutate: async (date) => {
      await qc.cancelQueries({ queryKey: ['blocked-dates'] });
      const prev = qc.getQueryData(['blocked-dates']);
      qc.setQueryData(['blocked-dates'], (old = []) =>
        old.some(b => b.date === date) ? old : [...old, { id: `temp-${date}`, date, reason: '' }]);
      return { prev };
    },
    onError: (_e, _date, ctx) => { if (ctx?.prev) qc.setQueryData(['blocked-dates'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });
  const unblockDay = useMutation({
    mutationFn: (date) => { const ex = blockedRecByDate[date]; return ex ? api.entities.BlockedDate.delete(ex.id) : Promise.resolve(); },
    onMutate: async (date) => {
      await qc.cancelQueries({ queryKey: ['blocked-dates'] });
      const prev = qc.getQueryData(['blocked-dates']);
      qc.setQueryData(['blocked-dates'], (old = []) => old.filter(b => b.date !== date));
      return { prev };
    },
    onError: (_e, _date, ctx) => { if (ctx?.prev) qc.setQueryData(['blocked-dates'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });

  // Whole selection in one request, with the reason from the confirm sheet.
  const blockMany = useMutation({
    mutationFn: ({ dates, reason }) => api.entities.BlockedDate.create(dates.map(date => ({ date, reason }))),
    onSuccess: (_d, { dates }) => {
      qc.invalidateQueries({ queryKey: ['blocked-dates'] });
      setBulkDone(`Closed ${dates.length} day${dates.length === 1 ? '' : 's'}`);
      setPendingBlock(null);
      exitSelect();
    },
  });
  const unblockMany = useMutation({
    mutationFn: (rows) => Promise.all(
      rows
        // Re-resolve against the cache so an optimistic temp row from a
        // just-blocked day doesn't send a bogus id to the server.
        .map(r => blockedRecByDate[r.date] || r)
        .filter(r => r?.id && !String(r.id).startsWith('temp-'))
        .map(r => api.entities.BlockedDate.delete(r.id)),
    ),
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: ['blocked-dates'] });
      const prev = qc.getQueryData(['blocked-dates']);
      const gone = new Set(rows.map(r => r.date));
      qc.setQueryData(['blocked-dates'], (old = []) => old.filter(b => !gone.has(b.date)));
      return { prev };
    },
    onError: (_e, _rows, ctx) => { if (ctx?.prev) qc.setQueryData(['blocked-dates'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });

  const exitSelect = () => { setSelectMode(false); setPicked(new Set()); };
  const togglePick = (key) => setPicked(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const pickedList = [...picked].sort();
  const toClose = pickedList.filter(d => !blockedSet.has(d));
  const toReopen = pickedList.filter(d => blockedSet.has(d)).map(d => blockedRecByDate[d]).filter(Boolean);

  useEffect(() => { if (!bulkDone) return; const t = setTimeout(() => setBulkDone(''), 3200); return () => clearTimeout(t); }, [bulkDone]);

  const jumpTo = (key) => { setSelectedDate(key); setMonth(new Date(key + 'T00:00:00')); };
  const openDay = (key) => setSelectedDate(prev => (prev === key ? null : key));

  // ── View plumbing ──
  // `month` is the cursor for every view: the month in Month, the week it falls
  // in for Week, the day itself for Day. So switching views never loses your
  // place, and the arrows always step the unit you're actually looking at.
  const changeView = (v) => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('admin-calendar-view', v);
    if (selectMode) exitSelect();
    if (v === 'day') {
      const key = selectedDate || keyOf(month);
      setSelectedDate(key);
      setMonth(new Date(key + 'T00:00:00'));
    } else if (selectedDate) {
      setMonth(new Date(selectedDate + 'T00:00:00'));
    }
  };
  const stepBy = (n) => {
    if (view === 'month') { setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); return; }
    const d = new Date(month); d.setDate(d.getDate() + n * 7); setMonth(d);
  };
  const goToday = () => { const t = new Date(); setMonth(t); if (view === 'day') setSelectedDate(keyOf(t)); };
  const goDay = (key) => { setSelectedDate(key); setMonth(new Date(key + 'T00:00:00')); };

  const weekStart = weekStartOf(month);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const headerTitle = view === 'week'
    ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : month.toLocaleString('default', { month: 'long' });
  const headerSubtitle = view === 'week' && weekStart.getFullYear() !== weekEnd.getFullYear()
    ? `${weekStart.getFullYear()} – ${weekEnd.getFullYear()}`
    : String(month.getFullYear());
  const now = new Date();
  const headerIsToday = view === 'week'
    ? (keyOf(now) >= keyOf(weekStart) && keyOf(now) <= keyOf(weekEnd))
    : (now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth());

  // Double-click on desktop, double-tap on a phone. A closed day reopens
  // straight away (nothing to confirm, it's not destructive); an open one goes
  // through the same confirm sheet as a bulk close.
  const doubleActivate = (key) => {
    if (blockedSet.has(key)) { unblockDay.mutate(key); setBulkDone(`Reopened ${fmtDay(key)}`); return; }
    setPendingBlock([key]);
  };

  // Bookings already sitting on the days about to be closed. Closing never
  // cancels, so she gets told before it happens, not after.
  const pendingConflicts = useMemo(() => {
    if (!pendingBlock?.length) return [];
    const inRange = new Set(pendingBlock);
    const out = [];
    (bookings || []).forEach(b => {
      if (inRange.has(b.date) && ['confirmed', 'pending'].includes(b.status)) {
        out.push({ date: b.date, label: b.name || 'Client', kind: b.service || 'Appointment' });
      }
      if (inRange.has(b.consultation_date) && b.status !== 'cancelled') {
        out.push({ date: b.consultation_date, label: b.name || 'Client', kind: 'Consultation' });
      }
    });
    (classRegs || []).forEach(c => {
      if (inRange.has(c.appointment_date)) out.push({ date: c.appointment_date, label: c.full_name || 'Client', kind: 'Class' });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [pendingBlock, bookings, classRegs]);

  // On a phone the control panel sits below the calendar, so tapping a date
  // used to leave "Close this day off" off-screen. Go through Lenis, which
  // owns the scroll position (a bare scrollIntoView gets undone by its RAF).
  useEffect(() => {
    // Day view changes the date in place; jumping the page to the panel under
    // the schedule every time she steps a day would be motion sickness.
    if (!selectedDate || selectMode || view === 'day' || typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1280px)').matches) return; // side by side already
    const id = requestAnimationFrame(() => {
      if (panelRef.current) scrollToTarget(panelRef.current, { offset: -72 });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDate, selectMode, view]);


  const spotsLeft = effForSelected - selBooked;

  // ── Glance stats ── one slim line, not four cards: they're context for the
  // grid, not the headline.
  const stats = [
    { label: 'Spots / day', value: defaultCap, tone: 'neutral' },
    { label: 'Booked out 30d', value: fullyBookedSoon, tone: fullyBookedSoon > 0 ? 'warn' : 'neutral' },
    { label: 'Custom days', value: upcomingOverrides.length, tone: 'accent' },
    { label: 'Days off', value: upcomingBlocked.length, tone: upcomingBlocked.length > 0 ? 'danger' : 'neutral' },
  ];
  const TONE_TEXT = { warn: 'text-tone-alert', danger: 'text-tone-alert', accent: 'text-rose', neutral: 'text-ink' };

  // Same order and the same swatches as the Home calendar's key.
  const LEGEND = [
    { c: STATUS_COLORS.pending, label: 'Pending' },
    { c: STATUS_COLORS.confirmed, label: 'Confirmed' },
    { c: STATUS_COLORS.completed, label: 'Completed' },
    { c: CONSULT_INK[dm ? 'dark' : 'light'], label: 'Consultation' },
    { c: CLASS_PINK, label: 'Makeup class' },
  ];
  const swatch = 'flex items-center gap-1.5 text-[0.66rem] font-medium text-ink-muted';

  // Tap a client anywhere on this tab (a day's list, or a chip in the grid)
  // and their card takes over the tab. Jump to the top first, otherwise the
  // card opens at whatever scroll depth the calendar was at.
  const openEvent = (ev) => {
    // Blocked time opens its editor over the calendar, so there's no page to
    // jump to the top of.
    if (ev.kind === 'block') { onSelectTimeBlock?.(ev.raw); return; }
    scrollToTarget(0, { immediate: true });
    if (ev.kind === 'class') onSelectClassReg?.(ev.raw);
    else onSelect?.(ev.raw);
  };

  // A whole row is the target, with a small action of its own on the right.
  // Enter on that inner button must stay its own, so the row only answers keys
  // aimed at the row itself.
  const rowKeys = (go) => (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
  };

  const dayOffRow = (run) => {
    const many = run.items.length > 1;
    const isSel = run.items.some(i => i.date === selectedDate);
    return (
      <div
        key={`${run.start}-${run.end}`}
        role="button"
        tabIndex={0}
        onClick={() => jumpTo(run.start)}
        onKeyDown={rowKeys(() => jumpTo(run.start))}
        className={cx(
          'flex cursor-pointer items-center justify-between gap-3 py-2 pl-4 pr-2 transition-colors duration-200 sm:pl-5 sm:pr-3',
          isSel ? 'bg-tone-alert/[0.05]' : 'hover:bg-canvas/60',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Cross className="h-2.5 w-2.5 shrink-0 text-tone-alert" strokeWidth={3} />
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium text-ink">
              {many ? `${fmtDay(run.start)} to ${fmtDay(run.end)}` : fmtDay(run.start)}
            </p>
            {(many || run.reason) && (
              <p className="truncate text-[0.74rem] text-ink-muted">
                {many ? `${run.items.length} days` : ''}{many && run.reason ? ' · ' : ''}{run.reason}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); unblockMany.mutate(run.items); }}
          className="press h-9 shrink-0 rounded-ctl px-2.5 text-[0.74rem] font-medium text-ink-muted hover:bg-canvas hover:text-rose"
        >
          {many ? 'Reopen all' : 'Reopen'}
        </button>
      </div>
    );
  };

  const timeBlockRow = (t) => {
    const isSel = t.date === selectedDate;
    return (
      <div
        key={t.id}
        role="button"
        tabIndex={0}
        onClick={() => jumpTo(t.date)}
        onKeyDown={rowKeys(() => jumpTo(t.date))}
        className={cx(
          'flex cursor-pointer items-center justify-between gap-3 py-2 pl-4 pr-2 transition-colors duration-200 sm:pl-5 sm:pr-3',
          isSel ? 'bg-canvas' : 'hover:bg-canvas/60',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-1.5 w-1.5 shrink-0" style={{ background: BLOCK_INK[dm ? 'dark' : 'light'] }} />
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium tabular-nums text-ink">
              {fmtDay(t.date)} · {t.time || 'All day'}
            </p>
            <p className="truncate text-[0.74rem] text-ink-muted">{blockLabel(t)}</p>
          </div>
        </div>
        {onSelectTimeBlock && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectTimeBlock(t); }}
            className="press h-9 shrink-0 rounded-ctl px-2.5 text-[0.74rem] font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            Edit
          </button>
        )}
      </div>
    );
  };

  // The first few rows, then the rest folded away behind one line.
  const foldList = (rows, open, setOpen, render) => (
    <>
      <div className="divide-y divide-line">{rows.slice(0, LIST_CAP).map(render)}</div>
      {rows.length > LIST_CAP && (
        <>
          <Fold open={open} lazy>
            <div className="divide-y divide-line border-t border-line">{rows.slice(LIST_CAP).map(render)}</div>
          </Fold>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[0.76rem] font-medium text-ink-soft transition-colors hover:bg-canvas/60 hover:text-ink"
          >
            {open ? 'Show less' : `Show all ${rows.length}`}
            <Chevron open={open} className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </>
  );

  return (
    <div className="pb-4">
      {/* The side panel is where a day is actually read, so it gets real
          width; the grid beside it is the overview and gives some up. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5">
        {/* ── Calendar ── */}
        <section className="min-w-0 rounded-card border border-line bg-paper p-4 sm:p-6">
          {/* View switcher and Select days share one line, so the date and the
              grid start near the top of the card. */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              size="sm"
              value={view}
              onChange={changeView}
              options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
            />

            <div className="flex shrink-0 items-center gap-2">
              {/* Block off time, from the page it belongs on. It used to be
                  reachable here only after tapping a day, so the Calendar tab
                  looked like it couldn't do it at all. Starts on the day that's
                  picked, if one is; otherwise the panel asks which day. Hidden
                  while picking days, where every tap means "close this day". */}
              {onBlockTime && !selectMode && (
                <button
                  type="button"
                  onClick={() => onBlockTime(selectedDate || (view === 'day' ? tk : null))}
                  className={buttonClass('quiet', 'sm')}
                >
                  <ClockIcon />
                  <span className="sm:hidden">Block time</span>
                  <span className="hidden sm:inline">Block off time</span>
                </button>
              )}

              {/* Select: the whole point, pick days by tapping them. A single
                  day in Day view is already selected, so there's nothing to pick. */}
              {view !== 'day' && (
                <button
                  type="button"
                  onClick={() => (selectMode ? exitSelect() : (setSelectMode(true), setSelectedDate(null)))}
                  aria-pressed={selectMode}
                  className={buttonClass(selectMode ? 'solid' : 'quiet', 'sm')}
                >
                  {selectMode ? 'Cancel' : 'Select days'}
                </button>
              )}
            </div>
          </div>

          {view === 'day' ? (
            /* The real time grid, the same one Home and the client card use.
               It brings its own centred header, so this view doesn't add a
               second one above it. */
            <ScheduleView
              bookings={bookings}
              classRegs={classRegs}
              dateKey={selectedDate || tk}
              onChangeDate={goDay}
              onSelectBooking={(b) => openEvent({ kind: 'appt', raw: b })}
              onSelectClassReg={(r) => openEvent({ kind: 'class', raw: r })}
              onSelectTimeBlock={(t) => openEvent({ kind: 'block', raw: t })}
              dm={dm}
            />
          ) : (
            <>
              {/* The date, centred and large, directly above the grid it names,
                  and tappable, so a month six months out is two taps rather
                  than six presses of an arrow. */}
              <CalendarHeader
                title={headerTitle}
                subtitle={headerSubtitle}
                onStep={stepBy}
                stepUnit={view}
                jumpDate={month}
                onJump={(m, y) => setMonth(new Date(y, m, view === 'week' ? Math.min(month.getDate(), new Date(y, m + 1, 0).getDate()) : 1))}
                onToday={goToday}
                isToday={headerIsToday}
                big
                dm={dm}
                className="mb-3"
              />

              {/* No min-width and no sideways scrolling: the grid fits whatever
                  screen it's on, so today is always visible without swiping. */}
              <MonthCalendar
                cur={month}
                weekOf={view === 'week' ? month : null}
                evMap={evMap}
                offMap={offMap}
                todayKey={tk}
                dm={dm}
                capFor={capFor}
                bookedFor={bookedFor}
                activeDay={selectedDate}
                onOpenDay={openDay}
                onDoubleActivate={doubleActivate}
                selectMode={selectMode}
                selectedDays={picked}
                onToggleDay={togglePick}
                onEventClick={openEvent}
              />
            </>
          )}

          {/* Action bar for the tapped days. Replaces the old typed date range. */}
          {selectMode ? (
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
              <span className="text-[0.86rem] font-semibold text-ink">
                {pickedList.length === 0
                  ? 'Tap the days you want to close'
                  : `${pickedList.length} day${pickedList.length === 1 ? '' : 's'} selected`}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {toReopen.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { unblockMany.mutate(toReopen); setBulkDone(`Reopened ${toReopen.length} day${toReopen.length === 1 ? '' : 's'}`); exitSelect(); }}
                    className={buttonClass('quiet', 'md')}
                  >
                    Reopen {toReopen.length}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPendingBlock(toClose)}
                  disabled={!toClose.length || blockMany.isPending}
                  className={alertSolid}
                >
                  {blockMany.isPending ? 'Closing…' : toClose.length ? `Close ${toClose.length} day${toClose.length === 1 ? '' : 's'} off` : 'Close days off'}
                </button>
              </div>
            </div>
          ) : (
            /* The numbers and the key, under the calendar rather than over it:
               they're context for the grid, not the headline. */
            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                {stats.map((s, i) => (
                  <Fragment key={s.label}>
                    {i > 0 && <span className="hidden h-3 w-px bg-line sm:block" />}
                    <span className="flex items-baseline gap-1.5">
                      <span className={cx('text-[0.92rem] font-semibold leading-none tabular-nums', TONE_TEXT[s.tone])}>{s.value}</span>
                      <span className="whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{s.label}</span>
                    </span>
                  </Fragment>
                ))}
              </div>
              {view !== 'day' && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className={cx(swatch, 'text-tone-alert')}>
                    <span className="inline-flex h-3 w-3 items-center justify-center border border-tone-alert/30 bg-tone-alert/[0.06]">
                      <Cross className="h-1.5 w-1.5" strokeWidth={3.5} />
                    </span> Day off
                  </span>
                  {LEGEND.map(l => (
                    <span key={l.label} className={swatch}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.c }} /> {l.label}
                    </span>
                  ))}
                  <span className={swatch}>
                    <span className="inline-block h-2 w-2" style={{ background: BLOCK_INK[dm ? 'dark' : 'light'] }} /> Blocked time
                  </span>
                </div>
              )}
            </div>
          )}

          {bulkDone && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.74rem] font-medium text-rose">
              <Check className="h-3 w-3" strokeWidth={3} />{bulkDone}
            </p>
          )}
          {blockMany.isError && (
            <p className="mt-3 text-center text-[0.74rem] text-tone-alert">Couldn't save that. Check your connection and try again.</p>
          )}
        </section>

        {/* ── Control panel ── */}
        <div ref={panelRef} className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-20">
          {selectMode ? (
            <section className="rounded-card border border-line bg-paper px-4 py-4 sm:px-5">
              <p className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">Picking days</p>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-muted">
                Tap every day you're away, then hit the close button. They don't have to be in a row, and you can jump between months while you pick.
              </p>
              {pickedList.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {pickedList.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => togglePick(d)}
                      aria-label={`Remove ${fmtDay(d)}`}
                      className="press inline-flex h-8 items-center gap-1.5 rounded-ctl bg-tone-alert/10 px-2.5 text-[0.74rem] font-medium tabular-nums text-tone-alert hover:bg-tone-alert/15"
                    >
                      {fmtDay(d)} <Cross className="h-2 w-2" strokeWidth={3.5} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : selectedDate ? (
            <Panel bodyClassName="divide-y divide-line">
              <DayHead
                dateKey={selectedDate}
                action={selHasOverride && !selBlocked ? <Tag className="bg-rose/10 text-rose">Custom</Tag> : null}
                className="px-4 py-5 sm:px-5"
              />

              <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <CapacityRing booked={selBooked} capacity={effForSelected} blocked={selBlocked} />
                <div className="min-w-0">
                  {selBlocked ? (
                    <>
                      <p className="text-[0.86rem] font-semibold text-tone-alert">Closed to bookings</p>
                      <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-muted">
                        Clients can't book this day.{blockedRecByDate[selectedDate]?.reason ? ` ${blockedRecByDate[selectedDate].reason}.` : ''}
                        {selEvents.length > 0 && ' Anything already booked still stands.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={cx('text-[0.92rem] font-semibold', spotsLeft <= 0 ? 'text-tone-alert' : 'text-ink')}>
                        {spotsLeft <= 0 ? 'Fully booked' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} open`}
                      </p>
                      <p className="mt-1 text-[0.8rem] leading-relaxed tabular-nums text-ink-muted">
                        {selBooked} of {effForSelected} booked
                        {selHasOverride ? ' · custom limit' : ` · default (${defaultCap})`}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* What's actually on the day. Consultations and classes live here
                  too, which is why the capacity number above says "booked" and
                  doesn't try to count them. */}
              {selEvents.length > 0 && (
                <div className="px-4 py-4 sm:px-5">
                  <Label className="tabular-nums">On this day · {selEvents.length}</Label>
                  {/* A card each, sized to be read: what it is, who, when and
                      where, and where it stands. These were 12px rows in a
                      320px column, the smallest type on the page for the one
                      thing she opened the panel to see. */}
                  <div className="mt-3 flex flex-col gap-2">
                    {selEvents.map(ev => <AgendaCard key={ev.id} ev={ev} onOpen={openEvent} dm={dm} />)}
                  </div>
                </div>
              )}

              {!selBlocked && (
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[0.8rem] font-medium text-ink-soft">Limit:</span>
                    <Stepper value={editCap} onChange={setEditCap} />
                    <span className="text-[0.8rem] text-ink-muted">spots</span>
                    <button
                      type="button"
                      onClick={() => saveOverride.mutate({ date: selectedDate, capacity: editCap })}
                      disabled={editCap === effForSelected || saveOverride.isPending}
                      className={buttonClass('solid', 'sm', 'ml-auto h-11 sm:h-9')}
                    >
                      {saveOverride.isPending ? 'Saving…'
                        : daySaved ? <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3" strokeWidth={3.2} />Saved</span>
                        : 'Set limit'}
                    </button>
                  </div>
                  {selHasOverride && (
                    <button
                      type="button"
                      onClick={() => removeOverride.mutate(selectedDate)}
                      className="press -ml-1 mt-2 inline-flex h-9 items-center gap-1.5 rounded-ctl px-1 text-[0.76rem] font-medium text-ink-muted hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                      </svg>
                      Reset to default ({defaultCap} spots)
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
                {selBlocked ? (
                  <button type="button" onClick={() => unblockDay.mutate(selectedDate)} className={panelBtn('quiet')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                      <path d="M8 11V7a4 4 0 0 1 8 0M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
                    </svg>
                    Reopen this day
                  </button>
                ) : (
                  <>
                    {/* Part of a day, with a note. Same panel as Add Client, opened
                        on its Block off time side with this date filled in. */}
                    {onBlockTime && (
                      <button type="button" onClick={() => onBlockTime(selectedDate)} className={panelBtn('quiet')}>
                        <ClockIcon className="h-4 w-4" />
                        Block off time
                      </button>
                    )}
                    <button type="button" onClick={() => blockDay.mutate(selectedDate)} className={panelBtn('danger')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                        <rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      Close this day off
                    </button>
                  </>
                )}
              </div>
            </Panel>
          ) : (
            <section className="flex flex-col items-center rounded-card border border-line bg-paper px-6 py-8 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-wash text-rose">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                  <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18" /><path d="M8 2.5v4M16 2.5v4" />
                </svg>
              </span>
              <p className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">Pick a day</p>
              {/* The how-to that used to be a paragraph above the calendar. It
                  lives here now, in space that was empty anyway. */}
              <p className="mt-1.5 max-w-[240px] text-[0.8rem] leading-relaxed text-ink-muted">
                Tap any date to see what's on it, set its booking limit, or close it off.
              </p>
              <p className="mt-2.5 max-w-[240px] text-[0.74rem] leading-relaxed text-ink-muted/80">
                Double-tap closes a day straight off. For a whole trip, hit <span className="font-semibold text-ink-soft">Select days</span>. For part of a day, <span className="font-semibold text-ink-soft">Block off time</span>.
              </p>
            </section>
          )}

          {/* Days off: consecutive days collapse into one trip. No inner
              scrollbar: page-level Lenis owns the wheel, so a nested scroller
              here just felt stuck. It grows instead, and folds anything past
              the first few behind a toggle. */}
          {blockedRuns.length > 0 && (
            <Panel title="Days off" sub={`${upcomingBlocked.length} coming up`}>
              {foldList(blockedRuns, showAllDaysOff, setShowAllDaysOff, dayOffRow)}
            </Panel>
          )}

          {/* Blocked time: the part-of-a-day blocks, listed the way Days off
              lists whole days, so everything she has taken off the schedule
              can be found on this one page. Tapping a row shows its day;
              Edit opens the same panel it was made in, to change or delete. */}
          {upcomingTimeBlocks.length > 0 && (
            <Panel title="Blocked time" sub={`${upcomingTimeBlocks.length} coming up`}>
              {foldList(upcomingTimeBlocks, showAllTimeBlocks, setShowAllTimeBlocks, timeBlockRow)}
            </Panel>
          )}

          {/* Default capacity */}
          <Panel title="Default capacity" bodyClassName="px-4 py-4 sm:px-5">
            <p className="mb-4 text-[0.8rem] leading-relaxed text-ink-muted">
              How many bookings you'll take on a day without its own limit.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Stepper value={defaultEdit} onChange={setDefaultEdit} />
              <span className="text-[0.8rem] text-ink-muted">spots / day</span>
              <button
                type="button"
                onClick={() => saveDefault.mutate(defaultEdit)}
                disabled={defaultEdit === defaultCap || saveDefault.isPending}
                className={buttonClass('solid', 'sm', 'ml-auto h-11 sm:h-9')}
              >
                {saveDefault.isPending ? 'Saving…'
                  : defaultSaved ? <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3" strokeWidth={3.2} />Saved</span>
                  : 'Save'}
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {pendingBlock?.length > 0 && (
        <BlockDaysSheet
          dates={pendingBlock}
          conflicts={pendingConflicts}
          busy={blockMany.isPending}
          dm={dm}
          onConfirm={(reason) => blockMany.mutate({ dates: pendingBlock, reason })}
          onClose={() => setPendingBlock(null)}
        />
      )}
    </div>
  );
}
