'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Users, BookOpen, CheckCircle, Star, Calendar } from 'lucide-react';

// ─── Demo data ───────────────────────────────────────────────────────────────

const DEMO_SUMMARY = {
  totalRevenue:      61400,
  thisMonthRevenue:  8400,
  lastMonthRevenue:  7200,
  totalBookings:     187,
  thisMonthBookings: 28,
  lastMonthBookings: 24,
  paidClassSignups:  18,
  completedBookings: 143,
  peakDay:           'Sat',
};

const DEMO_CLASS_BY_TYPE = [
  { key: 'private_basic_lesson', title: 'Basic Makeup Lesson',   price: 300,  count: 12, revenue: 3600 },
  { key: 'masterclass',          title: 'Advanced Makeup Lesson', price: 1500, count: 4,  revenue: 6000 },
];

const DEMO_TOP_SERVICES = [
  { name: 'Luxury Bridal Look',     count: 24, completed: 22 },
  { name: 'Non-Bridal Makeup',      count: 19, completed: 17 },
  { name: 'Full Day Service',       count: 8,  completed: 7  },
  { name: 'Photoshoot Makeup',      count: 7,  completed: 6  },
  { name: 'Bridal Trial',           count: 5,  completed: 5  },
  { name: 'Basic Makeup Lesson',    count: 4,  completed: 4  },
  { name: 'Advanced Makeup Lesson', count: 2,  completed: 2  },
];

const DEMO_TRENDS = {
  '1d': [
    { shortLabel: '12a', revenue: 0,    bookings: 0 },
    { shortLabel: '2a',  revenue: 0,    bookings: 0 },
    { shortLabel: '4a',  revenue: 0,    bookings: 0 },
    { shortLabel: '6a',  revenue: 0,    bookings: 0 },
    { shortLabel: '8a',  revenue: 400,  bookings: 1 },
    { shortLabel: '10a', revenue: 750,  bookings: 1 },
    { shortLabel: '12p', revenue: 0,    bookings: 0 },
    { shortLabel: '2p',  revenue: 400,  bookings: 1 },
    { shortLabel: '4p',  revenue: 0,    bookings: 0 },
    { shortLabel: '6p',  revenue: 1200, bookings: 1 },
    { shortLabel: '8p',  revenue: 0,    bookings: 0 },
    { shortLabel: '10p', revenue: 0,    bookings: 0 },
  ],
  '7d': [
    { shortLabel: 'Mon', revenue: 400,  bookings: 1 },
    { shortLabel: 'Tue', revenue: 0,    bookings: 0 },
    { shortLabel: 'Wed', revenue: 750,  bookings: 2 },
    { shortLabel: 'Thu', revenue: 1700, bookings: 1 },
    { shortLabel: 'Fri', revenue: 1750, bookings: 3 },
    { shortLabel: 'Sat', revenue: 2700, bookings: 4 },
    { shortLabel: 'Sun', revenue: 600,  bookings: 1 },
  ],
  '30d': [
    { shortLabel: '1',  revenue: 400,  bookings: 1 },
    { shortLabel: '2',  revenue: 0,    bookings: 0 },
    { shortLabel: '3',  revenue: 400,  bookings: 1 },
    { shortLabel: '4',  revenue: 400,  bookings: 1 },
    { shortLabel: '5',  revenue: 1200, bookings: 2 },
    { shortLabel: '6',  revenue: 2100, bookings: 3 },
    { shortLabel: '7',  revenue: 600,  bookings: 1 },
    { shortLabel: '8',  revenue: 0,    bookings: 0 },
    { shortLabel: '9',  revenue: 400,  bookings: 1 },
    { shortLabel: '10', revenue: 750,  bookings: 1 },
    { shortLabel: '11', revenue: 0,    bookings: 0 },
    { shortLabel: '12', revenue: 1200, bookings: 2 },
    { shortLabel: '13', revenue: 2100, bookings: 3 },
    { shortLabel: '14', revenue: 0,    bookings: 0 },
    { shortLabel: '15', revenue: 400,  bookings: 1 },
    { shortLabel: '16', revenue: 0,    bookings: 0 },
    { shortLabel: '17', revenue: 400,  bookings: 1 },
    { shortLabel: '18', revenue: 1700, bookings: 1 },
    { shortLabel: '19', revenue: 1200, bookings: 2 },
    { shortLabel: '20', revenue: 2100, bookings: 3 },
    { shortLabel: '21', revenue: 400,  bookings: 1 },
    { shortLabel: '22', revenue: 0,    bookings: 0 },
    { shortLabel: '23', revenue: 400,  bookings: 1 },
    { shortLabel: '24', revenue: 750,  bookings: 1 },
    { shortLabel: '25', revenue: 0,    bookings: 0 },
    { shortLabel: '26', revenue: 1200, bookings: 2 },
    { shortLabel: '27', revenue: 2100, bookings: 3 },
    { shortLabel: '28', revenue: 0,    bookings: 0 },
    { shortLabel: '29', revenue: 0,    bookings: 0 },
    { shortLabel: '30', revenue: 400,  bookings: 1 },
  ],
  '6m': [
    { shortLabel: 'Dec', revenue: 4200, bookings: 18 },
    { shortLabel: 'Jan', revenue: 5800, bookings: 22 },
    { shortLabel: 'Feb', revenue: 7100, bookings: 26 },
    { shortLabel: 'Mar', revenue: 6400, bookings: 24 },
    { shortLabel: 'Apr', revenue: 8200, bookings: 31 },
    { shortLabel: 'May', revenue: 8400, bookings: 28 },
  ],
  '12m': [
    { shortLabel: 'Jun', revenue: 2100, bookings: 10 },
    { shortLabel: 'Jul', revenue: 2800, bookings: 13 },
    { shortLabel: 'Aug', revenue: 3600, bookings: 16 },
    { shortLabel: 'Sep', revenue: 4500, bookings: 19 },
    { shortLabel: 'Oct', revenue: 3800, bookings: 16 },
    { shortLabel: 'Nov', revenue: 4200, bookings: 18 },
    { shortLabel: 'Dec', revenue: 4200, bookings: 18 },
    { shortLabel: 'Jan', revenue: 5800, bookings: 22 },
    { shortLabel: 'Feb', revenue: 7100, bookings: 26 },
    { shortLabel: 'Mar', revenue: 6400, bookings: 24 },
    { shortLabel: 'Apr', revenue: 8200, bookings: 31 },
    { shortLabel: 'May', revenue: 8400, bookings: 28 },
  ],
};

