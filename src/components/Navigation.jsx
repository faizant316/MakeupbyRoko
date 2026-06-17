import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/api/apiClient';

export default function Navigation({ onCloseModal }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.auth.me().then(u => { if (u?.role === 'admin') setIsAdmin(true); }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [mobileOpen]);

  const handleNavClick = (href) => {
    setMobileOpen(false);
    if (onCloseModal) onCloseModal();
    // Defer until after the body-scroll-lock cleanup restores scroll position,
    // otherwise that restore overrides the scroll triggered here.
    setTimeout(() => {
      if (href === '#') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'instant' });
      }
    }, 50);
  };

  const goHome = (e) => {
    e.preventDefault();
    router.push('/');
    setMobileOpen(false);
    if (onCloseModal) onCloseModal();
  };

  const navItems = [
    { label: 'Home', href: '#', sub: 'Back to top' },
    { label: 'About', href: '#about', sub: "Roko's story" },
    { label: 'Services', href: '#services-grid', sub: 'Browse offerings' },
    { label: 'Transformations', href: '#before-after', sub: 'Before & after' },
    { label: 'Reviews', href: '#reviews', sub: 'Client love' },
  ];

  return (
    <>
      <nav
        id="nav"
        style={{ zIndex: 9999 }}
        className={`fixed top-0 left-0 right-0 h-[52px] transition-all duration-500 backdrop-blur-[12px] ${
          scrolled
            ? 'bg-[rgba(255,255,255,0.95)] border-b border-[var(--border)]'
            : 'bg-[rgba(12,10,9,0.85)] border-b border-transparent'
        }`}
      >
        <div className="container">
          <div className="h-[52px] flex items-center justify-between gap-8">
            <a href="/" onClick={goHome} className={`nav-logo font-serif text-xl font-normal tracking-[0.15em] flex-shrink-0 uppercase transition-colors duration-500 ${scrolled ? 'text-[var(--text)]' : 'text-[#F5F0EB]'}`}>
              Makeup by Roko
            </a>

            {/* Desktop nav */}
            <ul className="hidden md:flex items-center gap-8">
              {navItems.map(item => (
                <li key={item.label}>
                  <a href={item.href} onClick={(e) => { e.preventDefault(); handleNavClick(item.href); }}
                    className={`text-[0.8125rem] font-normal tracking-[0.05em] transition-colors duration-500 ${scrolled ? 'text-[var(--text-muted)] hover:text-[var(--text)]' : 'text-[rgba(255,255,255,0.5)] hover:text-white'}`}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="hidden md:flex items-center gap-4">
              <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener"
                className={`btn btn-outline transition-colors duration-500 ${scrolled ? 'hover:!border-[#D4A0B0] hover:!text-[#D4A0B0]' : '!border-[rgba(255,255,255,0.15)] !text-[rgba(255,255,255,0.6)] hover:!border-[#D4A0B0] hover:!text-[#D4A0B0]'}`}
                style={{padding:'0.55rem 1.1rem', fontSize:'0.75rem'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'13px',height:'13px'}}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                @makeupbyroko_
              </a>
            </div>

            {/* Hamburger — animated to X */}
            <button
              className="md:hidden relative w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform duration-200 z-[10001]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <span className={`absolute block w-[20px] h-[1.5px] rounded-full transition-all duration-300 ease-in-out ${
                mobileOpen ? 'bg-[#111]' : scrolled ? 'bg-[var(--text)]' : 'bg-white'
              } ${mobileOpen ? 'rotate-45 translate-y-0' : '-translate-y-[5px]'}`} />
              <span className={`absolute block w-[20px] h-[1.5px] rounded-full transition-all duration-300 ease-in-out ${
                mobileOpen ? 'bg-[#111]' : scrolled ? 'bg-[var(--text)]' : 'bg-white'
              } ${mobileOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`} />
              <span className={`absolute block w-[20px] h-[1.5px] rounded-full transition-all duration-300 ease-in-out ${
                mobileOpen ? 'bg-[#111]' : scrolled ? 'bg-[var(--text)]' : 'bg-white'
              } ${mobileOpen ? '-rotate-45 translate-y-0' : 'translate-y-[5px]'}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen mobile menu */}
      <div
        className={`md:hidden fixed inset-0 z-[10000] flex flex-col transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: '#FFFFFF' }}
      >
        {/* Soft glow accents */}
        <div className="absolute top-[-40px] right-[-30px] w-[220px] h-[220px] rounded-full pointer-events-none opacity-[0.35]"
          style={{ background: 'radial-gradient(circle, rgba(212,160,176,0.6), rgba(180,140,200,0.3) 40%, transparent 70%)' }} />
        <div className="absolute bottom-[60px] left-[-40px] w-[200px] h-[200px] rounded-full pointer-events-none opacity-[0.25]"
          style={{ background: 'radial-gradient(circle, rgba(170,190,230,0.5), rgba(200,170,210,0.3) 40%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[-20px] w-[120px] h-[120px] rounded-full pointer-events-none opacity-[0.15]"
          style={{ background: 'radial-gradient(circle, rgba(212,160,176,0.5), transparent 70%)' }} />

        {/* Header bar — brand + close X */}
        <div className="relative z-10 flex items-center justify-between px-5 h-[52px] flex-shrink-0 border-b border-[#F0EBE6]/60">
          <span className="font-serif text-[1.05rem] font-normal tracking-[0.15em] uppercase text-[#111]">
            Makeup by Roko
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0ebe6] active:scale-90 transition-all"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" className="w-[18px] h-[18px]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-8">
          {navItems.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={() => handleNavClick(item.href)}
                className="w-full text-left py-5 group active:scale-[0.98] transition-transform duration-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block font-serif text-[1.65rem] text-[#111] leading-tight group-active:text-[#D4A0B0] transition-colors duration-100">
                      {item.label}
                    </span>
                    <span className="block text-[0.7rem] text-[#bbb] tracking-[0.06em] mt-1 uppercase">
                      {item.sub}
                    </span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"
                    className="w-5 h-5 group-active:stroke-[#D4A0B0] group-active:translate-x-1 transition-all duration-100">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
              {i < navItems.length - 1 && (
                <div className="h-px bg-[#EDE8E3]" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom — Instagram + contact */}
        <div className="relative z-10 flex-shrink-0 border-t border-[#EDE8E3]/60 px-8 py-6">
          <a
            href="https://www.instagram.com/makeupbyroko_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 active:opacity-60 transition-opacity duration-100"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="#D4A0B0" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="#D4A0B0" stroke="none"/>
            </svg>
            <span className="text-[0.82rem] text-[#777] tracking-[0.02em]">@makeupbyroko_</span>
          </a>
          <p className="text-[0.68rem] text-[#ccc] mt-3 tracking-[0.04em]">
            makeupbyroko22@gmail.com
          </p>
          {isAdmin && (
            <button
              onClick={() => { setMobileOpen(false); router.push('/admin'); }}
              className="flex items-center gap-2 mt-4 pt-4 border-t border-[#EDE8E3]/60 w-full active:opacity-60 transition-opacity"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span className="text-[0.82rem] text-[#D4A0B0] tracking-[0.04em] font-medium">Admin Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}