'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Users, BookOpen, CheckCircle, Star, Calendar } from 'lucide-react';

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

function StatCard({ icon: Icon, label, sub, value, accent, delta, dm, selectable, active, onClick }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#E2E4EA';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  const pink = '#D4A0B0';

  // Selected headline cards get a pink ring + soft glow so the chart below
  // visibly "belongs" to whichever tile she tapped — the Stan-style drill-in.
  const border = active ? pink : bd;
  const ring   = active ? (dm ? '0 0 0 1px #D4A0B0, 0 8px 26px rgba(212,160,176,0.18)'
                              : '0 0 0 1px #D4A0B0, 0 8px 26px rgba(212,160,176,0.20)') : 'none';

  return (
    <div
      role={selectable ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl px-5 py-5 flex flex-col gap-3 transition-all duration-200 ${selectable ? 'cursor-pointer' : ''}`}
      style={{
        background: active ? (dm ? 'rgba(212,160,176,0.07)' : '#fffafc') : bg,
        border: `1px solid ${border}`,
        boxShadow: ring,
      }}
      onMouseEnter={selectable ? e => { if (!active) e.currentTarget.style.borderColor = dm ? '#5a5a68' : '#D6C0C9'; } : undefined}
      onMouseLeave={selectable ? e => { if (!active) e.currentTarget.style.borderColor = bd; } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon size={18} color={accent} strokeWidth={1.6} />
        </div>
        {delta !== null && delta !== undefined && (
          <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: delta >= 0 ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', color: delta >= 0 ? '#3B82F6' : '#EF4444' }}>
            {delta >= 0 ? '+' : ''}{delta}% vs last mo
          </span>
        )}
      </div>
      <div>
        <p className="text-[1.7rem] font-bold leading-none tabular-nums" style={{ color: tx }}>{value}</p>
        <p className="text-[0.68rem] mt-1.5 leading-tight" style={{ color: mu }}>
          {label} <span style={{ fontWeight: 400 }}>· {sub}</span>
        </p>
      </div>
      {selectable && (
        <span className="text-[0.58rem] font-semibold tracking-[0.06em] uppercase mt-0.5 transition-colors"
          style={{ color: active ? pink : (dm ? '#52525b' : '#c7c7cf') }}>
          {active ? '● Showing on chart' : 'Tap to chart'}
        </span>
      )}
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

function ChartTooltip({ active, payload, label, dm, money }) {
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
            {money ? `$${(p.value || 0).toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// The four headline tiles each map to one story the trend chart can tell.
// Tapping a tile swaps the chart to that metric — the Stan-style drill-in.
const REV_METRICS = {
  revenue:        { title: 'Class revenue over time',  key: 'revenue',    kind: 'line', money: true,  color: '#D4A0B0' },
  bookings:       { title: 'Appointments over time',   key: 'bookings',   kind: 'bar',  money: false, color: '#3B82F6' },
  allTimeRevenue: { title: 'Revenue, running total',   key: 'cumRevenue', kind: 'line', money: true,  color: '#D4A0B0' },
  signups:        { title: 'Class signups over time',  key: 'signups',    kind: 'bar',  money: false, color: '#F59E0B' },
};

// ─── Main ────────────────────────────────────────────────────────────────────

export default function RevenueTab({ darkMode: dm }) {
  const [range, setRange]         = useState('6m');
  const [metric, setMetric]       = useState('revenue'); // which headline tile drives the chart
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
  const grid    = dm ? '#2e2e38' : '#EEEEF3';

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
            {/* A rising line, not a sparkle. The panel is about money that
                has not arrived yet; a sparkle says nothing about that and is
                the one icon that reads as generated on sight. */}
            <TrendingUp size={17} color="#D4A0B0" strokeWidth={1.5} />
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

      {/* ── Range Selector — pill row like Stan's date ranges. Hover lifts the
              text toward the foreground; the selected pill is solid pink and
              bolder so it clearly reads as "you are here". ───────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {RANGE_OPTS.map(({ key, label }) => {
          const isActive = range === key;
          const idleBg   = dm ? '#2a2a32' : '#F3F3F7';
          const idleTx   = dm ? '#8a8a94' : '#8f8f98';
          const hoverTx  = dm ? '#f4f4f5' : '#111';
          return (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="px-4 py-2 rounded-full text-[0.72rem] flex-shrink-0 transition-all duration-200"
              style={{
                background:  isActive ? '#D4A0B0' : idleBg,
                color:       isActive ? '#fff' : idleTx,
                fontWeight:  isActive ? 700 : 500,
                border:      `1px solid ${isActive ? '#D4A0B0' : (dm ? '#3a3a48' : '#E6E6EC')}`,
                boxShadow:   isActive ? '0 4px 14px rgba(212,160,176,0.30)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = hoverTx; e.currentTarget.style.background = dm ? '#34343e' : '#EAEAEF'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = idleTx; e.currentTarget.style.background = idleBg; } }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Stats Grid — the two headline tiles are tappable and drive the
              trend chart below (revenue line vs bookings bars). ──────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Class Revenue"    sub="this month"     value={`$${(summary.thisMonthRevenue  || 0).toLocaleString()}`} accent="#3B82F6" delta={revDelta}  dm={dm}
          selectable active={metric === 'revenue'}        onClick={() => setMetric('revenue')} />
        <StatCard icon={Users}      label="Appointments"     sub="this month"     value={summary.thisMonthBookings ?? 0}                           accent="#3B82F6" delta={bookDelta} dm={dm}
          selectable active={metric === 'bookings'}       onClick={() => setMetric('bookings')} />
        <StatCard icon={TrendingUp} label="All-Time Revenue" sub="from classes"   value={fmtRevenue(summary.totalRevenue || 0)}                    accent="#D4A0B0"                   dm={dm}
          selectable active={metric === 'allTimeRevenue'} onClick={() => setMetric('allTimeRevenue')} />
        <StatCard icon={BookOpen}   label="Class Signups"    sub="paid, all time" value={summary.paidClassSignups ?? 0}                            accent="#F59E0B"                   dm={dm}
          selectable active={metric === 'signups'}        onClick={() => setMetric('signups')} />
      </div>

      {/* ── Insight Strip ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <InsightCard icon={CheckCircle} label="Completion Rate" value={`${completionRate}%`} sub="bookings done"   accent="#3B82F6" dm={dm} />
        <InsightCard icon={Star}        label="Avg per Class"    value={`$${avgClassRev}`}    sub="per signup"      accent="#F59E0B" dm={dm} />
        <InsightCard icon={Calendar}    label="Peak Day"         value={summary.peakDay || '—'} sub="most bookings" accent="#D4A0B0" dm={dm} />
      </div>

      {/* ── Trend Chart — shows whichever headline tile she tapped, one story
              at a time (revenue, appointments, running total, or signups). ── */}
      {(() => {
        const m = REV_METRICS[metric] || REV_METRICS.revenue;
        // Running total for the "All-Time Revenue" view, computed from the same
        // period buckets so the line only ever climbs.
        let run = 0;
        const chartData = monthlyTrend.map(d => { run += d.revenue || 0; return { ...d, cumRevenue: run }; });
        const yFmt = m.money ? (v => v === 0 ? '' : `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`) : undefined;
        return (
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: bg, border: `1px solid ${bd}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase" style={{ color: mu }}>
                {RANGE_TITLE[range]}
              </p>
            </div>
            <p className="text-[1.05rem] font-bold mb-4 leading-tight" style={{ color: tx }}>{m.title}</p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: m.money ? -8 : -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
                <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: mu, fontWeight: 500 }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis allowDecimals={false} tickFormatter={yFmt} tick={{ fontSize: 10, fill: mu }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip dm={dm} money={m.money} />} cursor={{ fill: dm ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' }} />
                {m.kind === 'bar'
                  ? <Bar dataKey={m.key} name={m.title} fill={m.color} radius={[4,4,0,0]} maxBarSize={34} />
                  : <Line type="monotone" dataKey={m.key} name={m.title} stroke={m.color} strokeWidth={2.5}
                      dot={{ fill: m.color, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: m.color, strokeWidth: 0 }} />}
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[0.62rem] mt-3 pt-3" style={{ color: mu, borderTop: `1px solid ${bd}` }}>
              Tap any card above to switch what this chart shows.
            </p>
          </div>
        );
      })()}

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
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#F0F0F5' }}>
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
            <Calendar size={22} strokeWidth={1.3} style={{ color: dm ? '#3a3a48' : '#D9D9DF' }} />
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
                        style={{ background: i === 0 ? 'rgba(212,160,176,0.15)' : dm ? '#2e2e38' : '#F0F0F5', color: i === 0 ? '#D4A0B0' : mu }}>
                        {i + 1}
                      </span>
                      <p className="text-[0.75rem] font-medium leading-tight" style={{ color: tx }}>{svc.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-[0.6rem]" style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{completePct}% done</span>
                      <span className="text-[0.68rem] font-semibold" style={{ color: mu }}>{svc.count}</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#F0F0F5' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#D4A0B0' : dm ? '#3a3a48' : '#D2D2D9', transition: 'width 0.6s ease' }} />
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
