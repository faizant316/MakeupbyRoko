import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SETTING_KEY = 'max_bookings_per_day';
const DEFAULT_CAP = 3;

export default function CapacitySettings({ selectedDate, darkMode: dm }) {
  const queryClient = useQueryClient();
  const [defaultValue, setDefaultValue] = useState(DEFAULT_CAP);
  const [savedDefault, setSavedDefault] = useState(false);

  // Override form state
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideCap, setOverrideCap] = useState(4);
  const [overrideSaved, setOverrideSaved] = useState(false);

  // Sync with selected calendar date
  useEffect(() => {
    if (selectedDate) setOverrideDate(selectedDate);
  }, [selectedDate]);

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => api.entities.AppSettings.filter({ key: SETTING_KEY }),
    staleTime: 30000,
  });

  const { data: dayOverrides = [] } = useQuery({
    queryKey: ['day-capacities'],
    queryFn: () => api.entities.DayCapacity.list('-date', 60),
    staleTime: 30000,
  });

  const existing = settings[0];
  const currentCap = existing ? parseInt(existing.value, 10) : DEFAULT_CAP;

  useEffect(() => { setDefaultValue(currentCap); }, [currentCap]);

  const saveDefaultMutation = useMutation({
    mutationFn: async (val) => {
      if (existing) await api.entities.AppSettings.update(existing.id, { value: String(val) });
      else await api.entities.AppSettings.create({ key: SETTING_KEY, value: String(val) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-capacity'] });
      setSavedDefault(true);
      setTimeout(() => setSavedDefault(false), 2000);
    },
  });

  const addOverrideMutation = useMutation({
    mutationFn: async ({ date, capacity }) => {
      const existing = dayOverrides.find(d => d.date === date);
      if (existing) await api.entities.DayCapacity.update(existing.id, { capacity });
      else await api.entities.DayCapacity.create({ date, capacity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-capacities'] });
      setOverrideSaved(true);
      setOverrideDate('');
      setOverrideCap(4);
      setTimeout(() => setOverrideSaved(false), 2000);
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (id) => api.entities.DayCapacity.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['day-capacities'] }),
  });

  // Only show future overrides
  const today = new Date().toISOString().split('T')[0];
  const futureOverrides = dayOverrides.filter(o => o.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-xl p-5" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <span className="text-[0.75rem] font-semibold tracking-tight" style={{ color: dm ? '#F0EBE6' : '#111' }}>Daily Booking Capacity</span>
      </div>

      {/* Default capacity */}
      <p className="text-[0.7rem] mb-3 leading-[1.6]" style={{ color: dm ? '#71717a' : '#999' }}>
        Default capacity applies to all days. Use overrides to set a different limit for specific dates.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-[0.7rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#555' }}>Default:</span>
        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>
          <button onClick={() => setDefaultValue(Math.max(1, defaultValue - 1))}
            className="w-9 h-9 flex items-center justify-center transition-colors text-lg"
            style={{ color: dm ? '#71717a' : '#999', background: dm ? '#1e1e24' : 'transparent' }}>−</button>
          <input type="number" min="1" max="20" value={defaultValue}
            onChange={e => setDefaultValue(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
            className="w-10 h-9 text-center text-[0.95rem] font-semibold outline-none"
            style={{ color: dm ? '#e4e4e7' : '#111', borderLeft: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, borderRight: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, background: dm ? '#26262e' : '#fff' }} />
          <button onClick={() => setDefaultValue(Math.min(20, defaultValue + 1))}
            className="w-9 h-9 flex items-center justify-center transition-colors text-lg"
            style={{ color: dm ? '#71717a' : '#999', background: dm ? '#1e1e24' : 'transparent' }}>+</button>
        </div>
        <span className="text-[0.7rem]" style={{ color: dm ? '#71717a' : '#999' }}>spots / day</span>
        <button onClick={() => saveDefaultMutation.mutate(defaultValue)}
          disabled={defaultValue === currentCap || saveDefaultMutation.isPending}
          className={`ml-auto px-4 py-1.5 rounded-xl text-[0.72rem] font-semibold transition-all ${
            defaultValue === currentCap ? 'cursor-not-allowed' : 'bg-[#111] text-white hover:bg-[#222] shadow-sm'
          }`}
          style={defaultValue === currentCap ? { background: dm ? '#2e2e38' : '#f3f4f6', color: dm ? '#52525b' : '#9ca3af' } : {}}>
          {saveDefaultMutation.isPending ? 'Saving…' : savedDefault ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Divider */}
      <div className="h-px mb-4" style={{ background: dm ? '#3a3a48' : '#f0ebe6' }} />

      {/* Per-day override */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[0.7rem] font-semibold" style={{ color: dm ? '#F0EBE6' : '#111' }}>Set Override for a Specific Date</p>
        {selectedDate && (
          <span className="px-2.5 py-1 bg-[#111] text-white text-[0.6rem] font-semibold rounded-md tracking-wide">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        )}
        {!selectedDate && (
          <span className="text-[0.65rem] italic" style={{ color: dm ? '#52525b' : '#bbb' }}>← click a date on the calendar</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex items-center">
          <input
            type="date"
            value={overrideDate}
            min={today}
            onChange={e => setOverrideDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-[0.78rem] outline-none transition-all"
            style={{ border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, color: dm ? '#e4e4e7' : '#111', background: dm ? '#1e1e24' : '#fff', paddingRight: overrideDate ? '28px' : undefined }}
          />
          {overrideDate && (
            <button
              onClick={() => setOverrideDate('')}
              className="absolute right-2 flex items-center justify-center w-4 h-4 rounded-full transition-all"
              style={{ background: dm ? '#52525b' : '#ddd', color: dm ? '#d4d4d8' : '#666', fontSize: '9px', lineHeight: 1 }}
              title="Clear date"
            >✕</button>
          )}
        </div>
        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>
          <button onClick={() => setOverrideCap(Math.max(1, overrideCap - 1))}
            className="w-9 h-9 flex items-center justify-center transition-colors text-lg"
            style={{ color: dm ? '#71717a' : '#999', background: dm ? '#1e1e24' : 'transparent' }}>−</button>
          <input type="number" min="1" max="20" value={overrideCap}
            onChange={e => setOverrideCap(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
            className="w-10 h-9 text-center text-[0.95rem] font-semibold outline-none"
            style={{ color: dm ? '#e4e4e7' : '#111', borderLeft: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, borderRight: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, background: dm ? '#26262e' : '#fff' }} />
          <button onClick={() => setOverrideCap(Math.min(20, overrideCap + 1))}
            className="w-9 h-9 flex items-center justify-center transition-colors text-lg"
            style={{ color: dm ? '#71717a' : '#999', background: dm ? '#1e1e24' : 'transparent' }}>+</button>
        </div>
        <span className="text-[0.7rem]" style={{ color: dm ? '#71717a' : '#999' }}>spots</span>
        <button
          onClick={() => overrideDate && addOverrideMutation.mutate({ date: overrideDate, capacity: overrideCap })}
          disabled={!overrideDate || addOverrideMutation.isPending}
          className={`px-4 py-2 rounded-xl text-[0.72rem] font-semibold transition-all ${
            !overrideDate ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#D4A0B0] text-white hover:bg-[#c990a2] shadow-sm'
          }`}>
          {overrideSaved ? '✓ Saved' : '+ Set Override'}
        </button>
      </div>

      {/* Existing overrides */}
      {futureOverrides.length > 0 && (
        <div className="mt-4">
          <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: dm ? '#52525b' : '#bbb' }}>Active Overrides</p>
          <div className="flex flex-col gap-1.5">
            {futureOverrides.map(o => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: dm ? '#1e1e24' : '#FDF9F7', border: `1px solid ${dm ? '#3a3a48' : '#f0e8e0'}` }}>
                <div className="flex items-center gap-3">
                  <span className="text-[0.72rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#111' }}>
                    {new Date(o.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="px-2 py-0.5 bg-[#D4A0B0]/15 text-[#D4A0B0] text-[0.65rem] font-bold rounded-md">{o.capacity} spots</span>
                </div>
                <button onClick={() => deleteOverrideMutation.mutate(o.id)}
                  className="hover:text-red-400 transition-colors text-[0.75rem] px-2" style={{ color: dm ? '#52525b' : '#ccc' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}