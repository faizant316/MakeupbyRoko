'use client';
import { useEffect, useState } from 'react';
import { DollarSign, Activity } from 'lucide-react';
import RevenueTab from './RevenueTab';
import AnalyticsTab from './AnalyticsTab';

// One "Reports" home for the two things Roko cares about, the way Booksy groups
// its stats: money on one side, website traffic on the other, with a single
// segmented switch between them. Each half is its own self-contained panel.
const VIEWS = [
  { key: 'revenue', label: 'Revenue',  sub: 'Bookings & class income',   icon: DollarSign },
  { key: 'traffic', label: 'Traffic',  sub: 'Visitors & where they come from', icon: Activity },
];

const STORE_KEY = 'admin-reports-view';

export default function ReportsTab({ darkMode: dm }) {
  const [view, setView] = useState('revenue');

  // Remember the last panel she looked at, like the home calendar remembers its
  // view — so Reports reopens where she left off.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === 'revenue' || saved === 'traffic') setView(saved);
    } catch { /* private mode */ }
  }, []);
  const pick = (k) => {
    setView(k);
    try { localStorage.setItem(STORE_KEY, k); } catch { /* private mode */ }
  };

  const bd     = dm ? '#3a3a48' : '#E2E4EA';
  const trackBg = dm ? '#26262e' : '#F0F0F5';
  const activeBg = dm ? '#1e1e24' : '#fff';
  const tx     = dm ? '#e4e4e7' : '#111';
  const mu     = dm ? '#8e8e99' : '#999';
  const active = VIEWS.find(v => v.key === view);

  return (
    <div className="flex flex-col gap-7">

      {/* ── Segmented control — the toggle between Revenue and Traffic ────── */}
      <div>
        <div
          className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl w-full sm:max-w-[460px]"
          style={{ background: trackBg, border: `1px solid ${bd}` }}
        >
          {VIEWS.map(v => {
            const isActive = view === v.key;
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => pick(v.key)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? activeBg : 'transparent',
                  boxShadow:  isActive ? (dm ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.07)') : 'none',
                  border:     `1px solid ${isActive ? bd : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.querySelector('span').style.color = dm ? '#d4d4d8' : '#333'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.querySelector('span').style.color = mu; }}
              >
                <Icon size={16} strokeWidth={1.8} color={isActive ? '#D4A0B0' : mu} />
                <span
                  className="text-[0.86rem] font-bold tracking-[0.01em] transition-colors"
                  style={{ color: isActive ? tx : mu }}
                >
                  {v.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[0.72rem] mt-3 ml-1" style={{ color: mu }}>
          {active?.sub}
          <span style={{ color: dm ? '#7a7a84' : '#C2C2C9' }}> · live data, updated in real time</span>
        </p>
      </div>

      {/* ── Active panel ─────────────────────────────────────────────────── */}
      {view === 'revenue' ? <RevenueTab darkMode={dm} /> : <AnalyticsTab darkMode={dm} />}
    </div>
  );
}
