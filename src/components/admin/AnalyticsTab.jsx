'use client';
import {
  ExternalLink, Users, Activity, Clock, RefreshCw,
  MapPin, Smartphone, Globe, FileText, MousePointer,
  Zap, BarChart2, ChevronRight,
} from 'lucide-react';

// ─── GA4 deep links (account a394174771 · property p536969013) ───────────────
const GA = 'https://analytics.google.com/analytics/web/#/a394174771p536969013';
const R  = `${GA}/reports`;

// ─── Section data ────────────────────────────────────────────────────────────

const OVERVIEW = [
  {
    icon: Users,     accent: '#3B82F6',
    label: 'Total Visitors',
    desc:  'Everyone who landed on your site',
    sub:   'View users, new users & growth over time',
    link:  `${R}/user-acquisition`,
  },
  {
    icon: Activity,  accent: '#22C55E',
    label: 'Sessions',
    desc:  'Total browsing sessions started',
    sub:   'Same person visiting twice counts twice',
    link:  `${R}/engagement-overview`,
  },
  {
    icon: Clock,     accent: '#F59E0B',
    label: 'Avg Time on Site',
    desc:  'How long people actually stay',
    sub:   'Avg engagement time per session',
    link:  `${R}/engagement-overview`,
  },
  {
    icon: RefreshCw, accent: '#D4A0B0',
    label: 'New vs Returning',
    desc:  'Are past clients coming back?',
    sub:   'Retention & loyalty tracked over 8 weeks',
    link:  `${R}/retention-overview`,
  },
];

const TRAFFIC = [
  {
    dot: '#4285F4', letter: 'G',
    label: 'Organic Search',
    sub:   'Found you through Google',
    tip:   'Best signal your SEO & Google Business profile is working.',
    link:  `${R}/acquisition-traffic-acquisition`,
  },
  {
    dot: '#E1306C', letter: '◈',
    label: 'Social Media',
    sub:   'Instagram, TikTok, Pinterest',
    tip:   'Tracks your content-to-client pipeline from every post.',
    link:  `${R}/acquisition-traffic-acquisition`,
  },
  {
    dot: '#8B5CF6', letter: '↗',
    label: 'Direct',
    sub:   'Typed your URL or used a bookmark',
    tip:   'Usually loyal, repeat, or word-of-mouth clients.',
    link:  `${R}/acquisition-traffic-acquisition`,
  },
  {
    dot: '#10B981', letter: '⋯',
    label: 'Referral Links',
    sub:   'Other websites linking to you',
    tip:   'Vendor sites, wedding directories, or local blogs.',
    link:  `${R}/acquisition-traffic-acquisition`,
  },
];

const AUDIENCE = [
  {
    icon: MapPin,     accent: '#F59E0B',
    label: 'Location',
    desc:  'Cities & states that visit most',
    sub:   'Spot destination wedding leads outside California',
    link:  `${R}/user-demographics-detail`,
  },
  {
    icon: Smartphone, accent: '#3B82F6',
    label: 'Devices',
    desc:  'iPhone vs Android vs Desktop breakdown',
    sub:   'Confirms why mobile design is the priority',
    link:  `${R}/tech-overview`,
  },
  {
    icon: Globe,      accent: '#D4A0B0',
    label: 'Demographics',
    desc:  'Age range & gender of your visitors',
    sub:   'Know exactly who is looking at your work',
    link:  `${R}/user-demographics-overview`,
  },
];

const CONTENT = [
  {
    icon: FileText,     accent: '#22C55E', live: false,
    label: 'Top Pages',
    desc:  'Which pages people view most',
    sub:   'See if Services, Gallery, or Booking ranks highest',
    link:  `${R}/engagement-pages-and-screens`,
  },
  {
    icon: MousePointer, accent: '#8B5CF6', live: false,
    label: 'Events & Clicks',
    desc:  'What visitors do before they book',
    sub:   'Button clicks, form views, booking taps',
    link:  `${R}/engagement-events`,
  },
  {
    icon: Zap,          accent: '#EF4444', live: true,
    label: 'Realtime',
    desc:  "Who's on your site right now",
    sub:   'Active visitors in the last 30 minutes',
    link:  `${GA}/realtime`,
  },
];

