export default function Footer() {
  return (
    <footer id="contact" className="bg-[var(--text)] text-white py-[clamp(3rem,6vw,5rem)]_0_2.5rem">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-[rgba(255,255,255,0.1)] mb-10">
          <div>
            <span className="nav-logo block text-white mb-4 font-serif text-xl font-normal letter-spacing-[0.15em] uppercase">Roqia Moshref</span>
            <p className="text-[0.875rem] text-[rgba(255,255,255,0.5)] leading-[1.7] max-w-[280px]">
              Luxury makeup artistry for brides, editorial, and every occasion worth celebrating. Based in the DMV area, available nationwide.
            </p>
            <div className="flex gap-3 mt-7">
              <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="w-9 h-9 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{width:'16px',height:'16px',color:'rgba(255,255,255,0.6)'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="https://www.tiktok.com/@makeupbyroko" target="_blank" rel="noopener" className="w-9 h-9 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'16px',height:'16px',color:'rgba(255,255,255,0.6)'}}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>
              </a>
              <a href="https://www.pinterest.com/makeupbyroko/" target="_blank" rel="noopener" className="w-9 h-9 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{width:'16px',height:'16px',color:'rgba(255,255,255,0.6)'}}><path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.04-2.83.18-.77 1.22-5.15 1.22-5.15s-.31-.62-.31-1.55c0-1.45.84-2.53 1.88-2.53.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.88 1.54 1.88 1.85 0 3.09-2.37 3.09-5.17 0-2.14-1.44-3.63-3.5-3.63-2.38 0-3.78 1.79-3.78 3.63 0 .72.28 1.49.62 1.91.07.08.08.16.06.24-.06.27-.2.84-.23.96-.04.15-.13.19-.3.11-1.12-.52-1.82-2.17-1.82-3.49 0-2.84 2.06-5.44 5.94-5.44 3.12 0 5.55 2.22 5.55 5.19 0 3.1-1.95 5.59-4.65 5.59-.91 0-1.76-.47-2.05-1.03l-.56 2.08c-.2.78-.74 1.75-1.1 2.34.83.26 1.71.4 2.62.4 5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <p className="text-[0.6875rem] font-medium letter-spacing-[0.12em] text-[rgba(255,255,255,0.35)] uppercase mb-5">Navigate</p>
            <ul className="flex flex-col gap-3">
              <li><a href="#about" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">About</a></li>
              <li><a href="#work" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">Portfolio</a></li>
              <li><a href="#services" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">Services</a></li>
              <li><a href="#book" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">Book Now</a></li>
              <li><a href="#faq" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <p className="text-[0.6875rem] font-medium letter-spacing-[0.12em] text-[rgba(255,255,255,0.35)] uppercase mb-5">Get in Touch</p>
            <ul className="flex flex-col gap-3">
              <li><a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">Instagram DM</a></li>
              <li><a href="https://www.tiktok.com/@makeupbyroko" target="_blank" rel="noopener" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">TikTok</a></li>
              <li><a href="mailto:hello@roqiamoshref.com" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">hello@roqiamoshref.com</a></li>
              <li><a href="#book" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">Request a Quote</a></li>
              <li><a href="#faq" className="text-[0.875rem] text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">Common Questions</a></li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center flex-wrap gap-4">
          <p className="text-[0.8125rem] text-[rgba(255,255,255,0.3)]">© 2025 Roqia Moshref. All rights reserved.</p>
          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-[0.8125rem] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'14px',height:'14px'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            @makeupbyroko_
          </a>
        </div>
      </div>
    </footer>
  );
}