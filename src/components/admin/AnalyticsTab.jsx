'use client';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, Activity, Clock, RefreshCw,
  Smartphone, FileText, BarChart2, ExternalLink, Zap, Monitor, Globe, LineChart,
} from 'lucide-react';

const GA = 'https://analytics.google.com/analytics/web/#/p536969013';

const fmt    = n  => n == null ? '--' : n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtDur = s  => !s ? '--' : s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
const pct    = (a, b) => b ? `${Math.round(a / b * 100)}%` : '0%';

// Each headline tile maps to one line the 30-day chart can draw. Tapping a tile
// swaps the chart, mirroring the click-to-chart interaction on the Revenue tab.
const TRAFFIC_METRICS = {
  visitors: { title: 'Visitors per day',      key: 'visitors', color: '#3B82F6' },
  sessions: { title: 'Sessions per day',      key: 'sessions', color: '#3B82F6' },
  avgTime:  { title: 'Avg time on site / day', key: 'avgTime',  color: '#F59E0B', dur: true },
  newUsers: { title: 'New visitors per day',  key: 'newUsers', color: '#D4A0B0' },
};

const CHANNEL_MAP = {
  'Organic Search':   { label: 'Google Search',    dot: '#4285F4', letter: 'G', desc: 'People who Googled "makeup artist" or your name and found you' },
  'Organic Social':   { label: 'Instagram / TikTok', dot: '#E1306C', letter: '◈', desc: 'Clicks from your social posts, reels, or bio link' },
  'Direct':           { label: 'Direct',           dot: '#8B5CF6', letter: '↗', desc: 'Typed your URL directly or used a bookmark — usually loyal repeat clients' },
  'Referral':         { label: 'Referral Links',   dot: '#3B82F6', letter: '⋯', desc: 'Someone else\'s website linked to yours — wedding blogs, vendor lists, directories' },
  'Email':            { label: 'Email',            dot: '#F59E0B', letter: '@', desc: 'Clicked a link from one of your emails or booking confirmations' },
  'Paid Search':      { label: 'Paid Ads',         dot: '#EF4444', letter: '$', desc: 'Traffic from Google Ads (if you\'re running any)' },
  'Organic Shopping': { label: 'Google Shopping',  dot: '#34A853', letter: 'S', desc: 'People browsing beauty services on Google Shopping' },
  'Unassigned':       { label: 'Other',            dot: '#6B7280', letter: '·', desc: 'Traffic that Google couldn\'t categorize into a specific source' },
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

function Skel({ dm, h = 16, className = '' }) {
  return (
    <div className={`rounded-lg animate-pulse ${className}`}
      style={{ height: h, background: dm ? '#2e2e38' : '#EBEBF0' }} />
  );
}

function SectionHead({ label, desc, dm }) {
  const tx = dm ? '#e4e4e7' : '#1a1a1a';
  const mu = dm ? '#71717a' : '#999';
  return (
    <div className="mb-3.5">
      <p className="text-[0.98rem] font-bold tracking-[-0.01em] leading-tight" style={{ color: tx }}>
        {label}
      </p>
      {desc && <p className="text-[0.7rem] mt-1 leading-snug" style={{ color: mu }}>{desc}</p>}
    </div>
  );
}

// A calm, intentional empty slot — shown while a freshly-launched site is still
// gathering its first real visitors, so a blank box never reads as "broken".
function EmptyState({ icon: Icon, text, dm, compact }) {
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  return (
    <div className={`flex flex-col items-center text-center gap-1.5 ${compact ? 'py-6' : 'py-8'}`}>
      <Icon size={compact ? 18 : 22} strokeWidth={1.3} style={{ color: dm ? '#3a3a48' : '#D9D9DF' }} />
      <p className="text-[0.72rem] max-w-[260px] leading-relaxed" style={{ color: mu }}>
        <span style={{ color: tx, fontWeight: 600 }}>Collecting data.</span> {text}
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, accent, label, value, sub, loading, dm, selectable, active, onClick }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#E2E4EA';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  const pink = '#D4A0B0';

  const border = active ? pink : bd;
  const ring   = active ? '0 0 0 1px #D4A0B0, 0 8px 26px rgba(212,160,176,0.18)' : 'none';

  return (
    <div
      role={selectable ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-2xl p-5 transition-all duration-200 ${selectable ? 'cursor-pointer' : ''}`}
      style={{
        background: active ? (dm ? 'rgba(212,160,176,0.07)' : '#fffafc') : bg,
        border: `1px solid ${border}`,
        boxShadow: ring,
      }}
      onMouseEnter={selectable ? e => { if (!active) e.currentTarget.style.borderColor = dm ? '#5a5a68' : '#D6C0C9'; } : undefined}
      onMouseLeave={selectable ? e => { if (!active) e.currentTarget.style.borderColor = bd; } : undefined}
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: `${accent}18` }}>
        <Icon size={18} color={accent} strokeWidth={1.6} />
      </div>
      {loading
        ? <Skel dm={dm} h={32} className="w-2/3" />
        : <p className="text-[1.9rem] font-bold leading-none tabular-nums" style={{ color: tx }}>{value}</p>
      }
      <div>
        <p className="text-[0.78rem] font-semibold" style={{ color: tx }}>{label}</p>
        <p className="text-[0.64rem] mt-0.5 leading-snug" style={{ color: mu }}>{sub}</p>
      </div>
      {selectable && (
        <span className="text-[0.56rem] font-semibold tracking-[0.06em] uppercase transition-colors"
          style={{ color: active ? pink : (dm ? '#52525b' : '#c7c7cf') }}>
          {active ? '● Showing on chart' : 'Tap to chart'}
        </span>
      )}
    </div>
  );
}

// The 30-day trend for whichever traffic tile is selected. Falls back to a calm
// "collecting data" panel when GA has nothing to plot yet (freshly-launched site).
function TrafficTrend({ metric, daily, loading, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#E2E4EA';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  const grid = dm ? '#2e2e38' : '#EEEEF3';
  const m = TRAFFIC_METRICS[metric] || TRAFFIC_METRICS.visitors;

  const rows    = daily || [];
  const hasData = rows.length >= 2 && rows.some(r => (r[m.key] || 0) > 0);
  const yFmt    = m.dur ? (v => v === 0 ? '' : fmtDur(v)) : undefined;

  return (
    <div className="rounded-2xl p-5 sm:p-6 mt-3" style={{ background: bg, border: `1px solid ${bd}` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
        <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase" style={{ color: mu }}>Last 30 days</p>
      </div>
      <p className="text-[1.05rem] font-bold mb-4 leading-tight" style={{ color: tx }}>{m.title}</p>

      {loading ? (
        <Skel dm={dm} h={220} className="w-full" />
      ) : !hasData ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-12">
          <LineChart size={22} strokeWidth={1.3} style={{ color: dm ? '#3a3a48' : '#D9D9DF' }} />
          <p className="text-[0.72rem] max-w-[280px] leading-relaxed" style={{ color: mu }}>
            <span style={{ color: tx, fontWeight: 600 }}>No trend yet.</span> Once a few days of visits come in,
            this chart fills in day by day.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={rows} margin={{ top: 6, right: 8, left: m.dur ? 4 : -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={m.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={m.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: mu }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(rows.length / 6))} minTickGap={16} />
            <YAxis allowDecimals={false} tickFormatter={yFmt} tick={{ fontSize: 10, fill: mu }} axisLine={false} tickLine={false} width={m.dur ? 44 : undefined} />
            <Tooltip
              cursor={{ stroke: m.color, strokeWidth: 1, strokeOpacity: 0.3 }}
              contentStyle={{ background: bg, border: `1px solid ${bd}`, borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: tx, fontWeight: 600, marginBottom: 2 }}
              formatter={v => [m.dur ? fmtDur(v) : v, m.title.replace(' per day', '').replace(' / day', '')]}
            />
            <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2.5}
              fill={`url(#grad-${metric})`} dot={false} activeDot={{ r: 4, fill: m.color, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <p className="text-[0.62rem] mt-3 pt-3" style={{ color: mu, borderTop: `1px solid ${bd}` }}>
        Tap any card above to switch what this chart shows.
      </p>
    </div>
  );
}

export default function AnalyticsTab({ darkMode: dm }) {
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

  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#E2E4EA';
  const sb = dm ? '#1e1e24' : '#FAFAFB';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  const di = dm ? '#52525b' : '#bcbcc4';

  if (!loading && data?.notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(212,160,176,0.1)', border: '1px solid rgba(212,160,176,0.2)' }}>
          <BarChart2 size={22} color="#D4A0B0" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[0.95rem] font-semibold mb-1.5" style={{ color: tx }}>
            Connect Google Analytics
          </p>
          <p className="text-[0.72rem] leading-relaxed" style={{ color: mu }}>
            Add GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GA4_PROPERTY_ID to your environment variables to see live data here.
          </p>
        </div>
      </div>
    );
  }

  if (!loading && err) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
        <p className="text-[0.85rem] font-semibold" style={{ color: tx }}>Failed to load analytics</p>
        <p className="text-[0.7rem]" style={{ color: mu }}>{err}</p>
      </div>
    );
  }

  const ov                = data?.overview;
  const totalTrafficSess  = (data?.traffic   || []).reduce((s, c) => s + c.sessions, 0);
  const totalDeviceUsers  = (data?.devices   || []).reduce((s, d) => s + d.users,    0);

  return (
    <div className="flex flex-col gap-6">

      {/* Realtime banner */}
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{ background: dm ? '#1a1118' : '#fff5f7', border: '1px solid rgba(212,160,176,0.25)' }}>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <div className="flex-1">
          {loading
            ? <Skel dm={dm} h={14} className="w-48" />
            : <p className="text-[0.8rem] font-semibold" style={{ color: dm ? '#f4d4dc' : '#8b3a52' }}>
                {data?.realtimeUsers ?? 0} {data?.realtimeUsers === 1 ? 'person' : 'people'} on your site right now
              </p>
          }
        </div>
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-red-500 flex-shrink-0">Live</span>
      </div>

      {/* Audience Overview — tiles are tappable and drive the 30-day trend chart below */}
      <div>
        <SectionHead label="Your visitors" desc="How many people came to the site in the last 30 days, and how they spent their time. Tap a card to chart it." dm={dm} />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Users}     accent="#3B82F6" label="Visitors"  value={fmt(ov?.activeUsers)}                              sub="Unique people who visited"     loading={loading} dm={dm}
            selectable active={metric === 'visitors'} onClick={() => setMetric('visitors')} />
          <MetricCard icon={Activity}  accent="#3B82F6" label="Sessions"  value={fmt(ov?.sessions)}                                 sub="Total visits (1 person can visit multiple times)" loading={loading} dm={dm}
            selectable active={metric === 'sessions'} onClick={() => setMetric('sessions')} />
          <MetricCard icon={Clock}     accent="#F59E0B" label="Avg Time"  value={fmtDur(ov?.avgSessionDuration)}                    sub="How long people stay per visit" loading={loading} dm={dm}
            selectable active={metric === 'avgTime'} onClick={() => setMetric('avgTime')} />
          <MetricCard icon={RefreshCw} accent="#D4A0B0" label="New Users" value={ov ? pct(ov.newUsers, ov.activeUsers) : '--'}      sub="First-time visitors this month" loading={loading} dm={dm}
            selectable active={metric === 'newUsers'} onClick={() => setMetric('newUsers')} />
        </div>
        <TrafficTrend metric={metric} daily={data?.daily} loading={loading} dm={dm} />
      </div>

      {/* Traffic sources */}
      <div>
        <SectionHead label="Where your visitors come from" desc="How people are finding the site, so you know what's actually working" dm={dm} />
        <div className="rounded-2xl overflow-hidden" style={{ background: bg, border: `1px solid ${bd}` }}>
          {loading
            ? [1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < 4 ? `1px solid ${bd}` : 'none' }}>
                  <Skel dm={dm} h={36} className="w-9 flex-shrink-0 rounded-xl" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skel dm={dm} h={11} className="w-28" />
                    <Skel dm={dm} h={6} className="w-full rounded-full" />
                  </div>
                  <Skel dm={dm} h={14} className="w-8 flex-shrink-0" />
                </div>
              ))
            : (data?.traffic || []).length === 0
              ? <EmptyState icon={Activity} dm={dm} text="Traffic sources show up here as people find the site through Google, Instagram, and direct visits." />
              : (data?.traffic || []).map((ch, i, arr) => {
                  const m   = CHANNEL_MAP[ch.channel] || { label: ch.channel, dot: '#6B7280', letter: '?' };
                  const bar = totalTrafficSess ? (ch.sessions / totalTrafficSess) * 100 : 0;
                  return (
                    <div key={ch.channel} className="flex items-center gap-3 px-4 py-3.5"
                      style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : 'none' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-[0.78rem]"
                        style={{ background: m.dot }}>
                        {m.letter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.75rem] font-semibold" style={{ color: tx }}>{m.label}</p>
                        {m.desc && <p className="text-[0.6rem] mb-1.5 leading-snug" style={{ color: mu }}>{m.desc}</p>}
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#EBEBF0' }}>
                          <div className="h-full rounded-full" style={{ width: `${bar}%`, background: m.dot }} />
                        </div>
                      </div>
                      <p className="text-[0.78rem] font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: tx }}>
                        {fmt(ch.sessions)}
                      </p>
                    </div>
                  );
                })
          }
        </div>
      </div>

      {/* Top pages */}
      <div>
        <SectionHead label="Where they go on your site" desc="The pages people visit most. Your booking page ranking high is a good sign" dm={dm} />
        <div className="rounded-2xl overflow-hidden" style={{ background: bg, border: `1px solid ${bd}` }}>
          {loading
            ? [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < 5 ? `1px solid ${bd}` : 'none' }}>
                  <Skel dm={dm} h={11} className="w-4 flex-shrink-0" />
                  <Skel dm={dm} h={11} className="flex-1" />
                  <Skel dm={dm} h={11} className="w-10 flex-shrink-0" />
                </div>
              ))
            : (data?.topPages || []).length === 0
              ? <EmptyState icon={FileText} dm={dm} compact text="Your most-visited pages rank here once people start browsing." />
              : (data?.topPages || []).map((p, i, arr) => (
                  <div key={p.path} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : 'none' }}>
                    <span className="text-[0.62rem] font-bold w-4 text-right flex-shrink-0 tabular-nums" style={{ color: di }}>
                      {i + 1}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={10} strokeWidth={1.5} style={{ color: mu, flexShrink: 0 }} />
                      <p className="text-[0.73rem] truncate" style={{ color: tx }}>
                        {p.path === '/' ? 'Home' : p.path}
                      </p>
                    </div>
                    <p className="text-[0.73rem] font-semibold tabular-nums flex-shrink-0" style={{ color: tx }}>
                      {fmt(p.views)}
                    </p>
                  </div>
                ))
          }
        </div>
      </div>

      {/* Devices + Locations */}
      <div className="grid grid-cols-2 gap-3">

        {/* Devices */}
        <div>
          <SectionHead label="What they use" desc="Phone vs. computer" dm={dm} />
          <div className="rounded-2xl p-4 h-full flex flex-col gap-3.5" style={{ background: bg, border: `1px solid ${bd}` }}>
            {loading
              ? [1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <Skel dm={dm} h={10} className="w-20" />
                    <Skel dm={dm} h={5} className="w-full rounded-full" />
                  </div>
                ))
              : (data?.devices || []).length === 0
              ? <EmptyState icon={Smartphone} dm={dm} compact text="Mobile vs. desktop splits appear once visitors arrive." />
              : (data?.devices || []).map(d => {
                  const p    = totalDeviceUsers ? Math.round(d.users / totalDeviceUsers * 100) : 0;
                  const Ico  = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? FileText : Monitor;
                  return (
                    <div key={d.device} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Ico size={10} strokeWidth={1.5} style={{ color: mu }} />
                          <p className="text-[0.65rem] font-medium capitalize" style={{ color: tx }}>{d.device}</p>
                        </div>
                        <p className="text-[0.65rem] font-bold tabular-nums" style={{ color: tx }}>{p}%</p>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: dm ? '#2e2e38' : '#EBEBF0' }}>
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: '#D4A0B0' }} />
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Locations */}
        <div>
          <SectionHead label="Where they're based" desc="Cities & countries" dm={dm} />
          <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: bg, border: `1px solid ${bd}` }}>
            {loading
              ? [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <Skel dm={dm} h={14} className="w-5 flex-shrink-0" />
                    <Skel dm={dm} h={11} className="flex-1" />
                    <Skel dm={dm} h={11} className="w-8 flex-shrink-0" />
                  </div>
                ))
              : (data?.locations || []).length === 0
              ? <EmptyState icon={Globe} dm={dm} compact text="Where your visitors are based shows here soon." />
              : (data?.locations || []).map(loc => (
                  <div key={loc.country} className="flex items-center gap-2">
                    <span className="text-base leading-none flex-shrink-0">
                      {COUNTRY_FLAG[loc.country] || '🌍'}
                    </span>
                    <p className="text-[0.67rem] flex-1 truncate" style={{ color: tx }}>{loc.country}</p>
                    <p className="text-[0.67rem] font-bold tabular-nums flex-shrink-0" style={{ color: tx }}>{fmt(loc.users)}</p>
                  </div>
                ))
            }
          </div>
        </div>

      </div>

      {/* Page views total */}
      {!loading && ov && (
        <div className="flex items-center justify-between rounded-2xl px-5 py-4"
          style={{ background: bg, border: `1px solid ${bd}` }}>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: mu }}>Total Page Views</p>
            <p className="text-[1.5rem] font-bold tabular-nums leading-none" style={{ color: tx }}>{fmt(ov.pageViews)}</p>
            <p className="text-[0.62rem] mt-0.5" style={{ color: mu }}>last 30 days</p>
          </div>
          <Zap size={28} strokeWidth={1} color={dm ? '#3a3a48' : '#E1E1E8'} />
        </div>
      )}

      {/* Open GA4 */}
      <a href={`${GA}/reports/intelligenthome`} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all active:scale-[0.98]"
        style={{
          background:    'linear-gradient(135deg, #1a1014 0%, #2a1820 100%)',
          border:        '1px solid rgba(212,160,176,0.2)',
          boxShadow:     '0 4px 24px rgba(212,160,176,0.06)',
          textDecoration: 'none',
        }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.15)', border: '1px solid rgba(212,160,176,0.2)' }}>
            <BarChart2 size={15} color="#D4A0B0" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[0.75rem] font-semibold text-white/80">Open Full Dashboard</p>
            <p className="text-[0.6rem] text-white/35 mt-0.5">Google Analytics 4</p>
          </div>
        </div>
        <ExternalLink size={13} color="rgba(212,160,176,0.5)" strokeWidth={1.5} />
      </a>

      {/* Tracking badge */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: sb, border: `1px solid ${bd}` }}>
        <div>
          <p className="text-[0.57rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: mu }}>
            Measurement ID
          </p>
          <p className="text-[0.82rem] font-mono font-medium" style={{ color: dm ? '#D4A0B0' : '#8A4A63' }}>
            G-HE25CGQHH4
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[0.6rem] font-semibold text-blue-500 tracking-[0.08em] uppercase">Tracking Active</span>
        </div>
      </div>

    </div>
  );
}
