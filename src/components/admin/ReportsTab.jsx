'use client';
import { useEffect, useState } from 'react';
import RevenueTab from './RevenueTab';
import AnalyticsTab from './AnalyticsTab';
import { Segmented } from './ui';

// One "Reports" home for the two things Roko cares about, the way Booksy groups
// its stats: money on one side, website traffic on the other, with a single
// segmented switch between them. Each half is its own self-contained panel.
const VIEWS = [
  { key: 'revenue', label: 'Revenue', sub: 'Bookings & class income' },
  { key: 'traffic', label: 'Traffic', sub: 'Visitors & where they come from' },
];

const STORE_KEY = 'admin-reports-view';

export default function ReportsTab({ darkMode }) {
  const [view, setView] = useState('revenue');

  // Remember the last panel she looked at, like the home calendar remembers its
  // view, so Reports reopens where she left off.
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

  const active = VIEWS.find(v => v.key === view);

  return (
    <div className="flex flex-col gap-6">

      {/* The switch between Revenue and Traffic. Full width on a phone so
          each half is a thumb-sized target. */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
        <Segmented
          options={VIEWS.map(v => ({ value: v.key, label: v.label }))}
          value={view}
          onChange={pick}
          className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center [&>button]:whitespace-nowrap max-sm:[&>button]:h-10 sm:[&>button]:min-w-[7.5rem]"
        />
        <p className="text-[0.8rem] text-ink-muted">
          {active?.sub}
          <span className="text-ink-muted/70"> · live data, updated in real time</span>
        </p>
      </div>

      {/* Keyed so the switch replays the same quiet rise as a tab change. */}
      <div key={view} className="rise-in">
        {view === 'revenue' ? <RevenueTab darkMode={darkMode} /> : <AnalyticsTab darkMode={darkMode} />}
      </div>
    </div>
  );
}
