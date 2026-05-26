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
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#888', lineHeight: 1.85 }}>
              Based in Mountain House, California and available for destination bookings nationwide. I work with a limited number of clients each month to ensure every look is truly bespoke.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
