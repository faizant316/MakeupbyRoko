import { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminCalendar from './AdminCalendar';

const SETTING_KEY = 'max_bookings_per_day';
const DEFAULT_CAP = 3;
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
const fmtDay = (key, opts) =>
  new Date(key + 'T00:00:00').toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric' });

// ── Circular capacity meter ─────────────────────────────────
// Shows how full a day is at a glance: ring fills as bookings approach the
// limit, turns warm when fully booked and red when the day is closed.
function CapacityRing({ booked, capacity, blocked, dm }) {
  const size = 108, stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = blocked ? 1 : capacity > 0 ? Math.min(1, booked / capacity) : 0;
  const full = !blocked && capacity > 0 && booked >= capacity;
  const track = dm ? '#2e2e38' : '#f1eae4';
  const color = blocked ? '#EF4444' : full ? '#E0795B' : booked > 0 ? '#D4A0B0' : (dm ? '#52525b' : '#dcd1c9');
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
          <span className="text-[0.62rem] font-bold tracking-[0.12em] uppercase" style={{ color: '#EF4444' }}>Closed</span>
        ) : (
          <>
            <span className="font-serif leading-none" style={{ fontSize: '1.7rem', color: dm ? '#e4e4e7' : '#1a1a1a' }}>{booked}</span>
            <span className="text-[0.6rem] font-medium mt-1 tracking-wide" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>of {capacity}</span>
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

export default function AvailabilityTab({ bookings = [], classRegs = [], darkMode: dm }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editCap, setEditCap] = useState(DEFAULT_CAP);
  const [defaultEdit, setDefaultEdit] = useState(DEFAULT_CAP);
  const [defaultSaved, setDefaultSaved] = useState(false);
  const [daySaved, setDaySaved] = useState(false);

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
  // Only pending/confirmed count toward a day's capacity (mirrors the calendar)
  const bookedMap = useMemo(() => {
    const m = {};
    (bookings || []).forEach(b => {
      if (!b.date || !['confirmed', 'pending'].includes(b.status)) return;
      m[b.date] = (m[b.date] || 0) + 1;
    });
    return m;
  }, [bookings]);

  const tk = todayKey();
  const upcomingOverrides = useMemo(
    () => overrides.filter(o => o.date >= tk).sort((a, b) => a.date.localeCompare(b.date)),
    [overrides, tk],
  );
  const upcomingBlocked = useMemo(
    () => blocked.filter(b => b.date >= tk).sort((a, b) => a.date.localeCompare(b.date)),
    [blocked, tk],
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
  const selBooked = selectedDate ? (bookedMap[selectedDate] || 0) : 0;
  const selBlocked = selectedDate ? blockedSet.has(selectedDate) : false;
  const selHasOverride = selectedDate ? overrideRecByDate[selectedDate] != null : false;
  const effForSelected = selectedDate ? (overrideMap[selectedDate] ?? defaultCap) : 0;

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
  // Block / unblock update optimistically so the panel flips to its new state
  // instantly instead of waiting on the server round-trip, then reconcile.
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

  const jumpTo = (key) => { setSelectedDate(key); setMonth(new Date(key + 'T00:00:00')); };

  const card = { background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#E5E7EB'}` };
  const spotsLeft = effForSelected - selBooked;

  // ── Glance stats ──
  const stats = [
    { label: 'Spots / day', value: defaultCap, tone: 'neutral' },
    { label: 'Booked out · 30d', value: fullyBookedSoon, tone: fullyBookedSoon > 0 ? 'warn' : 'neutral' },
    { label: 'Custom days', value: upcomingOverrides.length, tone: 'accent' },
    { label: 'Days off', value: upcomingBlocked.length, tone: upcomingBlocked.length > 0 ? 'danger' : 'neutral' },
  ];
  const toneColor = (t) => t === 'warn' ? '#E0795B' : t === 'danger' ? '#EF4444' : t === 'accent' ? '#A0607A' : (dm ? '#e4e4e7' : '#1a1a1a');

  return (
    <div className="pb-4">
      {/* Intro line */}
      <p className="text-[0.8rem] leading-relaxed mb-5 max-w-xl" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
        Control how many bookings you take each day. Set a default for every day, then tap any date to give it a custom limit or close it off entirely.
      </p>

      {/* Glance stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl px-3.5 py-3" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#f0e9e4'}` }}>
            <p className="text-[1.5rem] font-serif leading-none" style={{ color: toneColor(s.tone) }}>{s.value}</p>
            <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mt-2 truncate" style={{ color: dm ? '#71717a' : '#b0a59c' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-5 items-start">
        {/* Calendar */}
        <AdminCalendar
          bookings={bookings}
          classRegs={classRegs}
          currentMonth={month}
          setCurrentMonth={setMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          maxPerDay={defaultCap}
          dayCapacityMap={overrideMap}
          darkMode={dm}
        />

        {/* Control panel */}
        <div className="lg:sticky lg:top-20 flex flex-col gap-4">
          {/* Selected-day editor */}
          {selectedDate ? (
            <div className="rounded-xl p-5" style={card}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-serif text-[1.1rem]" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                  {fmtDay(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selHasOverride && !selBlocked && (
                  <span className="text-[0.55rem] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(212,160,176,0.16)', color: '#A0607A' }}>Custom</span>
                )}
              </div>

              <div className="flex items-center gap-5">
                <CapacityRing booked={selBooked} capacity={effForSelected} blocked={selBlocked} dm={dm} />
                <div className="min-w-0">
                  {selBlocked ? (
                    <>
                      <p className="text-[0.85rem] font-semibold" style={{ color: '#EF4444' }}>Closed to bookings</p>
                      <p className="text-[0.72rem] mt-1 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
                        Clients can't book this day on the site.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[0.95rem] font-semibold" style={{ color: spotsLeft <= 0 ? '#E0795B' : (dm ? '#e4e4e7' : '#1a1a1a') }}>
                        {spotsLeft <= 0 ? 'Fully booked' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} open`}
                      </p>
                      <p className="text-[0.72rem] mt-1 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
                        {selBooked} of {effForSelected} taken
                        {selHasOverride ? ' · custom limit' : ` · default (${defaultCap})`}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {!selBlocked && (
                <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[0.72rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#555' }}>Limit:</span>
                    <Stepper value={editCap} onChange={setEditCap} dm={dm} />
                    <span className="text-[0.7rem]" style={{ color: dm ? '#71717a' : '#999' }}>spots</span>
                    <button
                      onClick={() => saveOverride.mutate({ date: selectedDate, capacity: editCap })}
                      disabled={editCap === effForSelected || saveOverride.isPending}
                      className="ml-auto px-4 py-2 rounded-xl text-[0.72rem] font-semibold transition-all"
                      style={editCap === effForSelected
                        ? { background: dm ? '#2e2e38' : '#f3f0ec', color: dm ? '#52525b' : '#bcae9e', cursor: 'not-allowed' }
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

              {/* Close / reopen day — clearly outlined so it reads as tappable */}
              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ECEDF1'}` }}>
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
                Tap any date on the calendar to set its booking limit or close it off.
              </p>
            </div>
          )}

          {/* Default capacity */}
          <div className="rounded-xl p-5" style={card}>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-[0.78rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>Default capacity</h3>
            </div>
            <p className="text-[0.7rem] mb-4 leading-relaxed" style={{ color: dm ? '#71717a' : '#999' }}>
              Applies to every day without a custom limit.
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

          {/* Days off */}
          {upcomingBlocked.length > 0 && (
            <div className="rounded-xl p-5" style={card}>
              <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: dm ? '#71717a' : '#b0a59c' }}>Days off</p>
              <div className="flex flex-col gap-1.5">
                {upcomingBlocked.map(b => (
                  <div key={b.id}
                    onClick={() => jumpTo(b.date)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all"
                    style={{ background: selectedDate === b.date ? (dm ? '#2e1e1e' : '#FEF2F2') : (dm ? '#1e1e24' : '#FdF8F7'), border: `1px solid ${selectedDate === b.date ? 'rgba(239,68,68,0.5)' : (dm ? '#3a3a48' : '#f3e6e2')}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[0.7rem]" style={{ color: '#EF4444' }}>✕</span>
                      <span className="text-[0.72rem] font-medium truncate" style={{ color: dm ? '#d4d4d8' : '#111' }}>{fmtDay(b.date)}</span>
                      {b.reason && <span className="text-[0.65rem] truncate" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>· {b.reason}</span>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); unblockDay.mutate(b.date); }}
                      className="text-[0.62rem] font-semibold px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: dm ? '#a1a1aa' : '#9c9ca4' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#A0607A'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = dm ? '#a1a1aa' : '#9c9ca4'; }}>
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
