'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Users, BookOpen } from 'lucide-react';

const DEMO_DATA = {
  summary: {
    totalRevenue: 52800,
    thisMonthRevenue: 8400,
    lastMonthRevenue: 7200,
    totalBookings: 187,
    thisMonthBookings: 28,
    lastMonthBookings: 24,
    paidClassSignups: 18,
    completedBookings: 143,
  },
  monthlyTrend: [
    { shortLabel: 'Dec', revenue: 4200, bookings: 18 },
    { shortLabel: 'Jan', revenue: 5800, bookings: 22 },
    { shortLabel: 'Feb', revenue: 7100, bookings: 26 },
    { shortLabel: 'Mar', revenue: 6400, bookings: 24 },
    { shortLabel: 'Apr', revenue: 8200, bookings: 31 },
    { shortLabel: 'May', revenue: 8400, bookings: 28 },
  ],
  classByType: [
    { key: 'private_basic_lesson',  title: 'Basic Makeup Lesson',        price: 300,  count: 12, revenue: 3600 },
    { key: 'masterclass',           title: 'Advanced Makeup Lesson',      price: 1500, count: 4,  revenue: 6000 },
    { key: 'virtual_lesson',        title: 'Virtual Makeup Lesson',       price: 400,  count: 0,  revenue: 0    },
    { key: 'intermediate_lesson',   title: 'Intermediate Makeup Lesson',  price: 500,  count: 0,  revenue: 0    },
    { key: 'glam_class',            title: 'Glam Makeup Class',           price: 600,  count: 2,  revenue: 1200 },
  ],
  topServices: [
    { name: 'Bridal Glam',          count: 24, completed: 22 },
    { name: 'Event Makeup',         count: 19, completed: 17 },
    { name: 'Glamour Makeup',       count: 15, completed: 14 },
    { name: 'Basic Makeup Lesson',  count: 8,  completed: 8  },
    { name: 'Editorial Look',       count: 5,  completed: 4  },
    { name: 'Advanced Lesson',      count: 4,  completed: 4  },
    { name: 'Airbrush Makeup',      count: 3,  completed: 3  },
    { name: 'Special Occasion',     count: 2,  completed: 2  },
  ],
};

