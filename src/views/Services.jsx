'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

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
import ServiceDetailModal from '../components/ServiceDetailModal';

// Hook to track scroll progress through the hero (0 = top, 1 = hero fully covered)
function useHeroScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const heroH = window.innerHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / heroH));
      setProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

const CATEGORIES = [
  { key: 'all', label: 'All Services', icon: '✦' },
  { key: 'bridal', label: 'Bridal', icon: '💍', hasSubcategories: true },
  { key: 'event', label: 'Non-Bridal Makeup', icon: '✨' },
  { key: 'creative', label: 'Photoshoot Makeup', icon: '📸' },
  { key: 'lessons', label: 'Makeup Courses', icon: '💄' },
];

// Map entity records to the shape the page expects
function mapService(svc) {
  return {
    key: svc.id,
    category: svc.category,
    title: svc.title,
    photo: svc.photo || '',
    desc: svc.description || '',
    price: svc.price,
    duration: svc.duration,
    deposit: svc.deposit || '',
    includes: svc.includes || [],
    key_features: svc.key_features || [],
    what_to_expect: svc.what_to_expect || '',
    before_after_photos: svc.before_after_photos || [],
  };
}


export default function ServicesPage() {
  const [selectedService, setSelectedService] = useState(null);
  const [detailService, setDetailService] = useState(null);
  const [detailOrigin, setDetailOrigin] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const bridalScrollRef  = useRef(null);
  const otherScrollRef   = useRef(null);

  const { data: serviceEntities = [], isLoading: servicesLoading, isError: servicesError } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => {
      const all = await base44.entities.Service.list('sort_order', 50);
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

  const handleViewDetail = useCallback((svc, e) => {
    setDetailOrigin(e ? { x: e.clientX, y: e.clientY } : null);
    setDetailService(svc);
  }, []);

  // Reset carousel scroll position when category changes
  useEffect(() => {
    if (bridalScrollRef.current) bridalScrollRef.current.scrollLeft = 0;
    if (otherScrollRef.current)  otherScrollRef.current.scrollLeft  = 0;
  }, [activeCategory]);

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
  const nonBridal = filtered.filter(s => s.category !== 'bridal');



  const heroProgress = useHeroScrollProgress();

  // Hero scale: shrinks slightly as content covers it
  const heroScale = 1 - heroProgress * 0.06;
  // Hero opacity: fades to 0.4 as fully covered
  const heroOpacity = 1 - heroProgress * 0.6;

  return (
    <div style={{ background: '#0C0A09' }}>
      <Navigation onCloseModal={() => setSelectedService(null)} />

      {/* Hero — fixed behind everything */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          transform: `scale(${heroScale})`,
          opacity: heroOpacity,
          transformOrigin: 'center center',
          transition: 'transform 0.05s linear, opacity 0.05s linear',
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

      {/* About — who is Roqia */}
      <About />

      {/* Services Grid */}
      <div id="services-grid" className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

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

              {/* Filter — editorial underline tabs */}
              <div className="flex items-center gap-7 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => handleCategorySelect(cat.key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: activeCategory === cat.key ? '1px solid #111' : '1px solid transparent',
                      padding: '10px 0 6px 0',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: activeCategory === cat.key ? '#111' : '#bbb',
                      fontWeight: activeCategory === cat.key ? 500 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'color 0.2s, border-color 0.2s',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'flex-end',
                    }}
                    onMouseEnter={e => { if (activeCategory !== cat.key) e.currentTarget.style.color = '#888'; }}
                    onMouseLeave={e => { if (activeCategory !== cat.key) e.currentTarget.style.color = '#bbb'; }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Loading state */}
          {servicesLoading && (
            <div className="flex flex-col gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl animate-pulse" style={{ height: '180px', background: '#f5f0ec' }} />
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

          {/* Bridal — featured cards side by side */}
          {!servicesLoading && bridalServices.length > 0 && (
            <div className="flex flex-col gap-5">
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
              <div
                ref={bridalScrollRef}
                className="lg:hidden -mx-[clamp(1.25rem,5vw,3rem)] [&::-webkit-scrollbar]:hidden"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollSnapType: 'x mandatory',
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
                  <div className="flex-shrink-0 w-4" />
                </div>
                {bridalServices.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3 pb-1">
                    {bridalServices.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]/40" />
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

          {/* Remaining services */}
          {!servicesLoading && nonBridal.length > 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-[14px] rounded-full bg-[#555] flex-shrink-0" />
                <span className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase text-[#555]">Other Services</span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#bbb]/40 to-transparent" />
              </div>

              {/* Desktop: vertical stacked cards */}
              <div className="hidden sm:flex flex-col gap-4">
                {nonBridal.map((svc) => (
                  <NonBridalCard key={svc.key} svc={svc} onSelect={setSelectedService} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={handleViewDetail} />
                ))}
              </div>

              {/* Mobile: native CSS scroll-snap */}
              <div
                ref={otherScrollRef}
                className="sm:hidden -mx-[clamp(1.25rem,5vw,3rem)] [&::-webkit-scrollbar]:hidden"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollSnapType: 'x mandatory',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <div
                  className="flex items-stretch gap-4 pb-4"
                  style={{
                    paddingLeft: 'clamp(1.25rem,5vw,3rem)',
                    paddingRight: 'clamp(1.25rem,5vw,3rem)',
                  }}
                >
                  {nonBridal.map((svc) => (
                    <div key={svc.key} className="flex-shrink-0 w-[82vw] max-w-[320px] self-stretch" style={{ scrollSnapAlign: 'start' }}>
                      <NonBridalCard svc={svc} onSelect={setSelectedService} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={handleViewDetail} />
                    </div>
                  ))}
                  <div className="flex-shrink-0 w-4" />
                </div>
                {nonBridal.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3 pb-1">
                    {nonBridal.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]/40" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

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