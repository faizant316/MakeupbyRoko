'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, Calendar } from 'lucide-react';
import { cx, Label, Segmented } from './ui';

// ─── Ranges ──────────────────────────────────────────────────────────────────

const RANGE_OPTS = [
  { key: '1d',  label: 'Today'    },
  { key: '7d',  label: '7 days'   },
  { key: '30d', label: '30 days'  },
  { key: '6m',  label: '6 months' },
  { key: '12m', label: '1 year'   },
];

const RANGE_TITLE = {
  '1d':  'Today · by hour',
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
  '6m':  'Last 6 months',
  '12m': 'Last 12 months',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctDelta(cur, prev) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function fmtRevenue(n) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
}

// ─── Chart parts (shared with the Traffic half) ──────────────────────────────

// Every chart in Reports draws one series, in the one rose. The colours are the
// admin's variables, so the charts follow dark mode without knowing about it.
export const SERIES = 'rgb(var(--c-rose))';
export const AXIS_TICK = { fontSize: 11, fill: 'rgb(var(--c-ink-muted))' };
export const GRID_LINE = 'rgb(var(--c-line))';

// The hover panel: square, one hairline, and the only shadow on the page
// because it floats over the chart.
export function ChartTip({ active, payload, label, name, format = v => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[9rem] border border-line bg-paper px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="mt-1.5 flex items-center gap-2 whitespace-nowrap text-[0.8rem]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
          <span className="text-ink-muted">{name ?? p.name}</span>
          <span className="ml-auto pl-4 font-semibold tabular-nums text-ink">{format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// The title block over a chart or a list: a small label, the title, and room
// on the right (or underneath, on a phone) for a control.
export function PanelHead({ eyebrow, title, action, dot }) {
  return (
    <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        {eyebrow ? (
          <Label className="flex items-center gap-2">
            {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose" /> : null}
            {eyebrow}
          </Label>
        ) : null}
        <h2 className={cx('text-[0.95rem] font-semibold tracking-[-0.01em] text-ink', eyebrow && 'mt-1')}>{title}</h2>
      </div>
      {action}
    </header>
  );
}

// One figure in a hairline bento. A tile that can drive the chart is a
// button; the one on the chart says so in rose.
export function StatTile({ label, value, sub, delta, active, onClick, loading }) {
  const selectable = !!onClick;
  const Tag = selectable ? 'button' : 'div';
  return (
    <Tag
      {...(selectable ? { type: 'button', onClick, 'aria-pressed': !!active } : {})}
      className={cx(
        'flex min-w-0 flex-col bg-paper px-4 pb-4 pt-4 text-left sm:px-5 sm:pb-5',
        selectable && 'transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose" /> : null}
        <span className={cx('truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em]', active ? 'text-rose' : 'text-ink-muted')}>{label}</span>
      </span>
      {loading
        ? <Skel className="mt-3 h-8 w-2/3" />
        : <span className="mt-3 block truncate text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{value}</span>}
      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.74rem] leading-snug text-ink-muted">
        {sub ? <span>{sub}</span> : null}
        {delta !== null && delta !== undefined && (
          <span className={cx(
            'inline-flex h-5 items-center px-1.5 text-[0.62rem] font-semibold tabular-nums',
            delta >= 0 ? 'bg-tone-confirmed/10 text-tone-confirmed' : 'bg-tone-alert/10 text-tone-alert',
          )}>
            {delta >= 0 ? '+' : ''}{delta}% vs last mo
          </span>
        )}
      </span>
      {selectable && (
        <span className={cx(
          'mt-auto pt-4 text-[0.62rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-200',
          active ? 'text-rose' : 'text-ink-muted/70',
        )}>
          {active ? 'Showing on chart' : 'Tap to chart'}
        </span>
      )}
    </Tag>
  );
}

// A smaller figure for the row under the headline tiles.
function InsightTile({ label, value, sub }) {
  return (
    <div className="min-w-0 bg-paper px-3 py-3.5 sm:px-5 sm:py-4">
      <p className="truncate text-[0.74rem] text-ink-muted">{label}</p>
      <p className="mt-1 truncate text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 truncate text-[0.68rem] text-ink-muted/80">{sub}</p>
    </div>
  );
}

export function Skel({ className }) {
  return <div className={cx('animate-pulse bg-line', className)} />;
}

// A share of the whole as a 3px rule. Grows by transform, so it never lays the
// page out again.
export function Meter({ pct, lead = true, className }) {
  return (
    <div className={cx('h-[3px] w-full overflow-hidden bg-line', className)}>
      <div
        className={cx('h-full origin-left transition-transform duration-700 ease-quint', lead ? 'bg-rose' : 'bg-ink-muted/45')}
        style={{ transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})` }}
      />
    </div>
  );
}

// The four headline tiles each map to one story the trend chart can tell.
// Tapping a tile swaps the chart to that metric (the Stan-style drill-in).
const REV_METRICS = {
  revenue:        { title: 'Class revenue over time',  key: 'revenue',    kind: 'line', money: true  },
  bookings:       { title: 'Appointments over time',   key: 'bookings',   kind: 'bar',  money: false },
  allTimeRevenue: { title: 'Revenue, running total',   key: 'cumRevenue', kind: 'line', money: true  },
  signups:        { title: 'Class signups over time',  key: 'signups',    kind: 'bar',  money: false },
};

// ─── Main ────────────────────────────────────────────────────────────────────

export default function RevenueTab({ darkMode }) {
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

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-soft border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="py-14 text-center text-[0.8rem] text-ink-muted">Could not load revenue data. Try refreshing.</p>;
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
  // intentional empty note instead of a wall of zeros that reads as broken.
  const noActivity = !summary.totalBookings && !summary.totalRevenue && !summary.paidClassSignups;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Empty state (only before any real site activity) ─────────────── */}
      {noActivity && (
        <div className="flex items-start gap-4 border border-line bg-paper px-4 py-5 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line text-rose">
            {/* A rising line, not a sparkle. The panel is about money that
                has not arrived yet; a sparkle says nothing about that and is
                the one icon that reads as generated on sight. */}
            <TrendingUp size={17} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.92rem] font-semibold text-ink">Your revenue starts here</p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-muted">
              These numbers track what happens on this website: appointments booked online and classes paid through Stripe.
              As soon as your first client books or buys a class, it appears here in real time.
              {importedClients > 0 && (
                <> Your {importedClients.toLocaleString()} imported Booksy {importedClients === 1 ? 'client is' : 'clients are'} kept
                in the <span className="font-semibold text-ink">Clients</span> list as your contact base, and aren't counted as new site bookings.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Figures. The four headline tiles are tappable and drive the trend
              chart below; the strip under them is read-only. Hairline bentos,
              the gaps are the rules. ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          <StatTile label="Class revenue"    sub="this month"     value={`$${(summary.thisMonthRevenue || 0).toLocaleString()}`} delta={revDelta}
            active={metric === 'revenue'}        onClick={() => setMetric('revenue')} />
          <StatTile label="Appointments"     sub="this month"     value={summary.thisMonthBookings ?? 0}                         delta={bookDelta}
            active={metric === 'bookings'}       onClick={() => setMetric('bookings')} />
          <StatTile label="All-time revenue" sub="from classes"   value={fmtRevenue(summary.totalRevenue || 0)}
            active={metric === 'allTimeRevenue'} onClick={() => setMetric('allTimeRevenue')} />
          <StatTile label="Class signups"    sub="paid, all time" value={summary.paidClassSignups ?? 0}
            active={metric === 'signups'}        onClick={() => setMetric('signups')} />
        </div>
        <div className="grid grid-cols-3 gap-px border border-line bg-line">
          <InsightTile label="Completion rate" value={`${completionRate}%`}       sub="bookings done" />
          <InsightTile label="Avg per class"   value={`$${avgClassRev}`}          sub="per signup" />
          <InsightTile label="Peak day"        value={summary.peakDay || '–'}     sub="most bookings" />
        </div>
      </div>

      {/* ── Trend chart. Shows whichever headline tile she tapped, one story
              at a time (revenue, appointments, running total, or signups).
              The range only changes this chart, so it lives in its header. ── */}
      {(() => {
        const m = REV_METRICS[metric] || REV_METRICS.revenue;
        // Running total for the "All-Time Revenue" view, computed from the same
        // period buckets so the line only ever climbs.
        let run = 0;
        const chartData = monthlyTrend.map(d => { run += d.revenue || 0; return { ...d, cumRevenue: run }; });
        const yFmt = m.money ? (v => v === 0 ? '' : `$${v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v}`) : undefined;
        const tipFmt = m.money ? (v => `$${(v || 0).toLocaleString()}`) : (v => v);
        return (
          <section className="border border-line bg-paper">
            <PanelHead
              dot
              eyebrow={RANGE_TITLE[range]}
              title={m.title}
              action={
                <Segmented
                  options={RANGE_OPTS.map(o => ({ value: o.key, label: o.label }))}
                  value={range}
                  onChange={setRange}
                  className="w-full sm:w-auto [&>button]:justify-center [&>button]:whitespace-nowrap max-sm:[&>button]:flex-1 max-sm:[&>button]:px-1.5"
                />
              }
            />
            <div className="px-2 pb-2 pt-5 sm:px-4">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 6, right: 12, left: m.money ? -4 : -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID_LINE} vertical={false} />
                  <XAxis dataKey="shortLabel" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={xInterval} tickMargin={8} />
                  <YAxis allowDecimals={false} tickFormatter={yFmt} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<ChartTip format={tipFmt} />}
                    cursor={{ stroke: 'rgb(var(--c-line-strong))', strokeWidth: 1 }}
                  />
                  {m.kind === 'bar'
                    ? <Bar dataKey={m.key} name={m.title} fill={SERIES} radius={[2, 2, 0, 0]} maxBarSize={30} />
                    : <Area type="monotone" dataKey={m.key} name={m.title} stroke={SERIES} strokeWidth={2}
                        fill={SERIES} fillOpacity={0.07}
                        dot={false} activeDot={{ r: 4.5, fill: SERIES, stroke: 'rgb(var(--c-paper))', strokeWidth: 2 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="border-t border-line px-4 py-3 text-[0.74rem] text-ink-muted sm:px-5">
              Tap any card above to switch what this chart shows.
            </p>
          </section>
        );
      })()}

      {/* ── Class revenue breakdown ─────────────────────────── */}
      {classByType.length > 0 && (
        <div>
          <Label className="mb-3 block">Class revenue breakdown</Label>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {classByType.map(cls => (
              <div key={cls.key} className="min-w-0 bg-paper px-4 py-4 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[0.86rem] font-semibold text-ink">{cls.title}</p>
                  <span className="shrink-0 text-[0.74rem] tabular-nums text-ink-muted">${cls.price}/person</span>
                </div>
                <p className="mt-3 text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">${cls.revenue.toLocaleString()}</p>
                <p className="mt-1.5 text-[0.74rem] tabular-nums text-ink-muted">{cls.count} signup{cls.count !== 1 ? 's' : ''}</p>
                {cls.count > 0 && <Meter pct={(cls.count / 15) * 100} className="mt-3" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Most booked services ────────────────────────────── */}
      <section className="border border-line bg-paper">
        <PanelHead eyebrow="Appointment analytics" title="Most booked services" />
        {topServices.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-9 text-center">
            <Calendar size={22} strokeWidth={1.3} className="text-ink-muted/50" />
            <p className="mt-1 text-[0.86rem] font-medium text-ink">No online bookings yet</p>
            <p className="max-w-[280px] text-[0.74rem] leading-relaxed text-ink-muted">
              When clients book through the site, your most-requested services rank here automatically.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {topServices.map((svc, i) => {
              const pct = Math.round((svc.count / maxCount) * 100);
              const completePct = svc.count ? Math.round((svc.completed / svc.count) * 100) : 0;
              return (
                <li key={svc.name} className="px-4 py-3.5 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cx('w-4 shrink-0 text-right text-[0.74rem] font-semibold tabular-nums', i === 0 ? 'text-rose' : 'text-ink-muted')}>
                        {i + 1}
                      </span>
                      <p className="truncate text-[0.86rem] font-medium text-ink">{svc.name}</p>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-3">
                      <span className="text-[0.68rem] tabular-nums text-ink-muted">{completePct}% done</span>
                      <span className="w-6 text-right text-[0.86rem] font-semibold tabular-nums text-ink">{svc.count}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 pl-7"><Meter pct={pct} lead={i === 0} /></div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[0.74rem] tabular-nums text-ink-muted sm:px-5">
          <span>{summary.totalBookings || 0} online appointment{summary.totalBookings === 1 ? '' : 's'}</span>
          <span>{summary.completedBookings || 0} completed</span>
        </div>
      </section>

      {/* ── Booksy import context: kept out of the stats, acknowledged here ── */}
      {importedClients > 0 && (
        <div className="flex items-start gap-3 border border-line bg-paper px-4 py-3.5 sm:px-5">
          <Users size={15} strokeWidth={1.6} className="mt-0.5 shrink-0 text-ink-muted" />
          <p className="text-[0.8rem] leading-snug text-ink-muted">
            <span className="font-semibold text-ink">{importedClients.toLocaleString()} clients</span> imported from Booksy live in your
            Clients list. They're your history and contact base, so they're kept out of these site-activity stats.
          </p>
        </div>
      )}

    </div>
  );
}