const TIPS = [
  { text: "Watch for traffic spikes after you post on Instagram — that's your content-to-client pipeline working.", link: `${R}/acquisition-traffic-acquisition` },
  { text: "80%+ of your visitors are likely on iPhone. Check Devices to confirm mobile is rendering correctly.",    link: `${R}/tech-overview`                  },
  { text: "Cities outside California in Location often signal destination wedding or travel-ready clients.",        link: `${R}/user-demographics-detail`       },
  { text: "High drop-off on a specific page means it needs work. Check Top Pages to see where people leave.",      link: `${R}/engagement-pages-and-screens`   },
  { text: "20%+ returning visitors means your brand is sticky — people remember you and come back.",               link: `${R}/retention-overview`             },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHead({ label, dm }) {
  return (
    <p className="text-[0.57rem] font-semibold tracking-[0.18em] uppercase mb-3"
      style={{ color: dm ? '#52525b' : '#bbb' }}>
      {label}
    </p>
  );
}

function OverviewCard({ icon: Icon, accent, label, desc, sub, link, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#ede8e3';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  return (
    <a href={link} target="_blank" rel="noopener noreferrer"
      className="flex flex-col gap-3 rounded-2xl p-4 transition-all active:scale-[0.97] group"
      style={{ background: bg, border: `1px solid ${bd}`, textDecoration: 'none' }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}18` }}>
          <Icon size={15} color={accent} strokeWidth={1.5} />
        </div>
        <ExternalLink size={11} strokeWidth={1.5} style={{ color: dm ? '#3a3a48' : '#e0d8d4' }} />
      </div>
      <div>
        <p className="text-[0.82rem] font-semibold leading-tight mb-1" style={{ color: tx }}>{label}</p>
        <p className="text-[0.67rem] leading-snug" style={{ color: mu }}>{desc}</p>
      </div>
      <p className="text-[0.6rem] font-medium pt-2.5"
        style={{ color: accent, borderTop: `1px solid ${dm ? '#2e2e38' : '#f5f0ec'}` }}>
        {sub}
      </p>
    </a>
  );
}

function TrafficRow({ dot, letter, label, sub, tip, link, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#ede8e3';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  const di = dm ? '#52525b' : '#c5bdb5';
  return (
    <a href={link} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] group"
      style={{ background: bg, border: `1px solid ${bd}`, textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-[0.82rem]"
        style={{ background: dot }}>
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.78rem] font-semibold leading-tight" style={{ color: tx }}>{label}</p>
        <p className="text-[0.65rem] mt-0.5" style={{ color: mu }}>{sub}</p>
        <p className="text-[0.6rem] mt-1 leading-snug" style={{ color: di }}>{tip}</p>
      </div>
      <ChevronRight size={13} strokeWidth={1.5} className="flex-shrink-0" style={{ color: dm ? '#3a3a48' : '#ddd' }} />
    </a>
  );
}

function AudienceRow({ icon: Icon, accent, label, desc, sub, link, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#ede8e3';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  return (
    <a href={link} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-3.5 rounded-2xl px-4 py-4 transition-all active:scale-[0.98] group"
      style={{ background: bg, border: `1px solid ${bd}`, textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${accent}18` }}>
        <Icon size={15} color={accent} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.78rem] font-semibold leading-tight" style={{ color: tx }}>{label}</p>
        <p className="text-[0.65rem] mt-0.5" style={{ color: mu }}>{desc}</p>
        <p className="text-[0.6rem] mt-1.5 font-medium" style={{ color: accent }}>{sub}</p>
      </div>
      <ChevronRight size={13} strokeWidth={1.5} className="flex-shrink-0 mt-1" style={{ color: dm ? '#3a3a48' : '#ddd' }} />
    </a>
  );
}

