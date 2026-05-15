export default function Hero() {
  return (
    <section id="hero" className="min-h-screen flex flex-col justify-center pt-[var(--nav-h)] pb-[clamp(4rem,8vw,7rem)] relative overflow-hidden bg-[var(--surface)]">
      <div className="absolute inset-0 bg-gradient-radial from-[rgba(232,213,196,0.5)] to-transparent pointer-events-none"></div>

      <div className="container relative z-1 pt-8 pb-[clamp(4rem,8vw,7rem)] grid grid-cols-1 md:grid-cols-[1fr_440px] gap-16 md:gap-16 items-center">
        <div className="flex flex-col">
          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="hero-instagram-badge inline-flex items-center gap-2 px-[0.9rem] py-1 border border-[var(--border)] rounded-full text-[0.75rem] text-[var(--text-muted)] mb-4 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all w-fit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'13px',height:'13px'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            @makeupbyroko_
          </a>

          <div className="flex items-center gap-3 mb-6 reveal">
            <div className="w-[6px] h-[6px] rounded-full bg-[var(--accent)]"></div>
            <span className="label">Luxury Makeup Artistry</span>
          </div>

          <h1 className="reveal reveal-delay-1 text-[clamp(3.5rem,10vw,8.5rem)] font-light italic leading-[0.95] letter-spacing-[-0.02em] text-[var(--text)] mb-8">
            <em>Beauty,</em><br/>
            <strong className="font-normal not-italic">Elevated.</strong>
          </h1>

          <p className="reveal reveal-delay-2 max-w-[480px] text-base text-[var(--text-muted)] leading-[1.7] mb-11">
            Precision, artistry, and intention — for brides, editorial shoots, special occasions, and every moment that deserves to feel extraordinary.
          </p>

          <div className="reveal reveal-delay-3 flex gap-4 flex-wrap items-center">
            <a href="#work" className="btn btn-primary">View My Work</a>
            <a href="#book" className="btn btn-outline">Book an Appointment</a>
          </div>
        </div>

        <div className="reveal reveal-delay-2 flex justify-center items-end md:order-last">
          <div className="relative w-full max-w-[400px]">
            <div className="absolute top-6 right-0 bg-[var(--text)] text-white rounded-full px-[0.875rem] py-1 text-[0.75rem] font-medium letter-spacing-[0.04em] uppercase z-10 whitespace-nowrap">
              ✦ Makeup Artist
            </div>
            <img
              src="./roqia.jpg"
              alt="Roqia Moshref"
              className="w-full h-[580px] object-cover object-top rounded-t-[200px] rounded-b-[12px] shadow-[0_24px_60px_rgba(0,0,0,0.12)]"
              onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=85&auto=format&fit=crop'}
            />
            <div className="absolute bottom-6 -left-6 bg-white rounded-xl p-[0.875rem_1.25rem] shadow-[var(--shadow-lg)] flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0">
                <img src="./roqia.jpg" alt="Roqia" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
              </div>
              <div>
                <div className="text-[0.875rem] font-semibold text-[var(--text)] leading-[1.2]">Roqia Moshref</div>
                <div className="text-[0.75rem] text-[var(--text-light)]">@makeupbyroko_</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-[clamp(1.25rem,5vw,3rem)] flex flex-col items-center gap-2">
        <div className="w-px h-[60px] bg-gradient-to-b from-[var(--border)] to-transparent animate-pulse"></div>
        <span className="text-[0.6875rem] letter-spacing-[0.12em] text-[var(--text-light)] uppercase">Scroll</span>
      </div>
    </section>
  );
}