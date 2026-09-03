import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/api/apiClient';
import { lenisStop, lenisStart, lenisResize, lenisScrollTo, scrollToTarget } from '@/lib/lenis';
import { freezeScrollEffects, unfreezeScrollEffects, isScrollLocked } from '@/lib/useScrollLock';

// Height of the fixed nav bar plus a little breathing room, so a section never
// lands tucked underneath it after a jump.
const NAV_H = 60;

export default function Navigation({ onCloseModal }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  // Scroll position captured when the mobile menu opened, and where to land once
  // its scroll-lock releases: a section selector on a nav tap, 0 for Home, or
  // null to simply restore the saved position on a plain close.
  const savedScrollRef = useRef(0);
  const restoreRef = useRef(null);

  useEffect(() => {
    api.auth.me().then(u => { if (u?.role === 'admin') setIsAdmin(true); }).catch(() => {});
  }, []);

  // THE BLACK FLASH.
  //
  // This bar has two looks: white once you've scrolled, near-black
  // (rgba(12,10,9,0.85)) while it's sitting over the hero. Every overlay on the
  // site — this menu, a service card, a booking sheet — pins the body with
  // position:fixed, and a pinned body genuinely reports window.scrollY as 0. So
  // opening any of them flipped this bar back to its over-hero black, behind the
  // overlay where you couldn't see it. Then the overlay faded out, the black bar
  // was revealed at the top of the page, and the restore flipped it back to white
  // through a 500ms transition. That slow dark smear on the way out of a service
  // card (and out of this menu) was never the hero at all — it was this bar
  // playing its hero state and easing back out of it.
  //
  // While the page is pinned the answer to "have we scrolled" is simply "the same
  // as before it was pinned", so hold the last real value.
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollLocked()) return;
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Collapse the Services dropdown whenever the whole menu closes.
  useEffect(() => { if (!mobileOpen) setServicesOpen(false); }, [mobileOpen]);

  // Body-scroll lock for the full-screen mobile menu.
  //
  // Lenis owns the page scroll, so we MUST stop it while the body is pinned and
  // hand the position back THROUGH Lenis on release — otherwise its RAF loop
  // fights the unlock and snaps to the top (the old "hero flashes behind the
  // menu, then the section appears" bug). useLayoutEffect so the release + the
  // re-scroll both run before the browser paints the closing frame: the overlay
  // fades out with the target section already in place, never the hero.
  useLayoutEffect(() => {
    if (!mobileOpen) return;
    const y = window.scrollY;
    savedScrollRef.current = y;
    restoreRef.current = null;
    lenisStop();
    // Freeze scroll-driven effects for as long as the body is pinned. The
    // document reads as scroll 0 while it is, so without this the hero's
    // parallax would fade itself back in (and restart its video) behind the
    // menu, then have to undo it all on close.
    freezeScrollEffects();
    const b = document.body.style;
    b.position = 'fixed';
    b.top = `-${y}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
    b.overflow = 'hidden';
    return () => {
      b.position = '';
      b.top = '';
      b.left = '';
      b.right = '';
      b.width = '';
      b.overflow = '';
      lenisStart();
      lenisResize(); // body is back in flow — let Lenis re-measure before the jump

      // Destination: the nav target when navigating, else the saved position.
      const r = restoreRef.current;
      restoreRef.current = null;
      let dest = savedScrollRef.current;
      if (r !== null) {
        if (r === 0) {
          dest = 0;
        } else {
          const el = document.querySelector(r);
          // The body is un-pinned now (window is at 0), so rect.top is absolute.
          if (el) dest = Math.max(0, Math.round(el.getBoundingClientRect().top - NAV_H));
        }
      }

      // Set the native scroll instantly (pre-paint) AND sync Lenis to the same
      // spot so its next frame doesn't animate away from it.
      const html = document.documentElement;
      const prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, dest);
      lenisScrollTo(dest, { immediate: true });
      // Only now: the page is back where it belongs, so the next scroll event
      // that reaches the hero reports the real position, not 0.
      unfreezeScrollEffects();
      requestAnimationFrame(() => { html.style.scrollBehavior = prevBehavior; });
    };
  }, [mobileOpen]);

  // Browser back / forward. Every nav tap pushes the section into history as a
  // hash entry, so popstate just scrolls to whatever the hash now points at (or
  // the top when there's none). This is what makes the phone's back/forward
  // arrows actually move through the page instead of doing nothing.
  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash;
      const hasTarget = hash && hash !== '#' && document.querySelector(hash);
      scrollToTarget(hasTarget ? hash : 0, { offset: -NAV_H });
    };
    window.addEventListener('popstate', onPop);
    // Honor a deep link (e.g. /#reviews) once the page has mounted.
    let t;
    const hash = window.location.hash;
    if (hash && hash !== '#') {
      t = setTimeout(() => {
        if (document.querySelector(hash)) scrollToTarget(hash, { immediate: true, offset: -NAV_H });
      }, 140);
    }
    return () => { window.removeEventListener('popstate', onPop); if (t) clearTimeout(t); };
  }, []);

  // Push the section into history so back/forward can walk between them. We reuse
  // the current history.state (rather than null) so Next.js's router internals
  // stay intact on these entries — otherwise landing back on one can trigger a
  // full page reload.
  const pushHash = (href) => {
    try {
      const url = (href === '#' || !href) ? (window.location.pathname + window.location.search) : href;
      if (window.location.hash === href || (href === '#' && !window.location.hash)) return; // already here
      window.history.pushState(window.history.state, '', url);
    } catch { /* history unavailable — ignore */ }
  };

  const handleNavClick = (href) => {
    if (onCloseModal) onCloseModal();
    pushHash(href);
    const target = href === '#' ? 0 : href;
    if (mobileOpen) {
      // Hand the destination to the scroll-lock cleanup, which runs pre-paint
      // under the still-opaque overlay, then close the menu.
      restoreRef.current = target;
      setMobileOpen(false);
    } else {
      scrollToTarget(target, { offset: -NAV_H });
    }
  };

  const goHome = (e) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      handleNavClick('#');
    } else {
      if (onCloseModal) onCloseModal();
      setMobileOpen(false);
      router.push('/');
    }
  };

  // Same order the page itself is in: the services grid is the first thing in
  // the white panel and About follows it (moved there in the mobile conversion
  // pass). The nav had never been updated to match, so it listed About first and
  // read as a different running order than the one you actually scroll through.
  const navItems = [
    { label: 'Home', href: '#', sub: 'Back to top' },
    { label: 'Services', href: '#services-grid', sub: 'Browse offerings' },
    { label: 'About', href: '#about', sub: "Roko's story" },
    { label: 'Transformations', href: '#before-after', sub: 'Before & after' },
    { label: 'Reviews', href: '#reviews', sub: 'Client love' },
  ];

  // Sub-items for the mobile "Services" dropdown. Keys match the category
  // filter in the services grid (src/views/Services.jsx).
  const serviceCats = [
    { key: 'all', label: 'All Services' },
    { key: 'bridal', label: 'Bridal' },
    { key: 'event', label: 'Non-Bridal Makeup' },
    { key: 'creative', label: 'Photoshoot Makeup' },
    { key: 'lessons', label: 'Makeup Courses' },
  ];

  // Pick a category from the mobile dropdown: tell the services grid to filter,
  // then reuse the normal nav jump (closes the menu + scrolls to the grid).
  const handleCategory = (key) => {
    window.dispatchEvent(new CustomEvent('roko:selectCategory', { detail: key }));
    handleNavClick('#services-grid');
  };


  return (
    <>
      <nav
        id="nav"
        style={{ zIndex: 9999 }}
        // The 12px backdrop blur is DESKTOP ONLY. This bar is fixed and always on
        // screen, so on a phone the browser was re-sampling and re-blurring a
        // full-width strip on every single scroll frame — to produce an effect
        // hidden behind a 95%-opaque background. Pure cost, no visible result.
        className={`fixed top-0 left-0 right-0 h-[52px] transition-all duration-500 md:backdrop-blur-[12px] ${
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
              className="md:hidden relative w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform duration-200 z-[10001] before:absolute before:content-[''] before:-inset-1.5"
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
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0ebe6] active:scale-90 transition-all before:absolute before:content-[''] before:-inset-1"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" className="w-[18px] h-[18px]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-8 overflow-y-auto">
          {navItems.map((item, i) => {
            const isServices = item.label === 'Services';
            return (
              <div key={item.label}>
                <button
                  onClick={() => isServices ? setServicesOpen(o => !o) : handleNavClick(item.href)}
                  className="w-full text-left py-5 group active:scale-[0.98] transition-transform duration-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className="block font-serif text-[1.65rem] leading-tight transition-colors duration-150"
                        style={{ color: isServices && servicesOpen ? '#D4A0B0' : '#111' }}
                      >
                        {item.label}
                      </span>
                      <span className="block text-[0.7rem] text-[#bbb] tracking-[0.06em] mt-1 uppercase">
                        {isServices ? (servicesOpen ? 'Choose a category' : item.sub) : item.sub}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"
                      stroke={isServices && servicesOpen ? '#D4A0B0' : '#ccc'}
                      className={`w-5 h-5 transition-all duration-300 group-active:stroke-[#D4A0B0] ${
                        isServices ? (servicesOpen ? 'rotate-90' : '') : 'group-active:translate-x-1'
                      }`}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </button>

                {/* Services dropdown — categories slide open */}
                {isServices && (
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{ maxHeight: servicesOpen ? `${serviceCats.length * 52 + 8}px` : '0px', opacity: servicesOpen ? 1 : 0 }}
                  >
                    <div className="pb-3 pl-1 flex flex-col">
                      {serviceCats.map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => handleCategory(cat.key)}
                          className="w-full text-left py-3 flex items-center gap-3 active:opacity-60 transition-opacity duration-100"
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#D4A0B0' }} />
                          <span className="text-[0.98rem] text-[#444] tracking-[0.01em]">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {i < navItems.length - 1 && (
                  <div className="h-px bg-[#EDE8E3]" />
                )}
              </div>
            );
          })}
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
            roko@makeupbyroko.org
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