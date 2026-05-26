export default function About() {
  return (
    <section className="border-b border-[#f0ebe6] px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Photo */}
          <div className="relative">
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#f5f0eb]">
              <img
                src="/roqia.jpg"
                alt="Roqia Moshref"
                loading="lazy"
                className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=85&auto=format&fit=crop';
                }}
              />
            </div>
            {/* Instagram floating badge */}
            <a
              href="https://www.instagram.com/makeupbyroko_/"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-5 left-5 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.14)] transition-shadow no-underline"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="#D4A0B0" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="#D4A0B0" stroke="none"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#555', letterSpacing: '0.02em' }}>
                @makeupbyroko_
              </span>
            </a>
          </div>

          {/* Content */}
          <div>
            {/* Label */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-6 h-px bg-[#D4A0B0]" />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A0B0' }}>
                About Roqia
              </span>
            </div>

            <h2
              className="font-serif"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', fontWeight: 300, color: '#111', lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: '1.25rem' }}
            >
              Makeup is more than a service —{' '}
              <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>it's a transformation.</em>
            </h2>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#888', lineHeight: 1.85, marginBottom: '1rem' }}>
              Hi, I'm Roqia — a professional makeup artist with 17+ years of experience. Whether I'm crafting a breathtaking bridal look, a bold editorial, or a polished everyday glow, every client gets my full attention and care.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#888', lineHeight: 1.85, marginBottom: '2rem' }}>
              Based in Mountain House, California and available for destination bookings nationwide. I work with a limited number of clients each month to ensure every look is truly bespoke.
            </p>

            {/* Stats */}
            <div className="flex gap-10 pt-6 border-t border-[#f0ebe6] mb-6">
              <div>
                <div className="font-serif" style={{ fontSize: '2.2rem', color: '#111', lineHeight: 1, fontWeight: 300 }}>17+</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginTop: '0.35rem' }}>Years</div>
              </div>
              <div>
                <div className="font-serif" style={{ fontSize: '2.2rem', color: '#111', lineHeight: 1, fontWeight: 300 }}>1000+</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginTop: '0.35rem' }}>Clients</div>
              </div>
            </div>

            {/* Instagram CTA */}
            <a
              href="https://www.instagram.com/makeupbyroko_/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[0.78rem] font-medium text-[#A0785A] hover:text-[#6B4E37] transition-colors no-underline"
            >
              See all my work on Instagram
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
