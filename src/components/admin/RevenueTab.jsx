'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Users, BookOpen, CheckCircle, Star, Calendar, Sparkles } from 'lucide-react';

// ─── Ranges ──────────────────────────────────────────────────────────────────

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
  const bd = dm ? '#3a3a48' : '#E2E4EA';
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
            style={{ background: delta >= 0 ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', color: delta >= 0 ? '#3B82F6' : '#EF4444' }}>
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
  const bd = dm ? '#3a3a48' : '#E2E4EA';
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
          {label}<br /><span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{sub}</span>
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, dm }) {
  if (!active || !payload?.length) return null;
  const bg = dm ? '#26262e' : '#fff', bd = dm ? '#3a3a48' : '#E2E4EA';
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
  const [range, setRange]         = useState('6m');
  const [data, setData]           = useState(null);
  const [initialLoad, setInitial] = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    fetch(`/api/admin/revenue?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setInitial(false); })
      .catch(err => { setError(err.message); setInitial(false); });
  }, [range]);

  const bg      = dm ? '#26262e' : '#fff';
  const bd      = dm ? '#3a3a48' : '#E2E4EA';
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

  if (error) {
    return <p className="text-center py-14 text-[0.8rem]" style={{ color: mu }}>Could not load revenue data. Try refreshing.</p>;
  }

  const { summary = {}, monthlyTrend = [], classByType = [], topServices = [] } = data || {};

  const revDelta        = pctDelta(summary.thisMonthRevenue,  summary.lastMonthRevenue);
  const bookDelta       = pctDelta(summary.thisMonthBookings, summary.lastMonthBookings);
  const maxCount        = topServices[0]?.count || 1;
  const completionRate  = summary.totalBookings ? Math.round((summary.completedBookings / summary.totalBookings) * 100) : 0;
  const avgClassRev     = summary.paidClassSignups ? Math.round(summary.totalRevenue / summary.paidClassSignups) : 0;
  const xInterval       = range === '30d' ? 4 : 0;
  const importedClients = summary.importedClients || 0;

  // Nothing has been booked or sold through the site yet. Show an honest,
  // intentional empty hero instead of a wall of zeros that reads as broken.
  const noActivity = !summary.totalBookings && !summary.totalRevenue && !summary.paidClassSignups;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Empty-state hero (only before any real site activity) ─────────── */}
      {noActivity && (
        <div className="rounded-2xl px-5 py-6 flex items-start gap-4"
          style={{ background: dm ? '#1a1118' : '#fff9fb', border: '1px solid rgba(212,160,176,0.25)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.14)', border: '1px solid rgba(212,160,176,0.22)' }}>
            <Sparkles size={17} color="#D4A0B0" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[0.9rem] font-semibold mb-1" style={{ color: tx }}>Your revenue starts here</p>
            <p className="text-[0.74rem] leading-relaxed" style={{ color: mu }}>
              These numbers track what happens on this website: appointments booked online and classes paid through Stripe.
              As soon as your first client books or buys a class, it appears here in real time.
              {importedClients > 0 && (
                <> Your {importedClients.toLocaleString()} imported Booksy {importedClients === 1 ? 'client is' : 'clients are'} kept
                in the <span style={{ color: dm ? '#e4b8c6' : '#8A4A63', fontWeight: 600 }}>Clients</span> list as your contact base, and aren't counted as new site bookings.</>
              )}
            </p>
          </div>
        </div>
      )}

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
                border:     `1px solid ${isActive ? (dm ? '#D4A0B0' : '#111') : dm ? '#3a3a48' : '#E2E4EA'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Stats Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Class Revenue"    sub="this month"     value={`$${(summary.thisMonthRevenue  || 0).toLocaleString()}`} accent="#3B82F6" delta={revDelta}  dm={dm} />
        <StatCard icon={Users}      label="Appointments"     sub="this month"     value={summary.thisMonthBookings ?? 0}                           accent="#3B82F6" delta={bookDelta} dm={dm} />
        <StatCard icon={TrendingUp} label="All-Time Revenue" sub="from classes"   value={fmtRevenue(summary.totalRevenue || 0)}                    accent="#D4A0B0"                   dm={dm} />
        <StatCard icon={BookOpen}   label="Class Signups"    sub="paid, all time" value={summary.paidClassSignups ?? 0}                            accent="#F59E0B"                   dm={dm} />
      </div>

      {/* ── Insight Strip ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <InsightCard icon={CheckCircle} label="Completion Rate" value={`${completionRate}%`} sub="bookings done"   accent="#3B82F6" dm={dm} />
        <InsightCard icon={Star}        label="Avg per Class"    value={`$${avgClassRev}`}    sub="per signup"      accent="#F59E0B" dm={dm} />
        <InsightCard icon={Calendar}    label="Peak Day"         value={summary.peakDay || '—'} sub="most bookings" accent="#D4A0B0" dm={dm} />
      </div>

      {/* ── Trend Chart ─────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${bd}` }}>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-0.5" style={{ color: mu }}>
          {RANGE_TITLE[range]}
        </p>
        <p className="text-[0.78rem] font-semibold mb-4" style={{ color: tx }}>Bookings &amp; Class Revenue</p>
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
          <div className="flex flex-col items-center text-center gap-1.5 py-7">
            <Calendar size={22} strokeWidth={1.3} style={{ color: dm ? '#3a3a48' : '#e0d8d4' }} />
            <p className="text-[0.76rem] font-medium" style={{ color: tx }}>No online bookings yet</p>
            <p className="text-[0.66rem] max-w-[260px] leading-relaxed" style={{ color: mu }}>
              When clients book through the site, your most-requested services rank here automatically.
            </p>
          </div>
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
                      <span className="text-[0.6rem]" style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{completePct}% done</span>
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
          <span className="text-[0.62rem]" style={{ color: mu }}>{summary.totalBookings || 0} online appointment{summary.totalBookings === 1 ? '' : 's'}</span>
          <span className="text-[0.62rem]" style={{ color: mu }}>{summary.completedBookings || 0} completed</span>
        </div>
      </div>

      {/* ── Booksy import context — kept out of the stats, acknowledged here ── */}
      {importedClients > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: dm ? '#1e1e24' : '#FAFAFB', border: `1px solid ${bd}` }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(14,143,152,0.1)' }}>
            <Users size={13} color="#0E8F98" strokeWidth={1.6} />
          </div>
          <p className="text-[0.68rem] leading-snug" style={{ color: mu }}>
            <span style={{ color: tx, fontWeight: 600 }}>{importedClients.toLocaleString()} clients</span> imported from Booksy live in your
            Clients list. They're your history and contact base, so they're kept out of these site-activity stats.
          </p>
        </div>
      )}

    </div>
  );
}
