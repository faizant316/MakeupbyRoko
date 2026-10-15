'use client';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, Smartphone, FileText, BarChart2, ExternalLink, Monitor, Globe, LineChart,
} from 'lucide-react';
import { cx, Label } from './ui';
import { SERIES, AXIS_TICK, GRID_LINE, ChartTip, PanelHead, StatTile, Skel, Meter } from './RevenueTab';

const GA = 'https://analytics.google.com/analytics/web/#/p536969013';

const fmt    = n  => n == null ? '--' : n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtDur = s  => !s ? '--' : s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
const pct    = (a, b) => b ? `${Math.round(a / b * 100)}%` : '0%';

// Each headline tile maps to one line the 30-day chart can draw. Tapping a tile
// swaps the chart, mirroring the click-to-chart interaction on the Revenue tab.
const TRAFFIC_METRICS = {
  visitors: { title: 'Visitors per day',       key: 'visitors' },
  sessions: { title: 'Sessions per day',       key: 'sessions' },
  avgTime:  { title: 'Avg time on site / day', key: 'avgTime', dur: true },
  newUsers: { title: 'New visitors per day',   key: 'newUsers' },
};

// The mark beside each source is a plain monogram in a hairline square. The
// brand colours they used to wear (Google blue, Instagram pink) made a rainbow
// of a list that is really one measure.
const CHANNEL_MAP = {
  'Organic Search':   { label: 'Google Search',      letter: 'G', desc: 'People who Googled "makeup artist" or your name and found you' },
  'Organic Social':   { label: 'Instagram / TikTok', letter: '◈', desc: 'Clicks from your social posts, reels, or bio link' },
  'Direct':           { label: 'Direct',             letter: '↗', desc: 'Typed your URL directly or used a bookmark, usually loyal repeat clients' },
  'Referral':         { label: 'Referral links',     letter: '⋯', desc: 'Someone else\'s website linked to yours: wedding blogs, vendor lists, directories' },
  'Email':            { label: 'Email',              letter: '@', desc: 'Clicked a link from one of your emails or booking confirmations' },
  'Paid Search':      { label: 'Paid ads',           letter: '$', desc: 'Traffic from Google Ads (if you\'re running any)' },
  'Organic Shopping': { label: 'Google Shopping',    letter: 'S', desc: 'People browsing beauty services on Google Shopping' },
  'Unassigned':       { label: 'Other',              letter: '·', desc: 'Traffic that Google couldn\'t categorize into a specific source' },
};

const COUNTRY_FLAG = {
  'United States':        '🇺🇸',
  'Canada':               '🇨🇦',
  'United Kingdom':       '🇬🇧',
  'Australia':            '🇦🇺',
  'Germany':              '🇩🇪',
  'France':               '🇫🇷',
  'Mexico':               '🇲🇽',
  'India':                '🇮🇳',
  'Brazil':               '🇧🇷',
  'United Arab Emirates': '🇦🇪',
  'Saudi Arabia':         '🇸🇦',
  'Pakistan':             '🇵🇰',
  'Philippines':          '🇵🇭',
  'Netherlands':          '🇳🇱',
  'Spain':                '🇪🇸',
  'Italy':                '🇮🇹',
};

function SectionHead({ label, desc }) {
  return (
    <div className="mb-3.5">
      <h2 className="text-[0.98rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{label}</h2>
      {desc && <p className="mt-1 text-[0.8rem] leading-snug text-ink-muted">{desc}</p>}
    </div>
  );
}

// A calm, intentional empty slot, shown while a freshly-launched site is still
// gathering its first real visitors, so a blank box never reads as "broken".
function EmptyState({ icon: Icon, text, compact }) {
  return (
    <div className={cx('flex flex-col items-center gap-2 px-5 text-center', compact ? 'py-6' : 'py-9')}>
      <Icon size={compact ? 18 : 22} strokeWidth={1.3} className="text-ink-muted/50" />
      <p className="max-w-[260px] text-[0.74rem] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">Collecting data.</span> {text}
      </p>
    </div>
  );
}

