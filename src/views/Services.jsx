'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scrollToTarget } from '@/lib/lenis';
import { isScrollLocked } from '@/lib/useScrollLock';

import Navigation from '../components/Navigation';
import BookingModal from '../components/BookingModal';
import ServicesHero from '../components/ServicesHero';
import ServicesFooter from '../components/ServicesFooter';
import BeforeAfterGallery from '../components/BeforeAfterGallery';
import Testimonials from '../components/Testimonials';
import FAQSection from '../components/FAQSection';
import BridalCard from '../components/BridalCard';
import NonBridalCard from '../components/NonBridalCard';
import BridalComparison from '../components/BridalComparison';
import About from '../components/About';
import MakeupClassModal from '../components/MakeupClassModal';
import CoursesFeature from '../components/CoursesFeature';
import ServiceDetailModal from '../components/ServiceDetailModal';

// Drive the hero's scale/opacity straight from scroll into two CSS variables on
// the hero element, batched through requestAnimationFrame. This deliberately
// avoids React state: the old version called setState on every scroll tick,
// which re-rendered the ENTIRE services page (every card, the whole grid) on
// each frame — the single biggest cause of heavy scrolling on a laptop. Writing
// a CSS var touches one element and never re-renders React.
function useHeroParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let hidden = null;
    const apply = () => {
      raf = 0;
      // Frozen while an overlay has the body pinned: the document really is at
      // scroll 0 then, and recomputing from that would fade the hero back in
      // behind the sheet (and un-hide it, restarting the video). See
      // isScrollLocked in useScrollLock.
      if (isScrollLocked()) return;
      const y = window.scrollY;
      const p = Math.min(1, Math.max(0, y / window.innerHeight));
      el.style.setProperty('--hero-scale', (1 - p * 0.06).toFixed(4));
      el.style.setProperty('--hero-opacity', (1 - p * 0.6).toFixed(4));

      // Past a full viewport the white content panel covers the hero edge to
      // edge, so it is a full-screen composited layer (with a playing video in
      // it) that nobody can see. Taking it out of the paint tree entirely gives
      // the rest of the page back its frame budget for the whole scroll down.
      const out = y > window.innerHeight + 8;
      if (out !== hidden) {
        hidden = out;
        el.style.visibility = out ? 'hidden' : 'visible';
        window.dispatchEvent(new CustomEvent('roko:heroVisible', { detail: !out }));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply(); // set the initial values before first paint
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

const CATEGORIES = [
  { key: 'all', label: 'All Services', icon: '✦' },
  { key: 'bridal', label: 'Bridal', icon: '💍', hasSubcategories: true },
  { key: 'event', label: 'Non-Bridal Makeup', icon: '✨' },
  { key: 'creative', label: 'Photoshoot Makeup', icon: '📸' },
  { key: 'lessons', label: 'Makeup Courses', icon: '💄' },
];

// Local cover photos that always override whatever is set in the DB.
const PHOTO_OVERRIDES = {
  'Makeup Courses': '/makeup-courses.jpg',
  'Full Day Service': '/full-day-service.jpg',
  'Bridal Trial': '/bridal-trial.jpg',
};

// The DB row for "Makeup Courses" still holds the old copy (Mon-Thu, 50%
// deposit via Zelle, stale prices). Classes are now Wednesdays only and paid in
// full, so override that content here for both the card and its detail modal.
const LESSONS_OVERRIDE = {
  desc: 'Learn from Roko one-on-one, online over Zoom or in person at the Mountain House studio. Every class is private, one client per Wednesday, and you pay in full to reserve your day.',
  price: 'From $310',
  duration: 'Online or in person',
  deposit: '',
  includes: [
    'Beginner Makeup Lesson (3 hours) - from $310',
    'Advanced Makeup Artist Training (full day) - from $1,240',
  ],
  key_features: [],
  what_to_expect: '',
};

function mapService(svc) {
  const mainPhoto = PHOTO_OVERRIDES[svc.title] || svc.photo || '';
  // One cover photo per card — no gallery carousel.
  const photos = [mainPhoto].filter(Boolean);
  const isLessons = svc.category === 'lessons';

  return {
    key: svc.id,
    category: svc.category,
    title: svc.title,
    photo: mainPhoto,
    photos,
    desc: isLessons ? LESSONS_OVERRIDE.desc : (svc.description || ''),
    price: isLessons ? LESSONS_OVERRIDE.price : svc.price,
    duration: isLessons ? LESSONS_OVERRIDE.duration : svc.duration,
    deposit: isLessons ? LESSONS_OVERRIDE.deposit : (svc.deposit || ''),
    includes: isLessons ? LESSONS_OVERRIDE.includes : (svc.includes || []),
    key_features: isLessons ? LESSONS_OVERRIDE.key_features : (svc.key_features || []),
    what_to_expect: isLessons ? LESSONS_OVERRIDE.what_to_expect : (svc.what_to_expect || ''),
    before_after_photos: svc.before_after_photos || [],
  };
}


export default function ServicesPage() {
  const [selectedService, setSelectedService] = useState(null);
  const [detailService, setDetailService] = useState(null);
  const [detailOrigin, setDetailOrigin] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [bridalIdx, setBridalIdx] = useState(0);
  const [otherIdx, setOtherIdx]   = useState(0);
  const bridalScrollRef  = useRef(null);
  const otherScrollRef   = useRef(null);
  const filterScrollRef  = useRef(null);
  // Edge state for the category filter strip, so we can show "more to scroll" cues.
  const [filterEdges, setFilterEdges] = useState({ atStart: true, atEnd: false });

  // Recompute whether the filter strip is scrolled to its start / end.
  const updateFilterEdges = useCallback(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setFilterEdges(prev => (prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }));
  }, []);

  // Track which carousel card is centred so the pagination dots stay in sync.
  const handleCarouselScroll = useCallback((ref, count, setIdx) => {
    const el = ref.current;
    const card = el?.firstElementChild?.firstElementChild;
    if (!card) return;
    const stride = card.offsetWidth + 16; // card width + gap-4 (16px)
    const idx = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / stride)));
    setIdx(idx);
  }, []);

  const { data: serviceEntities = [], isLoading: servicesLoading, isError: servicesError } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => {
      const all = await api.entities.Service.list('sort_order', 50);
      return all.filter(s => s.is_active !== false);
    },
    staleTime: 30000,
    retry: 2,
    onError: () => toast.error('Failed to load services. Please refresh the page.'),
  });

  const SERVICE_DATA = serviceEntities.map(mapService);

  const handleCategorySelect = useCallback((key) => {
    setActiveCategory(key);
  }, []);

  // "View all services" under a filtered list: drop the filter and put them back
  // at the top of the grid, so they don't have to scroll up to the tabs to reset.
  const handleShowAll = useCallback(() => {
    setActiveCategory('all');
    requestAnimationFrame(() => {
      scrollToTarget('#services-grid', { offset: -60 });
    });
  }, []);

  const handleViewDetail = useCallback((svc, e) => {
    setDetailOrigin(e ? { x: e.clientX, y: e.clientY } : null);
    setDetailService(svc);
  }, []);

  // Reset carousel scroll position when category changes
  useEffect(() => {
    if (bridalScrollRef.current) bridalScrollRef.current.scrollLeft = 0;
    if (otherScrollRef.current)  otherScrollRef.current.scrollLeft  = 0;
    setBridalIdx(0);
    setOtherIdx(0);
  }, [activeCategory]);

  // The mobile nav's Services dropdown deep-links into a category: it dispatches
  // this event, and we select that filter and scroll the grid into view.
  useEffect(() => {
    const handler = (e) => {
      const key = e.detail;
      if (!key) return;
      setActiveCategory(key);
      // Go through Lenis (it owns the page scroll) with the fixed-nav offset, so
      // the grid lands just below the bar instead of tucked under it.
      requestAnimationFrame(() => {
        scrollToTarget('#services-grid', { offset: -60 });
      });
    };
    window.addEventListener('roko:selectCategory', handler);
    return () => window.removeEventListener('roko:selectCategory', handler);
  }, []);

  // Keep the filter-strip scroll cues accurate on mount and when the width changes
  useEffect(() => {
    updateFilterEdges();
    window.addEventListener('resize', updateFilterEdges);
    return () => window.removeEventListener('resize', updateFilterEdges);
  }, [updateFilterEdges]);

  // Compute filtered list before any effects that depend on it
  const filtered = activeCategory === 'all'
    ? SERVICE_DATA
    : SERVICE_DATA.filter(s => s.category === activeCategory);

  const BRIDAL_ORDER = ['Luxury Bridal Look', 'Full Day Service', 'Bridal Trial'];
  const sortedBridal = (svcs) => [...svcs].sort((a, b) => {
    const ai = BRIDAL_ORDER.indexOf(a.title);
    const bi = BRIDAL_ORDER.indexOf(b.title);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const bridalServices = sortedBridal(filtered.filter(s => s.category === 'bridal'));
  const otherServices  = filtered.filter(s => s.category !== 'bridal' && s.category !== 'lessons');
  const lessonServices = filtered.filter(s => s.category === 'lessons');
  const nonBridal = [...otherServices, ...lessonServices]; // keep for mobile scroll ref compatibility



  const heroRef = useHeroParallax();

  return (
    <div style={{ background: '#0C0A09' }}>
      <Navigation onCloseModal={() => setSelectedService(null)} />

      {/* Hero — fixed behind everything. Scale/opacity are driven by CSS vars
          that useHeroParallax updates on scroll (no per-frame React render). */}
      <div
        ref={heroRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          transform: 'scale(var(--hero-scale, 1))',
          opacity: 'var(--hero-opacity, 1)',
          transformOrigin: 'center center',
          // No transition on purpose. Both values are already rewritten every
          // frame by useHeroParallax, so a 50ms transition was restarting a
          // fresh animation on top of them on every single scroll tick — two
          // engines driving the same two properties, which is what put the
          // micro-stutter in the first screen of the scroll.
          willChange: 'transform, opacity',
        }}
      >
        <ServicesHero />
      </div>

      {/* Spacer so the page is tall enough for the hero to show first */}
      <div style={{ height: '100vh', position: 'relative', zIndex: 1, pointerEvents: 'none' }} />

      {/* Content panel — slides up over the hero */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.35)',
          minHeight: '100vh',
        }}
      >

      {/* Services Grid — deliberately the FIRST thing in the white panel.
          About used to sit here, which meant a visitor scrolled a full hero plus
          a full About section (roughly 2.2 screens on a phone) before reaching a
          single service. The offer comes first now; her story follows it. */}
      <div id="services-grid" className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-6">

          {/* Section header */}
          <div className="mb-8">

            {/* Label row */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-6 h-px bg-[#D4A0B0]" />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A0B0' }}>Services</span>
            </div>

            {/* Headline + tagline + filter — stacked */}
            <div style={{ borderBottom: '1px solid #f0ebe6', paddingBottom: '1.5rem' }}>
              <h2 className="font-serif" style={{ fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)', fontWeight: 300, color: '#111', lineHeight: 1.0, letterSpacing: '-0.015em', marginBottom: '0.65rem' }}>
                What I <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Offer</em>
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: '#7a7068', lineHeight: 1.75, maxWidth: '400px', margin: '0 0 1.25rem' }}>
                Each service is tailored to you, from everyday glam to your wedding day. Limited bookings taken each month.
              </p>

              {/* Filter — editorial underline tabs (scrollable on mobile).
                  Sleek static chevrons fade in at whichever edge has more to scroll:
                  a back-arrow once scrolled, a forward-arrow while there's more ahead. */}
              <div className="relative">
                <div
                  ref={filterScrollRef}
                  onScroll={updateFilterEdges}
                  className="flex items-center gap-7 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {CATEGORIES.map(cat => {
                    const active = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => handleCategorySelect(cat.key)}
                        className="text-[0.66rem] lg:text-[0.8rem]"
                        style={{
                          background: 'none',
                          border: 'none',
                          borderBottom: active ? '1px solid #111' : '1px solid transparent',
                          padding: '10px 0 6px 0',
                          fontFamily: 'var(--font-sans)',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: active ? '#111' : '#b3b3b3',
                          fontWeight: active ? 500 : 400,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'color 0.2s, border-color 0.2s',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'flex-end',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#888'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#b3b3b3'; }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Left cue — fades in once scrolled, points back */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-start transition-opacity duration-300 lg:hidden"
                  style={{ width: '50px', background: 'linear-gradient(to right, #fff 32%, rgba(255,255,255,0))', opacity: filterEdges.atStart ? 0 : 1 }}
                >
                  <span className="flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: 'rgba(80,86,96,0.06)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </span>
                </div>

                {/* Right cue — fades in while there's more, points forward */}
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end transition-opacity duration-300 lg:hidden"
                  style={{ width: '50px', background: 'linear-gradient(to left, #fff 32%, rgba(255,255,255,0))', opacity: filterEdges.atEnd ? 0 : 1 }}
                >
                  <span className="flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: 'rgba(80,86,96,0.06)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Loading state.
              Built to the real layout (section label, then a 3-up card grid on
              desktop and a single card on mobile where the carousel shows one at
              a time) so the services land where the placeholders were instead of
              shoving the page down. The sweep and the per-card stagger live in
              .skel / .skel-2 / .skel-3 in index.css. */}
          {servicesLoading && (
            <div role="status" aria-label="Loading services" className="flex flex-col gap-8">
              {[0, 1].map(section => (
                <div key={section} className="flex flex-col gap-4">
                  {/* Mirrors the "Bridal Services" / "Non-Bridal" label row */}
                  <div className="flex items-center gap-3">
                    <div className="w-[3px] h-[14px] rounded-full flex-shrink-0" style={{ background: 'rgba(212,160,176,0.4)' }} />
                    <div className="skel h-[9px] w-[110px] rounded-full" />
                    <span className="flex-1 h-px bg-gradient-to-r from-[#D4A0B0]/15 to-transparent" />
                  </div>

                  <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
                    {[0, 1, 2].map(i => {
                      const lag = i === 1 ? 'skel-2' : i === 2 ? 'skel-3' : '';
                      return (
                        <div
                          key={i}
                          className={`rounded-2xl border border-[#F0E8E3] bg-white overflow-hidden ${i > 0 ? 'hidden lg:block' : ''}`}
                        >
                          <div className={`skel ${lag} aspect-[4/3] w-full`} />
                          <div className="p-4 flex flex-col gap-2.5">
                            <div className={`skel ${lag} h-[13px] w-3/4 rounded-full`} />
                            <div className={`skel ${lag} h-[9px] w-1/2 rounded-full`} />
                            <div className={`skel ${lag} h-[11px] w-[64px] rounded-full mt-1`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {servicesError && !servicesLoading && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-[0.85rem] text-gray-500 mb-3">Couldn't load services right now.</p>
              <button onClick={() => window.location.reload()} className="text-[0.78rem] text-[#D4A0B0] underline underline-offset-2">Try again</button>
            </div>
          )}

          {/* Empty state */}
          {!servicesLoading && !servicesError && serviceEntities.length === 0 && (
            <div className="text-center py-16">
              <p className="font-serif text-[1.2rem] text-gray-400">Services coming soon</p>
              <p className="text-[0.78rem] text-gray-300 mt-2">Check back shortly ✦</p>
            </div>
          )}

          {/* Filtered results — re-keyed on the active category so every tab
              switch replays a quick sweep + rise-in, confirming the tap landed
              even when the top of the list looks the same as before. */}
          {!servicesLoading && !servicesError && serviceEntities.length > 0 && (
          <div key={activeCategory} className="services-switch-in relative flex flex-col gap-6">
            {/* Sweep bar — thin accent line runs across, just under the tabs */}
            <span aria-hidden className="pointer-events-none absolute left-0 right-0 -top-3 h-[2px] overflow-hidden">
              <span
                className="block h-full w-1/3 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #D4A0B0 50%, transparent)', animation: 'svcSweep 0.6s var(--ease)' }}
              />
            </span>

          {/* Bridal — featured cards side by side */}
          {bridalServices.length > 0 && (
            <div className="flex flex-col gap-4">
              {/* Section label */}
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-[14px] rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase text-[#D4A0B0]">Bridal Services</span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#D4A0B0]/25 to-transparent" />
              </div>

              {/* Mobile: horizontal snap scroll — Desktop: grid */}
              <div className="hidden lg:grid gap-5" style={{ gridTemplateColumns: bridalServices.length >= 3 ? 'repeat(3, 1fr)' : bridalServices.length === 2 ? 'repeat(2, 1fr)' : '1fr' }}>
                {bridalServices.map((svc, idx) => (
                  <BridalCard key={svc.key} svc={svc} idx={idx} onSelect={setSelectedService} onViewDetail={handleViewDetail} />
                ))}
              </div>

              {/* Mobile: native CSS scroll-snap — runs on compositor, true 120fps */}
              <div className="lg:hidden">
                <div
                  ref={bridalScrollRef}
                  onScroll={() => handleCarouselScroll(bridalScrollRef, bridalServices.length, setBridalIdx)}
                  className="-mx-[clamp(1.25rem,5vw,3rem)] [&::-webkit-scrollbar]:hidden"
                  style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollPaddingLeft: 'clamp(1.25rem,5vw,3rem)',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  <div
                    className="flex gap-4 pb-4"
                    style={{
                      paddingLeft: 'clamp(1.25rem,5vw,3rem)',
                      paddingRight: 'clamp(1.25rem,5vw,3rem)',
                    }}
                  >
                    {bridalServices.map((svc, idx) => (
                      <div key={svc.key} className="flex-shrink-0 w-[82vw] max-w-[340px]" style={{ scrollSnapAlign: 'start' }}>
                        <BridalCard svc={svc} idx={idx} onSelect={setSelectedService} onViewDetail={handleViewDetail} />
                      </div>
                    ))}
                    {/* Trailing space so the last card can snap fully to the left
                        edge instead of getting stuck pushed off the right. */}
                    <div
                      className="flex-shrink-0"
                      style={{ width: 'max(1rem, calc(100vw - min(82vw, 340px) - 2 * clamp(1.25rem,5vw,3rem)))' }}
                    />
                  </div>
                </div>
                {/* Pagination dots — one per card, active card highlighted */}
                {bridalServices.length > 1 && (
                  <div className="flex justify-center items-center gap-1.5 mt-3">
                    {bridalServices.map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === bridalIdx ? 18 : 6,
                          background: i === bridalIdx ? '#D4A0B0' : 'rgba(212,160,176,0.35)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Comparison toggle — below all bridal cards */}
              {bridalServices.length >= 2 && (
                <BridalComparison bridalServices={bridalServices} onSelect={setSelectedService} />
              )}
            </div>
          )}

          {/* Other services (non-bridal, non-lessons) */}
          {otherServices.length > 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-[14px] rounded-full bg-[#555] flex-shrink-0" />
                <span className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase text-[#555]">Other Services</span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#bbb]/40 to-transparent" />
              </div>

              {/* Desktop: vertical stacked cards */}
              <div className="hidden sm:flex flex-col gap-4">
                {otherServices.map((svc) => (
                  <NonBridalCard key={svc.key} svc={svc} onSelect={setSelectedService} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={handleViewDetail} />
                ))}
              </div>

              {/* Mobile scroll-snap */}
              <div className="sm:hidden">
                <div
                  ref={otherScrollRef}
                  onScroll={() => handleCarouselScroll(otherScrollRef, otherServices.length, setOtherIdx)}
                  className="-mx-[clamp(1.25rem,5vw,3rem)] [&::-webkit-scrollbar]:hidden"
                  style={{
                    overflowX: 'auto', overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollPaddingLeft: 'clamp(1.25rem,5vw,3rem)',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none', msOverflowStyle: 'none',
                  }}
                >
                  <div className="flex items-stretch gap-4 pb-4"
                    style={{ paddingLeft: 'clamp(1.25rem,5vw,3rem)', paddingRight: 'clamp(1.25rem,5vw,3rem)' }}>
                    {otherServices.map((svc) => (
                      <div key={svc.key} className="flex-shrink-0 w-[82vw] max-w-[320px] self-stretch" style={{ scrollSnapAlign: 'start' }}>
                        <NonBridalCard svc={svc} onSelect={setSelectedService} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={handleViewDetail} />
                      </div>
                    ))}
                    <div className="flex-shrink-0 w-4" />
                  </div>
                </div>
                {/* Pagination dots — one per card, active card highlighted */}
                {otherServices.length > 1 && (
                  <div className="flex justify-center items-center gap-1.5 mt-3">
                    {otherServices.map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === otherIdx ? 18 : 6,
                          background: i === otherIdx ? '#D4A0B0' : 'rgba(212,160,176,0.35)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Courses — own featured section, emphasized as a big part of Roko's work */}
          {lessonServices.length > 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-[14px] rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase text-[#111]">Learn With Roko</span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#D4A0B0]/25 to-transparent" />
              </div>
              <div className="flex flex-col gap-4">
                {lessonServices.map((svc) => (
                  <CoursesFeature key={svc.key} svc={svc} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={handleViewDetail} />
                ))}
              </div>
            </div>
          )}

          {/* Reset the filter from the bottom of a single category, instead of
              making them scroll all the way back up to the tabs. */}
          {activeCategory !== 'all' && (
            <div className="flex justify-start pt-1">
              <button
                onClick={handleShowAll}
                className="inline-flex items-center transition-colors duration-200 touch-manipulation"
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '10px 0',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                  color: '#D4A0B0',
                  textDecoration: 'underline',
                  textUnderlineOffset: '6px',
                  textDecorationThickness: '1px',
                  textDecorationColor: 'rgba(212,160,176,0.6)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#b8778c'; e.currentTarget.style.textDecorationColor = '#b8778c'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#D4A0B0'; e.currentTarget.style.textDecorationColor = 'rgba(212,160,176,0.6)'; }}
              >
                View all services
              </button>
            </div>
          )}
          </div>
          )}

        </div>
      </div>

      {/* About — who is Roqia. Sits after the services so her story supports the
          "which one do I pick" moment instead of standing between the visitor
          and the offer. */}
      <About />

      {/* Before & After */}
      <BeforeAfterGallery />

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQSection />

      {/* Footer */}
      <ServicesFooter />

      </div>{/* end content panel */}

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}

      {/* Service Detail Modal — tap card body to preview full description */}
      {detailService && (
        <ServiceDetailModal
          svc={detailService}
          originPoint={detailOrigin}
          onClose={() => { setDetailService(null); setDetailOrigin(null); }}
          onBook={(svc) => { setDetailService(null); setDetailOrigin(null); setSelectedService(svc); }}
          onOpenClassModal={() => { setDetailService(null); setDetailOrigin(null); setShowClassModal(true); }}
        />
      )}

      {/* Makeup Class Registration Modal */}
      {showClassModal && (
        <MakeupClassModal onClose={() => setShowClassModal(false)} />
      )}
    </div>
  );
}