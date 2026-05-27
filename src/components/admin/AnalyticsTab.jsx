import { Users, MapPin, Smartphone, TrendingUp, Clock, RefreshCw, BarChart2, ExternalLink, ChevronRight } from 'lucide-react';

const GA_ID = 'G-HE25CGQHH4';

const CARDS = [
  {
    Icon: Users,
    label: 'Visitors',
    desc: 'How many people came to your site',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/explorer?params=_r.explorerCard..selmet%3D%5B%22activeUsers%22%5D`,
  },
  {
    Icon: MapPin,
    label: 'Where They\'re From',
    desc: 'Cities & states visiting your site',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/explorer?params=_r.explorerCard..selDim%3D%5B%22city%22%5D`,
  },
  {
    Icon: Smartphone,
    label: 'Devices',
    desc: 'iPhone vs desktop breakdown',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/explorer?params=_r.explorerCard..selDim%3D%5B%22deviceCategory%22%5D`,
  },
  {
    Icon: TrendingUp,
    label: 'Traffic Sources',
    desc: 'Instagram, Google, TikTok, direct',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/acquisition-traffic-acquisition`,
  },
  {
    Icon: Clock,
    label: 'Time on Site',
    desc: 'How long people stay & engage',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/engagement-overview`,
  },
  {
    Icon: RefreshCw,
    label: 'New vs Returning',
    desc: 'Are past clients coming back?',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/retention-overview`,
  },
];

const TIPS = [
  'Check "Users" weekly. If it\'s growing, your Instagram is working.',
  'A high "Bounce Rate" means people leave quickly. The homepage may need attention.',
  'Cities outside CA often signal destination wedding leads.',
  'Most traffic comes in evenings (7-10 PM), when people browse on their phones.',
  '80%+ of visitors are likely on iPhone, which confirms why mobile design matters.',
];

export default function AnalyticsTab({ darkMode: dm }) {
  const cardBg = dm ? '#26262e' : '#fff';
  const cardBorder = dm ? '#3a3a48' : '#ede8e3';
  const textMain = dm ? '#e4e4e7' : '#111';
  const textMuted = dm ? '#71717a' : '#999';
  const sectionBg = dm ? '#1e1e24' : '#FAF8F6';
  const iconBg = dm ? '#2e2e38' : '#FAF8F6';
  const iconColor = dm ? '#C8A0B0' : '#B8889A';

  return (
    <div className="flex flex-col gap-6">

      {/* Hero CTA */}
      <a
        href="https://analytics.google.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-2xl px-5 py-5 transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #1a1014 0%, #2a1820 100%)',
          border: '1px solid rgba(212,160,176,0.2)',
          boxShadow: '0 4px 24px rgba(212,160,176,0.1)',
          textDecoration: 'none',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.15)', border: '1px solid rgba(212,160,176,0.25)' }}
          >
            <BarChart2 size={18} color="#D4A0B0" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-0.5">Google Analytics</p>
            <p className="text-[0.95rem] font-serif text-white font-light leading-tight">Open Full Dashboard</p>
            <p className="text-[0.68rem] text-white/40 mt-0.5">See all your traffic data in real-time</p>
          </div>
        </div>
        <ExternalLink size={15} color="rgba(212,160,176,0.6)" strokeWidth={1.5} />
      </a>

      {/* What to look for */}
      <div>
        <p className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: textMuted }}>
          What to Look For
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CARDS.map(({ Icon, label, desc, link }) => (
            <a
              key={label}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 rounded-2xl px-4 py-4 transition-all active:scale-[0.97] group"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                textDecoration: 'none',
                boxShadow: dm ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: iconBg }}
              >
                <Icon size={16} color={iconColor} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.82rem] font-semibold leading-tight mb-0.5" style={{ color: textMain }}>{label}</p>
                <p className="text-[0.68rem] leading-snug" style={{ color: textMuted }}>{desc}</p>
              </div>
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                className="flex-shrink-0 transition-colors"
                style={{ color: dm ? '#3a3a48' : '#ddd' }}
              />
            </a>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <p className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase mb-4" style={{ color: textMuted }}>
          Quick Tips
        </p>
        <div className="flex flex-col gap-3">
          {TIPS.map((tip) => (
            <div key={tip} className="flex items-start gap-3">
              <span
                className="w-1 h-1 rounded-full mt-[0.42rem] flex-shrink-0"
                style={{ background: '#D4A0B0' }}
              />
              <p className="text-[0.78rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#555' }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Measurement ID */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: sectionBg, border: `1px solid ${cardBorder}` }}
      >
        <div>
          <p className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: textMuted }}>Measurement ID</p>
          <p className="text-[0.82rem] font-mono font-medium" style={{ color: dm ? '#D4A0B0' : '#A0785A' }}>{GA_ID}</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[0.6rem] font-semibold text-emerald-500 tracking-[0.08em] uppercase">Active</span>
        </div>
      </div>

    </div>
  );
}