// The 30-day trend for whichever traffic tile is selected. Falls back to a calm
// "collecting data" panel when GA has nothing to plot yet (freshly-launched site).
function TrafficTrend({ metric, daily, loading }) {
  const m = TRAFFIC_METRICS[metric] || TRAFFIC_METRICS.visitors;

  const rows    = daily || [];
  const hasData = rows.length >= 2 && rows.some(r => (r[m.key] || 0) > 0);
  const yFmt    = m.dur ? (v => v === 0 ? '' : fmtDur(v)) : undefined;

  return (
    <section className="border border-line bg-paper">
      <PanelHead dot eyebrow="Last 30 days" title={m.title} />

      {loading ? (
        <div className="px-4 py-5 sm:px-5"><Skel className="h-[220px] w-full" /></div>
      ) : !hasData ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <LineChart size={22} strokeWidth={1.3} className="text-ink-muted/50" />
          <p className="max-w-[280px] text-[0.74rem] leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink">No trend yet.</span> Once a few days of visits come in,
            this chart fills in day by day.
          </p>
        </div>
      ) : (
        <div className="px-2 pb-2 pt-5 sm:px-4">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={rows} margin={{ top: 6, right: 12, left: m.dur ? 4 : -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID_LINE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(rows.length / 6))} minTickGap={16} tickMargin={8} />
              <YAxis allowDecimals={false} tickFormatter={yFmt} tick={AXIS_TICK} axisLine={false} tickLine={false} width={m.dur ? 44 : undefined} />
              <Tooltip
                cursor={{ stroke: 'rgb(var(--c-line-strong))', strokeWidth: 1 }}
                content={<ChartTip name={m.title.replace(' per day', '').replace(' / day', '')} format={v => (m.dur ? fmtDur(v) : v)} />}
              />
              <Area type="monotone" dataKey={m.key} stroke={SERIES} strokeWidth={2}
                fill={SERIES} fillOpacity={0.07} dot={false}
                activeDot={{ r: 4.5, fill: SERIES, stroke: 'rgb(var(--c-paper))', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="border-t border-line px-4 py-3 text-[0.74rem] text-ink-muted sm:px-5">
        Tap any card above to switch what this chart shows.
      </p>
    </section>
  );
}

export default function AnalyticsTab({ darkMode }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [metric,  setMetric]  = useState('visitors'); // which tile drives the 30-day chart

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  if (!loading && data?.notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 border border-line bg-paper px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center border border-line text-rose">
          <BarChart2 size={20} strokeWidth={1.5} />
        </span>
        <div>
          <p className="text-[0.98rem] font-semibold text-ink">Connect Google Analytics</p>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[0.8rem] leading-relaxed text-ink-muted">
            Add GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GA4_PROPERTY_ID to your environment variables to see live data here.
          </p>
        </div>
      </div>
    );
  }

  if (!loading && err) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 border border-line bg-paper px-6 py-14 text-center">
        <p className="text-[0.86rem] font-semibold text-ink">Failed to load analytics</p>
        <p className="text-[0.74rem] text-ink-muted">{err}</p>
      </div>
    );
  }

  const ov                = data?.overview;
  const totalTrafficSess  = (data?.traffic   || []).reduce((s, c) => s + c.sessions, 0);
  const totalDeviceUsers  = (data?.devices   || []).reduce((s, d) => s + d.users,    0);

  return (
    <div className="flex flex-col gap-8">

      {/* Realtime. A dot that breathes for people on the site right now. */}
      <div className="flex items-center gap-3 border border-line bg-paper px-4 py-3.5 sm:px-5">
        <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-tone-alert" />
        <div className="min-w-0 flex-1">
          {loading
            ? <Skel className="h-3.5 w-48" />
            : <p className="text-[0.86rem] font-medium text-ink">
                <span className="tabular-nums">{data?.realtimeUsers ?? 0}</span> {data?.realtimeUsers === 1 ? 'person' : 'people'} on your site right now
              </p>
          }
        </div>
        <span className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-tone-alert">Live</span>
      </div>

      {/* Audience overview. The tiles are tappable and drive the 30-day trend
          chart below. */}
      <div>
        <SectionHead label="Your visitors" desc="How many people came to the site in the last 30 days, and how they spent their time. Tap a card to chart it." />
        <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          <StatTile label="Visitors"  value={fmt(ov?.activeUsers)}                         sub="Unique people who visited"     loading={loading}
            active={metric === 'visitors'} onClick={() => setMetric('visitors')} />
          <StatTile label="Sessions"  value={fmt(ov?.sessions)}                            sub="Total visits (1 person can visit multiple times)" loading={loading}
            active={metric === 'sessions'} onClick={() => setMetric('sessions')} />
          <StatTile label="Avg time"  value={fmtDur(ov?.avgSessionDuration)}               sub="How long people stay per visit" loading={loading}
            active={metric === 'avgTime'} onClick={() => setMetric('avgTime')} />
          <StatTile label="New users" value={ov ? pct(ov.newUsers, ov.activeUsers) : '--'} sub="First-time visitors this month" loading={loading}
            active={metric === 'newUsers'} onClick={() => setMetric('newUsers')} />
        </div>
        <div className="mt-3">
          <TrafficTrend metric={metric} daily={data?.daily} loading={loading} />
        </div>
      </div>

      {/* Traffic sources */}
      <div>
        <SectionHead label="Where your visitors come from" desc="How people are finding the site, so you know what's actually working" />
        <div className="divide-y divide-line border border-line bg-paper">
          {loading
            ? [1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Skel className="h-9 w-9 shrink-0" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skel className="h-[11px] w-28" />
                    <Skel className="h-[3px] w-full" />
                  </div>
                  <Skel className="h-3.5 w-8 shrink-0" />
                </div>
              ))
            : (data?.traffic || []).length === 0
              ? <EmptyState icon={Activity} text="Traffic sources show up here as people find the site through Google, Instagram, and direct visits." />
              : (data?.traffic || []).map((ch, i) => {
                  const m   = CHANNEL_MAP[ch.channel] || { label: ch.channel, letter: '?' };
                  const bar = totalTrafficSess ? (ch.sessions / totalTrafficSess) * 100 : 0;
                  return (
                    <div key={ch.channel} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-[0.8rem] font-semibold text-ink-soft">
                        {m.letter}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-[0.86rem] font-medium text-ink">{m.label}</p>
                          <p className="shrink-0 text-[0.86rem] font-semibold tabular-nums text-ink">{fmt(ch.sessions)}</p>
                        </div>
                        {m.desc && <p className="mt-0.5 text-[0.74rem] leading-snug text-ink-muted">{m.desc}</p>}
                        <Meter pct={bar} lead={i === 0} className="mt-2" />
                      </div>
                    </div>
                  );
                })
          }
        </div>
      </div>

      {/* Top pages */}
      <div>
        <SectionHead label="Where they go on your site" desc="The pages people visit most. Your booking page ranking high is a good sign" />
        <div className="divide-y divide-line border border-line bg-paper">
          {loading
            ? [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Skel className="h-[11px] w-4 shrink-0" />
                  <Skel className="h-[11px] flex-1" />
                  <Skel className="h-[11px] w-10 shrink-0" />
                </div>
              ))
            : (data?.topPages || []).length === 0
              ? <EmptyState icon={FileText} compact text="Your most-visited pages rank here once people start browsing." />
              : (data?.topPages || []).map((p, i) => (
                  <div key={p.path} className="flex min-h-[48px] items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="w-4 shrink-0 text-right text-[0.74rem] font-semibold tabular-nums text-ink-muted">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FileText size={12} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
                      <p className="truncate text-[0.86rem] text-ink">
                        {p.path === '/' ? 'Home' : p.path}
                      </p>
                    </div>
                    <p className="shrink-0 text-[0.86rem] font-semibold tabular-nums text-ink">
                      {fmt(p.views)}
                    </p>
                  </div>
                ))
          }
        </div>
      </div>

      {/* Devices + locations: side by side from a tablet up, stacked on a phone
          where two columns left each list a sliver wide. */}
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">

        {/* Devices */}
        <div className="flex flex-col">
          <SectionHead label="What they use" desc="Phone vs. computer" />
          <div className="flex flex-1 flex-col gap-4 border border-line bg-paper px-4 py-4 sm:px-5">
            {loading
              ? [1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skel className="h-2.5 w-20" />
                    <Skel className="h-[3px] w-full" />
                  </div>
                ))
              : (data?.devices || []).length === 0
              ? <EmptyState icon={Smartphone} compact text="Mobile vs. desktop splits appear once visitors arrive." />
              : (data?.devices || []).map((d, i) => {
                  const p    = totalDeviceUsers ? Math.round(d.users / totalDeviceUsers * 100) : 0;
                  const Ico  = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? FileText : Monitor;
                  return (
                    <div key={d.device} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Ico size={13} strokeWidth={1.5} className="text-ink-muted" />
                          <p className="text-[0.86rem] font-medium capitalize text-ink">{d.device}</p>
                        </div>
                        <p className="text-[0.86rem] font-semibold tabular-nums text-ink">{p}%</p>
                      </div>
                      <Meter pct={p} lead={i === 0} />
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Locations */}
        <div className="flex flex-col">
          <SectionHead label="Where they're based" desc="Cities & countries" />
          <div className="flex-1 divide-y divide-line border border-line bg-paper">
            {loading
              ? [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-3 sm:px-5">
                    <Skel className="h-3.5 w-5 shrink-0" />
                    <Skel className="h-[11px] flex-1" />
                    <Skel className="h-[11px] w-8 shrink-0" />
                  </div>
                ))
              : (data?.locations || []).length === 0
              ? <EmptyState icon={Globe} compact text="Where your visitors are based shows here soon." />
              : (data?.locations || []).map(loc => (
                  <div key={loc.country} className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5">
                    <span className="w-6 shrink-0 text-center text-base leading-none">
                      {COUNTRY_FLAG[loc.country] || '🌍'}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[0.86rem] text-ink">{loc.country}</p>
                    <p className="shrink-0 text-[0.86rem] font-semibold tabular-nums text-ink">{fmt(loc.users)}</p>
                  </div>
                ))
            }
          </div>
        </div>

      </div>

      {/* Page views total, and the GA property this is all read from. */}
      <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
        {!loading && ov && (
          <div className="bg-paper px-4 py-4 sm:px-5 sm:py-5">
            <Label className="block">Total page views</Label>
            <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{fmt(ov.pageViews)}</p>
            <p className="mt-2 text-[0.74rem] text-ink-muted">last 30 days</p>
          </div>
        )}
        <div className={cx('flex flex-col justify-between gap-4 bg-paper px-4 py-4 sm:px-5 sm:py-5', (loading || !ov) && 'sm:col-span-2')}>
          <div>
            <Label className="block">Measurement ID</Label>
            <p className="mt-3 font-mono text-[0.92rem] font-medium tracking-[0.02em] text-ink">
              G-HE25CGQHH4
            </p>
          </div>
          <span className="inline-flex h-6 w-fit items-center gap-1.5 bg-tone-confirmed/10 px-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-tone-confirmed">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-tone-confirmed" />
            Tracking active
          </span>
        </div>
      </div>

      {/* Open GA4 */}
      <a
        href={`${GA}/reports/intelligenthome`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-h-[64px] items-center justify-between gap-3 border border-line bg-paper px-4 py-3.5 transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-ink-soft">
            <BarChart2 size={15} strokeWidth={1.5} />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.86rem] font-semibold text-ink">Open full dashboard</span>
            <span className="mt-0.5 block text-[0.74rem] text-ink-muted">Google Analytics 4</span>
          </span>
        </span>
        <ExternalLink size={14} strokeWidth={1.6} className="shrink-0 text-ink-muted transition-colors group-hover:text-ink" />
      </a>

    </div>
  );
}
