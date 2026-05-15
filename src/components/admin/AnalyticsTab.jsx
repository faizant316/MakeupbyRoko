const GA_ID = 'G-HE25CGQHH4';
const GA_PROPERTY_URL = `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/reportinghub`;

const CARDS = [
  {
    icon: '👥',
    label: 'Visitors',
    desc: 'How many people came to your site',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/explorer?params=_r.explorerCard..selmet%3D%5B%22activeUsers%22%5D`,
  },
  {
    icon: '📍',
    label: 'Where They\'re From',
    desc: 'Cities & states visiting your site',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/explorer?params=_r.explorerCard..selDim%3D%5B%22city%22%5D`,
  },
  {
    icon: '📱',
    label: 'Devices',
    desc: 'iPhone vs desktop breakdown',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/explorer?params=_r.explorerCard..selDim%3D%5B%22deviceCategory%22%5D`,
  },
  {
    icon: '🔗',
    label: 'Traffic Sources',
    desc: 'Instagram, Google, TikTok, direct',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/acquisition-traffic-acquisition`,
  },
  {
    icon: '⏱️',
    label: 'Time on Site',
    desc: 'How long people stay & engage',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/engagement-overview`,
  },
  {
    icon: '🔄',
    label: 'New vs Returning',
    desc: 'Are past clients coming back?',
    link: `https://analytics.google.com/analytics/web/#/p${GA_ID.replace('G-', '')}/reports/retention-overview`,
  },
];

export default function AnalyticsTab({ darkMode: dm }) {
  const cardBg = dm ? '#26262e' : '#fff';
  const cardBorder = dm ? '#3a3a48' : '#ede8e3';
  const textMain = dm ? '#e4e4e7' : '#111';
  const textMuted = dm ? '#71717a' : '#999';
  const sectionBg = dm ? '#1e1e24' : '#FAF8F6';

  return (
    <div className="flex flex-col gap-6">

      {/* Hero CTA — open GA dashboard */}
      <a
        href={`https://analytics.google.com`}
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
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.15)', border: '1px solid rgba(212,160,176,0.25)' }}>
            <span className="text-[1.3rem]">📊</span>
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-0.5">Google Analytics</p>
            <p className="text-[0.95rem] font-serif text-white font-light leading-tight">Open Full Dashboard</p>
            <p className="text-[0.68rem] text-white/40 mt-0.5">See all your traffic data in real-time</p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,176,0.6)" strokeWidth="1.5" className="w-5 h-5 flex-shrink-0">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>

      {/* What to look for */}
      <div>
        <p className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: textMuted }}>
          What to Look For
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CARDS.map((card) => (
            <a
              key={card.label}
              href={card.link}
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: dm ? '#2e2e38' : '#FAF8F6' }}>
                <span className="text-[1.1rem]">{card.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.82rem] font-semibold leading-tight mb-0.5" style={{ color: textMain }}>{card.label}</p>
                <p className="text-[0.68rem] leading-snug" style={{ color: textMuted }}>{card.desc}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#3a3a48' : '#ddd'} strokeWidth="1.5"
                className="w-4 h-4 flex-shrink-0 transition-colors group-hover:stroke-[#D4A0B0]">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Beginner tips */}
      <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <p className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase mb-4" style={{ color: textMuted }}>
          💡 Quick Tips for Reading Your Data
        </p>
        <div className="flex flex-col gap-3.5">
          {[
            { emoji: '📈', tip: 'Check "Users" weekly — if it\'s growing, your Instagram is working.' },
            { emoji: '📉', tip: 'High "Bounce Rate" means people leave fast — the homepage might need attention.' },
            { emoji: '🏙️', tip: 'If you see cities outside CA, it could be destination wedding leads.' },
            { emoji: '⏰', tip: 'Most traffic should come in evenings (7–10 PM) when people browse on their phones.' },
            { emoji: '📲', tip: '80%+ of visitors are likely on iPhone — this confirms why mobile design matters.' },
          ].map(({ emoji, tip }) => (
            <div key={tip} className="flex items-start gap-3 text-[0.78rem]" style={{ color: dm ? '#a1a1aa' : '#555' }}>
              <span className="flex-shrink-0 mt-0.5">{emoji}</span>
              <span className="leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Measurement ID badge */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: sectionBg, border: `1px solid ${cardBorder}` }}>
        <div>
          <p className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: textMuted }}>Measurement ID</p>
          <p className="text-[0.82rem] font-mono font-medium" style={{ color: dm ? '#D4A0B0' : '#A0785A' }}>{GA_ID}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[0.6rem] font-semibold text-emerald-500 tracking-[0.08em] uppercase">Active</span>
        </div>
      </div>

    </div>
  );
}