function ContentRow({ icon: Icon, accent, label, desc, sub, link, live, dm }) {
  const bg = dm ? '#26262e' : '#fff';
  const bd = dm ? '#3a3a48' : '#ede8e3';
  const tx = dm ? '#e4e4e7' : '#111';
  const mu = dm ? '#71717a' : '#999';
  return (
    <a href={link} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3.5 rounded-2xl px-4 py-4 transition-all active:scale-[0.98] group"
      style={{ background: bg, border: `1px solid ${bd}`, textDecoration: 'none' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18` }}>
        <Icon size={15} color={accent} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[0.78rem] font-semibold leading-tight" style={{ color: tx }}>{label}</p>
          {live && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[0.52rem] font-bold text-red-500 uppercase tracking-[0.1em]">Live</span>
            </span>
          )}
        </div>
        <p className="text-[0.65rem]" style={{ color: mu }}>{desc}</p>
        <p className="text-[0.6rem] mt-1 font-medium" style={{ color: accent }}>{sub}</p>
      </div>
      <ChevronRight size={13} strokeWidth={1.5} className="flex-shrink-0" style={{ color: dm ? '#3a3a48' : '#ddd' }} />
    </a>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AnalyticsTab({ darkMode: dm }) {
  const mu = dm ? '#71717a' : '#999';
  const bd = dm ? '#3a3a48' : '#ede8e3';
  const bg = dm ? '#26262e' : '#fff';
  const sb = dm ? '#1e1e24' : '#FAF8F6';

  return (
    <div className="flex flex-col gap-7">

      {/* ── Hero CTA ──────────────────────────────────────────── */}
      <a
        href={`${R}/intelligenthome`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-2xl px-5 py-5 transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #1a1014 0%, #2a1820 100%)',
          border: '1px solid rgba(212,160,176,0.2)',
          boxShadow: '0 4px 24px rgba(212,160,176,0.08)',
          textDecoration: 'none',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.15)', border: '1px solid rgba(212,160,176,0.25)' }}>
            <BarChart2 size={18} color="#D4A0B0" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-0.5">Google Analytics</p>
            <p className="text-[0.95rem] font-serif text-white font-light leading-tight">Open Full Dashboard</p>
            <p className="text-[0.65rem] text-white/40 mt-0.5">Real-time traffic data · Makeup by Roko</p>
          </div>
        </div>
        <ExternalLink size={15} color="rgba(212,160,176,0.6)" strokeWidth={1.5} />
      </a>

      {/* ── Audience Overview ──────────────────────────────────── */}
      <div>
        <SectionHead label="Audience Overview" dm={dm} />
        <div className="grid grid-cols-2 gap-3">
          {OVERVIEW.map(c => <OverviewCard key={c.label} {...c} dm={dm} />)}
        </div>
      </div>

      {/* ── Traffic Sources ────────────────────────────────────── */}
      <div>
        <SectionHead label="Where Traffic Comes From" dm={dm} />
        <div className="flex flex-col gap-2.5">
          {TRAFFIC.map(c => <TrafficRow key={c.label} {...c} dm={dm} />)}
        </div>
      </div>

      {/* ── Audience Breakdown ────────────────────────────────── */}
      <div>
        <SectionHead label="Audience Breakdown" dm={dm} />
        <div className="flex flex-col gap-2.5">
          {AUDIENCE.map(c => <AudienceRow key={c.label} {...c} dm={dm} />)}
        </div>
      </div>

      {/* ── Content & Behavior ────────────────────────────────── */}
      <div>
        <SectionHead label="Content & Behavior" dm={dm} />
        <div className="flex flex-col gap-2.5">
          {CONTENT.map(c => <ContentRow key={c.label} {...c} dm={dm} />)}
        </div>
      </div>

      {/* ── What to Watch ─────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${bd}` }}>
        <p className="text-[0.57rem] font-semibold tracking-[0.16em] uppercase mb-4" style={{ color: mu }}>
          What to Watch
        </p>
        <div className="flex flex-col gap-3.5">
          {TIPS.map(({ text, link }) => (
            <a key={text} href={link} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 group" style={{ textDecoration: 'none' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-[0.42rem] flex-shrink-0" style={{ background: '#D4A0B0' }} />
              <p className="text-[0.75rem] leading-relaxed group-hover:opacity-70 transition-opacity"
                style={{ color: dm ? '#a1a1aa' : '#555' }}>{text}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ── GA ID badge ───────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: sb, border: `1px solid ${bd}` }}>
        <div>
          <p className="text-[0.57rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: mu }}>
            Measurement ID
          </p>
          <p className="text-[0.82rem] font-mono font-medium" style={{ color: dm ? '#D4A0B0' : '#A0785A' }}>
            G-HE25CGQHH4
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[0.6rem] font-semibold text-emerald-500 tracking-[0.08em] uppercase">Tracking Active</span>
        </div>
      </div>

    </div>
  );
}
