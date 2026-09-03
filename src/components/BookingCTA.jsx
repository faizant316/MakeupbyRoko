import { scrollToTarget } from '@/lib/lenis';

// A booking entry point in the middle of the page.
//
// Everything below the services grid (About, Before & After, Reviews, FAQ) used
// to contain zero booking links, which is roughly six phone screens of the most
// persuasive content on the site with nothing to tap at the end of it. This band
// sits where intent peaks and sends people back to the grid.
//
// Deliberately NOT a sticky bar: that idea was looked at on 2026-07-28 and
// dropped because a permanent floating element fights the decluttering the rest
// of the page is built around. This only appears where it's earned.

const TRUST = [
  ['17+', 'years'],
  ['1000+', 'clients'],
];

export default function BookingCTA({
  eyebrow = 'Ready when you are',
  title = 'Book your',
  emphasis = 'appointment',
  sub = 'Pick your service, choose a date, and Roko confirms your time. A deposit secures the day.',
  category = null,
}) {
  const go = () => {
    if (category) window.dispatchEvent(new CustomEvent('roko:selectCategory', { detail: category }));
    // Through Lenis (it owns the page scroll), offset for the fixed nav.
    requestAnimationFrame(() => scrollToTarget('#services-grid', { offset: -60 }));
  };

  return (
    <section className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(2.5rem,5vw,4rem)]" style={{ background: '#fff' }}>
      <div
        className="max-w-[1280px] mx-auto rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #FBF5F7 0%, #FDFBFC 55%, #F8F4F8 100%)',
          border: '1px solid rgba(212,160,176,0.28)',
        }}
      >
        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-11 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-px bg-[#D4A0B0]" />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A0B0' }}>
                {eyebrow}
              </span>
            </div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 300, color: '#111', lineHeight: 1.08, letterSpacing: '-0.015em', marginBottom: '0.6rem' }}>
              {title} <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>{emphasis}</em>
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: '#7a7068', lineHeight: 1.7, maxWidth: '440px' }}>
              {sub}
            </p>

            {/* Quiet reassurance right next to the ask */}
            <div className="flex items-center gap-5 mt-5">
              {TRUST.map(([n, l]) => (
                <div key={l} className="flex items-baseline gap-1.5">
                  <span className="font-serif text-[1.15rem] text-[#111]" style={{ fontWeight: 300 }}>{n}</span>
                  <span className="text-[0.68rem] uppercase tracking-[0.12em] text-[#b3a9a3]">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={go}
            className="flex-shrink-0 w-full lg:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl bg-[#111] text-white active:scale-[0.98] hover:bg-[#222] transition-all"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            See services
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
