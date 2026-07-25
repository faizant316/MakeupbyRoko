import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scrollToTarget } from '@/lib/lenis';
import MonthCalendar, { OFF_RED, CLASS_PINK, startTime, dotOf } from './MonthCalendar';
import BlockDaysSheet from './BlockDaysSheet';
import { buildEventMap, buildBookedMap } from './calendarEvents';
import { STATUS_COLORS, CONSULT_INK } from './statusColors';

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

// ── Circular capacity meter ─────────────────────────────────
function CapacityRing({ booked, capacity, blocked, dm }) {
  const size = 92, stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = blocked ? 1 : capacity > 0 ? Math.min(1, booked / capacity) : 0;
  const full = !blocked && capacity > 0 && booked >= capacity;
  const track = dm ? '#2e2e38' : '#EAEAF1';
  const color = blocked ? OFF_RED : full ? '#E0795B' : booked > 0 ? '#D4A0B0' : (dm ? '#52525b' : '#D2D2DB');
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.22,1,0.36,1), stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {blocked ? (
          <span className="text-[0.58rem] font-bold tracking-[0.12em] uppercase" style={{ color: OFF_RED }}>Closed</span>
        ) : (
          <>
            <span className="font-serif leading-none" style={{ fontSize: '1.5rem', color: dm ? '#e4e4e7' : '#1a1a1a' }}>{booked}</span>
            <span className="text-[0.55rem] font-medium mt-1 tracking-wide" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>of {capacity}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Stepper ─────────────────────────────────────────────────
function Stepper({ value, onChange, min = 1, max = 20, dm }) {
  const btn = 'w-9 h-9 flex items-center justify-center transition-colors text-lg select-none';
  const btnStyle = { color: dm ? '#a1a1aa' : '#999', background: dm ? '#1e1e24' : 'transparent' };
  const bd = dm ? '#3a3a48' : '#E5E7EB';
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${bd}` }}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className={btn} style={btnStyle}>−</button>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
        className="w-11 h-9 text-center text-[0.95rem] font-semibold outline-none"
        style={{ color: dm ? '#e4e4e7' : '#111', borderLeft: `1px solid ${bd}`, borderRight: `1px solid ${bd}`, background: dm ? '#26262e' : '#fff' }}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className={btn} style={btnStyle}>+</button>
    </div>
  );
}

export default function AvailabilityTab({ bookings = [], classRegs = [], darkMode: dm, onSelect, onSelectClassReg }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
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

  const evMap = useMemo(() => buildEventMap(bookings, classRegs), [bookings, classRegs]);
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
    if (!selectedDate || selectMode || typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1280px)').matches) return; // side by side already
    const id = requestAnimationFrame(() => {
      if (panelRef.current) scrollToTarget(panelRef.current, { offset: -72 });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDate, selectMode]);

  const card = { background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#E5E7EB'}` };
  const spotsLeft = effForSelected - selBooked;

  // ── Glance stats ──
  const stats = [
    { label: 'Spots / day', value: defaultCap, tone: 'neutral' },
    { label: 'Booked out · 30d', value: fullyBookedSoon, tone: fullyBookedSoon > 0 ? 'warn' : 'neutral' },
    { label: 'Custom days', value: upcomingOverrides.length, tone: 'accent' },
    { label: 'Days off', value: upcomingBlocked.length, tone: upcomingBlocked.length > 0 ? 'danger' : 'neutral' },
  ];
  const toneColor = (t) => t === 'warn' ? '#E0795B' : t === 'danger' ? OFF_RED : t === 'accent' ? '#A0607A' : (dm ? '#e4e4e7' : '#1a1a1a');

  const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' });
  const navBtn = 'w-8 h-8 rounded-lg flex items-center justify-center text-base font-medium transition-all flex-shrink-0';
  const navStyle = { background: dm ? '#2a2a31' : '#F2F2F7', color: dm ? '#a1a1aa' : '#777' };

  const LEGEND = [
    { c: STATUS_COLORS.pending, label: 'Pending' },
    { c: STATUS_COLORS.confirmed, label: 'Confirmed' },
    { c: STATUS_COLORS.completed, label: 'Completed' },
    { c: CONSULT_INK.light, label: 'Consultation' },
    { c: CLASS_PINK, label: 'Makeup Class' },
    { c: OFF_RED, label: 'Day off' },
  ];

  // Tap a client anywhere on this tab (a day's list, or a chip in the grid)
  // and their card takes over the tab. Jump to the top first, otherwise the
  // card opens at whatever scroll depth the calendar was at.
  const openEvent = (ev) => {
    scrollToTarget(0, { immediate: true });
    if (ev.kind === 'class') onSelectClassReg?.(ev.raw);
    else onSelect?.(ev.raw);
  };

  return (
    <div className="pb-4">
      <p className="text-[0.8rem] leading-relaxed mb-5 max-w-2xl" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
        Everything on your calendar, and everything you're closed for, in one place. Tap a day to see it, or double-tap it to close it off.
        To take a whole trip off, hit <span className="font-semibold" style={{ color: dm ? '#d4d4d8' : '#55555d' }}>Select days</span>, tap the days, then close them together.
        Mondays and Thursdays are always closed, so you never need to block those.
      </p>

      {/* Glance stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl px-3.5 py-3" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#EAEAF0'}` }}>
            <p className="text-[1.5rem] font-serif leading-none" style={{ color: toneColor(s.tone) }}>{s.value}</p>
            <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mt-2 truncate" style={{ color: dm ? '#71717a' : '#A6A6AF' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* ── Calendar ── */}
        <div className="rounded-xl p-4 sm:p-5 min-w-0" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#ECECF1'}` }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className={navBtn} style={navStyle} aria-label="Previous month">‹</button>
              <span className="text-[0.9rem] sm:text-[0.95rem] font-semibold tracking-tight text-center min-w-[130px] sm:min-w-[150px]" style={{ color: dm ? '#e4e4e7' : '#111' }}>{monthLabel}</span>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className={navBtn} style={navStyle} aria-label="Next month">›</button>
              <button onClick={() => { setMonth(new Date()); setSelectedDate(tk); }}
                className="ml-1 text-[0.68rem] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                style={{ background: dm ? 'rgba(113,113,122,0.14)' : '#EFEFF6', color: dm ? '#a1a1aa' : '#52525b' }}>
                Today
              </button>
            </div>

            {/* Select — the whole point: pick days by tapping them */}
            <button
              onClick={() => (selectMode ? exitSelect() : (setSelectMode(true), setSelectedDate(null)))}
              className="text-[0.68rem] font-semibold tracking-[0.06em] px-3.5 py-1.5 rounded-lg transition-all flex-shrink-0 active:scale-95"
              style={selectMode
                ? { background: '#E05549', color: '#fff' }
                : { background: 'transparent', color: dm ? '#a1a1aa' : '#6b6b73', border: `1px solid ${dm ? '#34343d' : '#E5E6EC'}` }}>
              {selectMode ? 'Cancel' : 'Select days'}
            </button>
          </div>

          {/* No min-width and no sideways scrolling: the grid fits whatever
              screen it's on, so today is always visible without swiping. */}
          <MonthCalendar
            cur={month}
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

          {/* Action bar for the tapped days. Replaces the old typed date range. */}
          {selectMode ? (
            <div className="mt-4 pt-4 flex items-center gap-2.5 flex-wrap" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
              <span className="text-[0.78rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
                {pickedList.length === 0
                  ? 'Tap the days you want to close'
                  : `${pickedList.length} day${pickedList.length === 1 ? '' : 's'} selected`}
              </span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {toReopen.length > 0 && (
                  <button
                    onClick={() => { unblockMany.mutate(toReopen); setBulkDone(`Reopened ${toReopen.length} day${toReopen.length === 1 ? '' : 's'}`); exitSelect(); }}
                    className="px-3.5 py-2 rounded-xl text-[0.72rem] font-semibold transition-all active:scale-95"
                    style={{ background: dm ? 'rgba(212,160,176,0.14)' : '#FDF5F8', color: '#A0607A', border: `1.5px solid ${dm ? 'rgba(212,160,176,0.5)' : '#EFD0DE'}` }}>
                    Reopen {toReopen.length}
                  </button>
                )}
                <button
                  onClick={() => setPendingBlock(toClose)}
                  disabled={!toClose.length || blockMany.isPending}
                  className="px-4 py-2 rounded-xl text-[0.72rem] font-semibold transition-all active:scale-95"
                  style={!toClose.length
                    ? { background: dm ? '#2e2e38' : '#F0F0F4', color: dm ? '#52525b' : '#b4b4bd', cursor: 'not-allowed' }
                    : { background: '#E05549', color: '#fff', boxShadow: '0 1px 3px rgba(224,85,73,0.25)' }}>
                  {blockMany.isPending ? 'Closing…' : toClose.length ? `Close ${toClose.length} day${toClose.length === 1 ? '' : 's'} off` : 'Close days off'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 flex-wrap mt-4 pt-3.5" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
              {LEGEND.map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.c }} /> {l.label}
                </span>
              ))}
            </div>
          )}

          {bulkDone && (
            <p className="text-[0.72rem] font-medium mt-3 text-center" style={{ color: '#A0607A' }}>✓ {bulkDone}</p>
          )}
          {blockMany.isError && (
            <p className="text-[0.72rem] mt-3 text-center" style={{ color: '#E05549' }}>Couldn't save that. Check your connection and try again.</p>
          )}
        </div>

        {/* ── Control panel ── */}
        <div ref={panelRef} className="xl:sticky xl:top-20 flex flex-col gap-4 min-w-0">
          {selectMode ? (
            <div className="rounded-xl p-5" style={card}>
              <p className="text-[0.85rem] font-semibold mb-1.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>Picking days</p>
              <p className="text-[0.72rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
                Tap every day you're away, then hit the close button. They don't have to be in a row, and you can jump between months while you pick.
              </p>
              {pickedList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {pickedList.map(d => (
                    <button key={d} onClick={() => togglePick(d)}
                      className="text-[0.62rem] font-medium px-2 py-1 rounded-lg transition-all"
                      style={{ background: dm ? 'rgba(224,85,73,0.16)' : '#FFF4F2', color: '#C0392B', border: '1px solid rgba(224,85,73,0.35)' }}>
                      {fmtDay(d)} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : selectedDate ? (
            <div className="rounded-xl p-5" style={card}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-serif text-[1.05rem]" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                  {fmtDay(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selHasOverride && !selBlocked && (
                  <span className="text-[0.55rem] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(212,160,176,0.16)', color: '#A0607A' }}>Custom</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <CapacityRing booked={selBooked} capacity={effForSelected} blocked={selBlocked} dm={dm} />
                <div className="min-w-0">
                  {selBlocked ? (
                    <>
                      <p className="text-[0.85rem] font-semibold" style={{ color: OFF_RED }}>Closed to bookings</p>
                      <p className="text-[0.72rem] mt-1 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
                        Clients can't book this day.{blockedRecByDate[selectedDate]?.reason ? ` ${blockedRecByDate[selectedDate].reason}.` : ''}
                        {selEvents.length > 0 && ' Anything already booked still stands.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[0.92rem] font-semibold" style={{ color: spotsLeft <= 0 ? '#E0795B' : (dm ? '#e4e4e7' : '#1a1a1a') }}>
                        {spotsLeft <= 0 ? 'Fully booked' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} open`}
                      </p>
                      <p className="text-[0.72rem] mt-1 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
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
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
                  <p className="text-[0.58rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: dm ? '#71717a' : '#A6A6AF' }}>
                    On this day · {selEvents.length}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {selEvents.map(ev => {
                      const dot = dotOf(ev, dm);
                      return (
                        <button key={ev.id} onClick={() => openEvent(ev)}
                          className="w-full flex items-center gap-2.5 text-left rounded-xl px-2.5 py-2 transition-colors"
                          style={{ background: dm ? '#1e1e24' : '#FAFAFC', border: `1px solid ${dm ? '#3a3a48' : '#EDEDF2'}`, borderLeft: `3px solid ${dot}` }}
                          onMouseEnter={e => e.currentTarget.style.background = dm ? '#2e2e37' : '#F4F4F8'}
                          onMouseLeave={e => e.currentTarget.style.background = dm ? '#1e1e24' : '#FAFAFC'}>
                          <span className="text-[0.66rem] font-semibold tabular-nums flex-shrink-0 w-[52px]" style={{ color: dm ? '#8b8b95' : '#9c9ca6' }}>
                            {startTime(ev.time) || '—'}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[0.76rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>{ev.name}</span>
                            <span className="block text-[0.65rem] truncate" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>{ev.detail}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!selBlocked && (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[0.72rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#555' }}>Limit:</span>
                    <Stepper value={editCap} onChange={setEditCap} dm={dm} />
                    <span className="text-[0.7rem]" style={{ color: dm ? '#71717a' : '#999' }}>spots</span>
                    <button
                      onClick={() => saveOverride.mutate({ date: selectedDate, capacity: editCap })}
                      disabled={editCap === effForSelected || saveOverride.isPending}
                      className="ml-auto px-4 py-2 rounded-xl text-[0.72rem] font-semibold transition-all"
                      style={editCap === effForSelected
                        ? { background: dm ? '#2e2e38' : '#F0F0F4', color: dm ? '#52525b' : '#bcae9e', cursor: 'not-allowed' }
                        : { background: '#D4A0B0', color: '#fff', boxShadow: '0 1px 3px rgba(160,96,122,0.25)' }}>
                      {saveOverride.isPending ? 'Saving…' : daySaved ? '✓ Saved' : 'Set limit'}
                    </button>
                  </div>
                  {selHasOverride && (
                    <button
                      onClick={() => removeOverride.mutate(selectedDate)}
                      className="mt-3 text-[0.68rem] font-medium transition-colors hover:opacity-70"
                      style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
                      ↺ Reset to default ({defaultCap} spots)
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
                {selBlocked ? (
                  <button
                    onClick={() => unblockDay.mutate(selectedDate)}
                    className="w-full py-2.5 rounded-xl text-[0.72rem] font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
                    style={{ background: dm ? 'rgba(212,160,176,0.14)' : '#FDF5F8', color: '#A0607A', border: `1.5px solid ${dm ? 'rgba(212,160,176,0.5)' : '#EFD0DE'}` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M8 11V7a4 4 0 0 1 8 0M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>
                    </svg>
                    Reopen this day
                  </button>
                ) : (
                  <button
                    onClick={() => blockDay.mutate(selectedDate)}
                    className="w-full py-2.5 rounded-xl text-[0.72rem] font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
                    style={{ background: dm ? 'rgba(239,68,68,0.1)' : '#FFF6F5', color: '#E05549', border: `1.5px solid ${dm ? 'rgba(239,68,68,0.45)' : '#F3CBC6'}` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                    </svg>
                    Close this day off
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-6 flex flex-col items-center text-center" style={card}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(212,160,176,0.12)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18" /><path d="M8 2.5v4M16 2.5v4" />
                </svg>
              </div>
              <p className="text-[0.85rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>Pick a day</p>
              <p className="text-[0.72rem] mt-1.5 leading-relaxed max-w-[230px]" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
                Tap any date to see what's on it, set its booking limit, or close it off.
              </p>
            </div>
          )}

          {/* Days off — consecutive days collapse into one trip */}
          {blockedRuns.length > 0 && (
            <div className="rounded-xl p-5" style={card}>
              <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: dm ? '#71717a' : '#A6A6AF' }}>
                Days off · {upcomingBlocked.length} coming up
              </p>
              {/* No inner scrollbar. Page-level Lenis owns the wheel, so a
                  nested scroller here just felt stuck. It grows instead, and
                  folds anything past the first few behind a toggle. */}
              <div className="flex flex-col gap-1.5">
                {(showAllDaysOff ? blockedRuns : blockedRuns.slice(0, 5)).map(run => {
                  const many = run.items.length > 1;
                  const isSel = run.items.some(i => i.date === selectedDate);
                  return (
                    <div key={`${run.start}-${run.end}`}
                      onClick={() => jumpTo(run.start)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
                      style={{ background: isSel ? (dm ? '#2e1e1e' : '#FEF2F2') : (dm ? '#1e1e24' : '#FdF8F7'), border: `1px solid ${isSel ? 'rgba(239,68,68,0.5)' : (dm ? '#3a3a48' : '#f3e6e2')}` }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[0.7rem] flex-shrink-0" style={{ color: OFF_RED }}>✕</span>
                        <div className="min-w-0">
                          <p className="text-[0.72rem] font-medium truncate" style={{ color: dm ? '#d4d4d8' : '#111' }}>
                            {many ? `${fmtDay(run.start)} to ${fmtDay(run.end)}` : fmtDay(run.start)}
                          </p>
                          {(many || run.reason) && (
                            <p className="text-[0.63rem] truncate" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
                              {many ? `${run.items.length} days` : ''}{many && run.reason ? ' · ' : ''}{run.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); unblockMany.mutate(run.items); }}
                        className="text-[0.62rem] font-semibold px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                        style={{ color: dm ? '#a1a1aa' : '#9c9ca4' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#A0607A'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = dm ? '#a1a1aa' : '#9c9ca4'; }}>
                        {many ? 'Reopen all' : 'Reopen'}
                      </button>
                    </div>
                  );
                })}
              </div>
              {blockedRuns.length > 5 && (
                <button
                  onClick={() => setShowAllDaysOff(v => !v)}
                  className="w-full mt-2.5 py-2 rounded-xl text-[0.68rem] font-semibold transition-all"
                  style={{ background: dm ? '#1e1e24' : '#F7F7FB', color: dm ? '#a1a1aa' : '#83838d' }}>
                  {showAllDaysOff ? 'Show less' : `Show all ${blockedRuns.length}`}
                </button>
              )}
            </div>
          )}

          {/* Default capacity */}
          <div className="rounded-xl p-5" style={card}>
            <h3 className="text-[0.78rem] font-semibold mb-1.5" style={{ color: dm ? '#ECEDF1' : '#111' }}>Default capacity</h3>
            <p className="text-[0.7rem] mb-4 leading-relaxed" style={{ color: dm ? '#71717a' : '#999' }}>
              How many bookings you'll take on a day without its own limit.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Stepper value={defaultEdit} onChange={setDefaultEdit} dm={dm} />
              <span className="text-[0.7rem]" style={{ color: dm ? '#71717a' : '#999' }}>spots / day</span>
              <button
                onClick={() => saveDefault.mutate(defaultEdit)}
                disabled={defaultEdit === defaultCap || saveDefault.isPending}
                className="ml-auto px-4 py-2 rounded-xl text-[0.72rem] font-semibold transition-all"
                style={defaultEdit === defaultCap
                  ? { background: dm ? '#2e2e38' : '#f3f4f6', color: dm ? '#52525b' : '#9ca3af', cursor: 'not-allowed' }
                  : { background: '#111', color: '#fff' }}>
                {saveDefault.isPending ? 'Saving…' : defaultSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
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