function pctDelta(current, previous) {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function fmtRevenue(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function StatCard({ icon: Icon, label, sub, value, accent, delta, dm }) {
  const cardBg  = dm ? '#26262e' : '#fff';
  const border  = dm ? '#3a3a48' : '#ede8e3';
  const text    = dm ? '#e4e4e7' : '#111';
  const muted   = dm ? '#71717a' : '#999';

  return (
    <div className="rounded-2xl px-4 py-4 flex flex-col gap-2.5" style={{ background: cardBg, border: `1px solid ${border}` }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon size={14} color={accent} strokeWidth={1.5} />
        </div>
        {delta !== null && delta !== undefined && (
          <span
            className="text-[0.55rem] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: delta >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: delta >= 0 ? '#22C55E' : '#EF4444',
            }}
          >
            {delta >= 0 ? '+' : ''}{delta}% vs last mo
          </span>
        )}
      </div>
      <div>
        <p className="text-[1.18rem] font-semibold leading-tight" style={{ color: text }}>{value}</p>
        <p className="text-[0.62rem] mt-0.5 leading-tight" style={{ color: muted }}>
          {label} <span style={{ fontWeight: 400 }}>· {sub}</span>
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, dm }) {
  if (!active || !payload?.length) return null;
  const bg     = dm ? '#26262e' : '#fff';
  const border = dm ? '#3a3a48' : '#ede8e3';
  const text   = dm ? '#e4e4e7' : '#111';
  const muted  = dm ? '#71717a' : '#999';
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: bg, border: `1px solid ${border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <p className="text-[0.72rem] font-semibold mb-1.5" style={{ color: text }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[0.66rem]" style={{ color: muted }}>{p.name}:</span>
          <span className="text-[0.66rem] font-semibold" style={{ color: text }}>
            {p.name === 'Revenue' ? `$${(p.value || 0).toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueTab({ darkMode: dm }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const cardBg   = dm ? '#26262e' : '#fff';
  const border   = dm ? '#3a3a48' : '#ede8e3';
  const text     = dm ? '#e4e4e7' : '#111';
  const muted    = dm ? '#71717a' : '#999';
  const gridLine = dm ? '#2e2e38' : '#f3eeea';
  const barFill  = dm ? '#3a3a48' : '#e6dfe0';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-[#D4A0B0] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center py-14 text-[0.8rem]" style={{ color: muted }}>
        Could not load analytics. Try refreshing.
      </p>
    );
  }

  const active = demoMode ? DEMO_DATA : (data || {});
  const { summary = {}, monthlyTrend = [], classByType = [], topServices = [] } = active;
  const revDelta  = pctDelta(summary.thisMonthRevenue,  summary.lastMonthRevenue);
  const bookDelta = pctDelta(summary.thisMonthBookings, summary.lastMonthBookings);
  const maxCount  = topServices[0]?.count || 1;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.57rem] font-semibold tracking-[0.18em] uppercase mb-0.5" style={{ color: '#D4A0B0' }}>
            Revenue & Insights
          </p>
          <h2 className="text-[1.1rem] font-serif font-light" style={{ color: text }}>Business Analytics</h2>
          <p className="text-[0.67rem] mt-0.5" style={{ color: muted }}>
            Class revenue via Stripe · Appointment booking trends
          </p>
        </div>
        <button
          onClick={() => setDemoMode(v => !v)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full mt-1 transition-all"
          style={{
            background: demoMode ? 'rgba(212,160,176,0.15)' : dm ? '#2e2e38' : '#f5f0ec',
            border: `1px solid ${demoMode ? 'rgba(212,160,176,0.35)' : dm ? '#3a3a48' : '#e4ddd7'}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: demoMode ? '#D4A0B0' : dm ? '#52525b' : '#ccc' }}
          />
          <span
            className="text-[0.58rem] font-semibold tracking-[0.08em] uppercase"
            style={{ color: demoMode ? '#D4A0B0' : muted }}
          >
            {demoMode ? 'Sample Data' : 'Live Data'}
          </span>
        </button>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={DollarSign}
          label="Class Revenue"
          sub="this month"
          value={`$${(summary.thisMonthRevenue || 0).toLocaleString()}`}
          accent="#22C55E"
          delta={revDelta}
          dm={dm}
        />
        <StatCard
          icon={Users}
          label="Appointments"
          sub="this month"
          value={summary.thisMonthBookings ?? 0}
          accent="#3B82F6"
          delta={bookDelta}
          dm={dm}
        />
        <StatCard
          icon={TrendingUp}
          label="All-Time Revenue"
          sub="from classes"
          value={fmtRevenue(summary.totalRevenue || 0)}
          accent="#D4A0B0"
          dm={dm}
        />
        <StatCard
          icon={BookOpen}
          label="Class Signups"
          sub="paid, all time"
          value={summary.paidClassSignups ?? 0}
          accent="#F59E0B"
          dm={dm}
        />
      </div>

      {/* ── Monthly Trend Chart ────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-0.5" style={{ color: muted }}>
          Last 6 Months
        </p>
        <p className="text-[0.78rem] font-semibold mb-4" style={{ color: text }}>Bookings & Class Revenue</p>
        <ResponsiveContainer width="100%" height={176}>
          <ComposedChart data={monthlyTrend} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={gridLine} vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fontSize: 9, fill: muted, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="b"
              orientation="left"
              allowDecimals={false}
              tick={{ fontSize: 9, fill: muted }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="r"
              orientation="right"
              tickFormatter={v => v === 0 ? '' : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              tick={{ fontSize: 9, fill: muted }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip dm={dm} />}
              cursor={{ fill: dm ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' }}
            />
            <Bar yAxisId="b" dataKey="bookings" name="Bookings" fill={barFill} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Line
              yAxisId="r"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#D4A0B0"
              strokeWidth={2}
              dot={{ fill: '#D4A0B0', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#D4A0B0', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-3 pt-3" style={{ borderTop: `1px solid ${border}` }}>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm" style={{ background: barFill }} />
            <span className="text-[0.62rem]" style={{ color: muted }}>Bookings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded-full" style={{ background: '#D4A0B0' }} />
            <span className="text-[0.62rem]" style={{ color: muted }}>Class Revenue</span>
          </div>
        </div>
      </div>

      {/* ── Class Revenue Breakdown ────────────────────────────── */}
      <div>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: muted }}>
          Class Revenue Breakdown
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {classByType.map(cls => (
            <div
              key={cls.key}
              className="rounded-2xl px-4 py-4 transition-opacity"
              style={{ background: cardBg, border: `1px solid ${border}`, opacity: cls.count === 0 ? 0.4 : 1 }}
            >
              <div className="flex items-start justify-between mb-2.5">
                <p className="text-[0.78rem] font-semibold leading-tight pr-2" style={{ color: text }}>{cls.title}</p>
                <span className="text-[0.65rem] font-medium flex-shrink-0" style={{ color: '#D4A0B0' }}>${cls.price}/person</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[1.15rem] font-semibold leading-none" style={{ color: text }}>
                    ${cls.revenue.toLocaleString()}
                  </p>
                  <p className="text-[0.6rem] mt-0.5" style={{ color: muted }}>
                    {cls.count} signup{cls.count !== 1 ? 's' : ''}
                  </p>
                </div>
                {cls.count === 0 && (
                  <span
                    className="text-[0.57rem] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: dm ? '#2e2e38' : '#f5f0ec', color: muted }}
                  >
                    No signups yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Services ──────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-0.5" style={{ color: muted }}>
          Appointment Analytics
        </p>
        <p className="text-[0.78rem] font-semibold mb-4" style={{ color: text }}>Most Booked Services</p>

        {topServices.length === 0 ? (
          <p className="text-[0.78rem]" style={{ color: muted }}>No bookings yet.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {topServices.map((svc, i) => {
              const pct = Math.round((svc.count / maxCount) * 100);
              return (
                <div key={svc.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center text-[0.52rem] font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? 'rgba(212,160,176,0.15)' : dm ? '#2e2e38' : '#f5f0ec',
                          color: i === 0 ? '#D4A0B0' : muted,
                        }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[0.75rem] font-medium leading-tight" style={{ color: text }}>{svc.name}</p>
                    </div>
                    <span className="text-[0.68rem] font-semibold flex-shrink-0 ml-3" style={{ color: muted }}>
                      {svc.count} booking{svc.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#f5f0ec' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? '#D4A0B0' : dm ? '#3a3a48' : '#d9d0cc',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <span className="text-[0.62rem]" style={{ color: muted }}>
            {summary.totalBookings || 0} total appointments
          </span>
          <span className="text-[0.62rem]" style={{ color: muted }}>
            {summary.completedBookings || 0} completed
          </span>
        </div>
      </div>

    </div>
  );
}