const RANGE_OPTS = [
  { key: '1d',  label: 'Today'    },
  { key: '7d',  label: '7 Days'   },
  { key: '30d', label: '30 Days'  },
  { key: '6m',  label: '6 Months' },
  { key: '12m', label: '1 Year'   },
];

const RANGE_TITLE = {
  '1d':  'Today · By Hour',
  '7d':  'Last 7 Days',
  '30d': 'Last 30 Days',
  '6m':  'Last 6 Months',
  '12m': 'Last 12 Months',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctDelta(cur, prev) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function fmtRevenue(n) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, sub, value, accent, delta, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#e4ddd7';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  return (
    <div className="rounded-2xl px-4 py-4 flex flex-col gap-2.5" style={{ background: bg, border: `1px solid ${bd}` }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon size={14} color={accent} strokeWidth={1.5} />
        </div>
        {delta !== null && delta !== undefined && (
          <span className="text-[0.55rem] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: delta >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: delta >= 0 ? '#22C55E' : '#EF4444' }}>
            {delta >= 0 ? '+' : ''}{delta}% vs last mo
          </span>
        )}
      </div>
      <div>
        <p className="text-[1.18rem] font-semibold leading-tight" style={{ color: tx }}>{value}</p>
        <p className="text-[0.62rem] mt-0.5 leading-tight" style={{ color: mu }}>
          {label} <span style={{ fontWeight: 400 }}>· {sub}</span>
        </p>
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, sub, accent, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#e4ddd7';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  return (
    <div className="rounded-2xl px-3.5 py-3.5 flex items-center gap-3" style={{ background: bg, border: `1px solid ${bd}` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15` }}>
        <Icon size={13} color={accent} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[1rem] font-semibold leading-none" style={{ color: tx }}>{value}</p>
        <p className="text-[0.6rem] mt-0.5 leading-tight" style={{ color: mu }}>
          {label}<br /><span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{sub}</span>
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, dm }) {
  if (!active || !payload?.length) return null;
  const bg = dm ? '#26262e' : '#fff', bd = dm ? '#3a3a48' : '#e4ddd7';
  const tx = dm ? '#e4e4e7' : '#111', mu = dm ? '#71717a' : '#999';
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: bg, border: `1px solid ${bd}`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <p className="text-[0.72rem] font-semibold mb-1.5" style={{ color: tx }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[0.66rem]" style={{ color: mu }}>{p.name}:</span>
          <span className="text-[0.66rem] font-semibold" style={{ color: tx }}>
            {p.name === 'Revenue' ? `$${(p.value || 0).toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function RevenueTab({ darkMode: dm }) {
  const [range, setRange]           = useState('6m');
  const [data, setData]             = useState(null);
  const [initialLoad, setInitial]   = useState(true);
  const [error, setError]           = useState(null);
  const [demoMode, setDemoMode]     = useState(false);

  useEffect(() => {
    if (demoMode) { setInitial(false); return; }
    fetch(`/api/admin/revenue?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setInitial(false); })
      .catch(err => { setError(err.message); setInitial(false); });
  }, [range, demoMode]);

  const bg      = dm ? '#26262e' : '#fff';
  const bd      = dm ? '#3a3a48' : '#e4ddd7';
  const tx      = dm ? '#e4e4e7' : '#111';
  const mu      = dm ? '#71717a' : '#999';
  const grid    = dm ? '#2e2e38' : '#f3eeea';
  const barFill = dm ? '#3a3a48' : '#e6dfe0';

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-[#D4A0B0] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !demoMode) {
    return <p className="text-center py-14 text-[0.8rem]" style={{ color: mu }}>Could not load analytics. Try refreshing.</p>;
  }

  const active = demoMode
    ? { summary: DEMO_SUMMARY, monthlyTrend: DEMO_TRENDS[range], classByType: DEMO_CLASS_BY_TYPE, topServices: DEMO_TOP_SERVICES }
    : (data || {});
  const { summary = {}, monthlyTrend = [], classByType = [], topServices = [] } = active;

  const revDelta        = pctDelta(summary.thisMonthRevenue,  summary.lastMonthRevenue);
  const bookDelta       = pctDelta(summary.thisMonthBookings, summary.lastMonthBookings);
  const maxCount        = topServices[0]?.count || 1;
  const completionRate  = summary.totalBookings ? Math.round((summary.completedBookings / summary.totalBookings) * 100) : 0;
  const avgClassRev     = summary.paidClassSignups ? Math.round(summary.totalRevenue / summary.paidClassSignups) : 0;
  const xInterval       = range === '30d' ? 4 : 0;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.57rem] font-semibold tracking-[0.18em] uppercase mb-0.5" style={{ color: '#D4A0B0' }}>
            Revenue & Insights
          </p>
          <h2 className="text-[1.1rem] font-serif font-light" style={{ color: tx }}>Business Analytics</h2>
          <p className="text-[0.67rem] mt-0.5" style={{ color: mu }}>
            Class revenue via Stripe · Appointment booking trends
          </p>
        </div>
        <button
          onClick={() => setDemoMode(v => !v)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full mt-1"
          style={{
            background: demoMode ? 'rgba(212,160,176,0.15)' : dm ? '#2e2e38' : '#f5f0ec',
            border: `1px solid ${demoMode ? 'rgba(212,160,176,0.35)' : dm ? '#3a3a48' : '#e4ddd7'}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: demoMode ? '#D4A0B0' : dm ? '#52525b' : '#ccc' }} />
          <span className="text-[0.58rem] font-semibold tracking-[0.08em] uppercase" style={{ color: demoMode ? '#D4A0B0' : mu }}>
            {demoMode ? 'Sample Data' : 'Live Data'}
          </span>
        </button>
      </div>

      {/* ── Range Selector ──────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {RANGE_OPTS.map(({ key, label }) => {
          const isActive = range === key;
          return (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="px-3.5 py-1.5 rounded-full text-[0.62rem] font-semibold tracking-[0.04em] flex-shrink-0 transition-all"
              style={{
                background: isActive ? (dm ? '#D4A0B0' : '#111') : dm ? '#2e2e38' : '#f5f0ec',
                color:      isActive ? (dm ? '#1e1e24' : '#fff') : mu,
                border:     `1px solid ${isActive ? (dm ? '#D4A0B0' : '#111') : dm ? '#3a3a48' : '#e4ddd7'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Stats Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Class Revenue"    sub="this month"     value={`$${(summary.thisMonthRevenue  || 0).toLocaleString()}`} accent="#22C55E" delta={revDelta}  dm={dm} />
        <StatCard icon={Users}      label="Appointments"     sub="this month"     value={summary.thisMonthBookings ?? 0}                           accent="#3B82F6" delta={bookDelta} dm={dm} />
        <StatCard icon={TrendingUp} label="All-Time Revenue" sub="from classes"   value={fmtRevenue(summary.totalRevenue || 0)}                    accent="#D4A0B0"                   dm={dm} />
        <StatCard icon={BookOpen}   label="Class Signups"    sub="paid, all time" value={summary.paidClassSignups ?? 0}                            accent="#F59E0B"                   dm={dm} />
      </div>

      {/* ── Insight Strip ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <InsightCard icon={CheckCircle} label="Completion Rate" value={`${completionRate}%`} sub="bookings done"   accent="#22C55E" dm={dm} />
        <InsightCard icon={Star}        label="Avg per Class"    value={`$${avgClassRev}`}    sub="per signup"      accent="#F59E0B" dm={dm} />
        <InsightCard icon={Calendar}    label="Peak Day"         value={summary.peakDay || '—'} sub="most bookings" accent="#D4A0B0" dm={dm} />
      </div>

      {/* ── Trend Chart ─────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${bd}` }}>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-0.5" style={{ color: mu }}>
          {RANGE_TITLE[range]}
        </p>
        <p className="text-[0.78rem] font-semibold mb-4" style={{ color: tx }}>Bookings & Class Revenue</p>
        <ResponsiveContainer width="100%" height={176}>
          <ComposedChart data={monthlyTrend} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
            <XAxis dataKey="shortLabel" tick={{ fontSize: 9, fill: mu, fontWeight: 500 }} axisLine={false} tickLine={false} interval={xInterval} />
            <YAxis yAxisId="b" orientation="left"  allowDecimals={false} tick={{ fontSize: 9, fill: mu }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={v => v === 0 ? '' : `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 9, fill: mu }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip dm={dm} />} cursor={{ fill: dm ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' }} />
            <Bar  yAxisId="b" dataKey="bookings" name="Bookings" fill={barFill} radius={[3,3,0,0]} maxBarSize={28} />
            <Line yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#D4A0B0" strokeWidth={2} dot={{ fill: '#D4A0B0', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#D4A0B0', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-3 pt-3" style={{ borderTop: `1px solid ${bd}` }}>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm" style={{ background: barFill }} />
            <span className="text-[0.62rem]" style={{ color: mu }}>Bookings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded-full" style={{ background: '#D4A0B0' }} />
            <span className="text-[0.62rem]" style={{ color: mu }}>Class Revenue</span>
          </div>
        </div>
      </div>

      {/* ── Class Revenue Breakdown ──────────────────────────── */}
      {classByType.length > 0 && (
        <div>
          <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: mu }}>
            Class Revenue Breakdown
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classByType.map(cls => (
              <div key={cls.key} className="rounded-2xl px-4 py-4" style={{ background: bg, border: `1px solid ${bd}` }}>
                <div className="flex items-start justify-between mb-2.5">
                  <p className="text-[0.78rem] font-semibold leading-tight pr-2" style={{ color: tx }}>{cls.title}</p>
                  <span className="text-[0.65rem] font-medium flex-shrink-0" style={{ color: '#D4A0B0' }}>${cls.price}/person</span>
                </div>
                <p className="text-[1.15rem] font-semibold leading-none" style={{ color: tx }}>${cls.revenue.toLocaleString()}</p>
                <p className="text-[0.6rem] mt-0.5" style={{ color: mu }}>{cls.count} signup{cls.count !== 1 ? 's' : ''}</p>
                {cls.count > 0 && (
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#f5f0ec' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (cls.count / 15) * 100)}%`, background: '#D4A0B0' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Most Booked Services ─────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${bd}` }}>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-0.5" style={{ color: mu }}>
          Appointment Analytics
        </p>
        <p className="text-[0.78rem] font-semibold mb-4" style={{ color: tx }}>Most Booked Services</p>
        {topServices.length === 0 ? (
          <p className="text-[0.78rem]" style={{ color: mu }}>No bookings recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {topServices.map((svc, i) => {
              const pct = Math.round((svc.count / maxCount) * 100);
              const completePct = svc.count ? Math.round((svc.completed / svc.count) * 100) : 0;
              return (
                <div key={svc.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded flex items-center justify-center text-[0.52rem] font-bold flex-shrink-0"
                        style={{ background: i === 0 ? 'rgba(212,160,176,0.15)' : dm ? '#2e2e38' : '#f5f0ec', color: i === 0 ? '#D4A0B0' : mu }}>
                        {i + 1}
                      </span>
                      <p className="text-[0.75rem] font-medium leading-tight" style={{ color: tx }}>{svc.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-[0.6rem]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{completePct}% done</span>
                      <span className="text-[0.68rem] font-semibold" style={{ color: mu }}>{svc.count}</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#f5f0ec' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#D4A0B0' : dm ? '#3a3a48' : '#d9d0cc', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${bd}` }}>
          <span className="text-[0.62rem]" style={{ color: mu }}>{summary.totalBookings || 0} total appointments</span>
          <span className="text-[0.62rem]" style={{ color: mu }}>{summary.completedBookings || 0} completed</span>
        </div>
      </div>

    </div>
  );
}
