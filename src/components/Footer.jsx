const SocialIg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width={17} height={17}>
    <rect x="2" y="2" width="20" height="20" rx="5.5"/>
    <circle cx="12" cy="12" r="4.2"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const SocialTt = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={15} height={15}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
  </svg>
);
const SocialPi = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.04-2.83.18-.77 1.22-5.15 1.22-5.15s-.31-.62-.31-1.55c0-1.45.84-2.53 1.88-2.53.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.88 1.54 1.88 1.85 0 3.09-2.37 3.09-5.17 0-2.14-1.44-3.63-3.5-3.63-2.38 0-3.78 1.79-3.78 3.63 0 .72.28 1.49.62 1.91.07.08.08.16.06.24-.06.27-.2.84-.23.96-.04.15-.13.19-.3.11-1.12-.52-1.82-2.17-1.82-3.49 0-2.84 2.06-5.44 5.94-5.44 3.12 0 5.55 2.22 5.55 5.19 0 3.1-1.95 5.59-4.65 5.59-.91 0-1.76-.47-2.05-1.03l-.56 2.08c-.2.78-.74 1.75-1.1 2.34.83.26 1.71.4 2.62.4 5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
  </svg>
);

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#0d0d0d] text-white">
      <div className="max-w-[1200px] mx-auto px-[clamp(1.5rem,5vw,3rem)]">

        {/* Top row: brand + socials */}
        <div className="flex items-end justify-between pt-16 pb-12 border-b border-white/[0.07]">
          <div>
            <p className="font-serif text-[1.7rem] tracking-[0.12em] uppercase text-white leading-none mb-3">
              Roqia Moshref
            </p>
            <p className="text-[0.78rem] text-white/35 tracking-[0.04em]">
              Luxury makeup artistry. DMV area, available nationwide.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener"
              className="text-white/35 hover:text-white transition-colors duration-200">
              <SocialIg />
            </a>
            <a href="https://www.tiktok.com/@makeupbyroko" target="_blank" rel="noopener"
              className="text-white/35 hover:text-white transition-colors duration-200">
              <SocialTt />
            </a>
            <a href="https://www.pinterest.com/makeupbyroko/" target="_blank" rel="noopener"
              className="text-white/35 hover:text-white transition-colors duration-200">
              <SocialPi />
            </a>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 py-12 border-b border-white/[0.07]">
          <div>
            <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-white/25 mb-5">Navigate</p>
            <ul className="flex flex-col gap-3.5">
              {[
                { label: 'About', href: '#about' },
                { label: 'Portfolio', href: '#work' },
                { label: 'Services', href: '#services' },
                { label: 'Book Now', href: '#book' },
                { label: 'FAQ', href: '#faq' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-[0.82rem] text-white/45 hover:text-white transition-colors duration-200 tracking-[0.01em]">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-white/25 mb-5">Contact</p>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener"
                  className="text-[0.82rem] text-white/45 hover:text-white transition-colors duration-200">
                  Instagram DM
                </a>
              </li>
              <li>
                <a href="https://www.tiktok.com/@makeupbyroko" target="_blank" rel="noopener"
                  className="text-[0.82rem] text-white/45 hover:text-white transition-colors duration-200">
                  TikTok
                </a>
              </li>
              <li>
                <a href="mailto:hello@roqiamoshref.com"
                  className="text-[0.82rem] text-white/45 hover:text-white transition-colors duration-200">
                  hello@roqiamoshref.com
                </a>
              </li>
              <li>
                <a href="#book"
                  className="text-[0.82rem] text-white/45 hover:text-white transition-colors duration-200">
                  Request a Quote
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-white/25 mb-5">Studio</p>
            <p className="text-[0.82rem] text-white/45 leading-[1.85]">
              Based in the DMV area.<br />
              Available for destination bookings<br />
              and travel nationwide.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between py-5 flex-wrap gap-3">
          <p className="text-[0.7rem] text-white/20 tracking-[0.02em]">
            © {new Date().getFullYear()} Roqia Moshref. All rights reserved.
          </p>
          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener"
            className="text-[0.7rem] text-white/25 hover:text-white/60 transition-colors duration-200 tracking-[0.04em]">
            @makeupbyroko_
          </a>
        </div>

      </div>
    </footer>
  );
}
