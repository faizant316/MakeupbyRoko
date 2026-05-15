export default function About() {
  return (
    <section id="about" className="section bg-[var(--bg)]">
      <div className="container">
        <div className="grid-2">
          <div className="reveal">
            <div className="aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)]">
              <img
                src="./roqia.jpg"
                alt="Roqia Moshref"
                loading="lazy"
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-600"
                onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=85&auto=format&fit=crop'}
              />
              <div className="absolute bottom-6 left-6 bg-[rgba(255,255,255,0.92)] backdrop-blur-[8px] px-5 py-3 rounded-[var(--radius-lg)] flex items-center gap-2 text-[0.8rem] font-medium text-[var(--text)] shadow-[var(--shadow)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'16px',height:'16px',color:'#E1306C'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                Follow @makeupbyroko_
              </div>
            </div>
          </div>

          <div className="reveal reveal-delay-1">
            <span className="label mb-4 block">About Roqia</span>
            <h2 className="mb-6">Makeup is more than a service —<br/><em>it's a transformation.</em></h2>
            <p className="mb-5 text-[0.9375rem] text-[var(--text-muted)] leading-[1.75]">
              Hi, I'm Roqia Moshref — a professional makeup artist with a deep passion for enhancing natural beauty through precision, technique, and artistry. Whether I'm crafting a breathtaking bridal look, a bold editorial statement, or a polished everyday glow, every face I touch receives my full attention.
            </p>
            <p className="mb-5 text-[0.9375rem] text-[var(--text-muted)] leading-[1.75]">
              My work spans bridal ceremonies, fashion shoots, red carpet events, and personal glam sessions. I believe every client deserves to feel completely themselves — just elevated. Browse my full portfolio on Instagram, where I share every look in detail.
            </p>

            <div className="flex gap-12 mt-10 pt-8 border-t border-[var(--border)] flex-wrap">
              <div>
                <div className="font-serif text-[2.5rem] font-normal text-[var(--text)] leading-none">200+</div>
                <div className="text-[0.65rem] text-[var(--text-light)] letter-spacing-[0.08em] uppercase mt-2">Happy Clients</div>
              </div>
              <div>
                <div className="font-serif text-[2.5rem] font-normal text-[var(--text)] leading-none">5+</div>
                <div className="text-[0.65rem] text-[var(--text-light)] letter-spacing-[0.08em] uppercase mt-2">Years Experience</div>
              </div>
              <div>
                <div className="font-serif text-[2.5rem] font-normal text-[var(--text)] leading-none">100%</div>
                <div className="text-[0.65rem] text-[var(--text-light)] letter-spacing-[0.08em] uppercase mt-2">Satisfaction</div>
              </div>
            </div>

            <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="inline-block mt-8 text-[0.8125rem] font-medium text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors">
              See all my work on Instagram →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}