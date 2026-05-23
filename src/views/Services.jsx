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
  const [showClassModal, setShowClassModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeBridalId, setActiveBridalId] = useState(null); // null = show both
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCategorySelect = useCallback((key, bridalId = null) => {
    setActiveCategory(key);
    setActiveBridalId(bridalId);
    setDropdownOpen(false);
  }, []);

  const allBridalServices = SERVICE_DATA.filter(s => s.category === 'bridal');

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

  const bridalServices = activeBridalId
    ? filtered.filter(s => s.category === 'bridal' && s.key === activeBridalId)
    : sortedBridal(filtered.filter(s => s.category === 'bridal'));
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
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: '#b0a89e', lineHeight: 1.75, maxWidth: '400px', margin: '0 0 1.25rem' }}>
                Each service is tailored to you — from everyday glam to your wedding day. Limited bookings taken each month.
              </p>

              {/* Filter — editorial minimal trigger */}
              <div ref={dropdownRef} className="relative inline-block">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="group select-none"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    fontSize: '0.7rem',
                    fontWeight: 400,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: dropdownOpen ? '#111' : '#C4889A',
                    borderBottom: `1px solid ${dropdownOpen ? '#111' : 'rgba(196,136,154,0.5)'}`,
                    paddingBottom: '2px',
                  }}
                  onMouseEnter={e => {
                    if (!dropdownOpen) {
                      e.currentTarget.style.color = '#111';
                      e.currentTarget.style.borderBottomColor = '#111';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!dropdownOpen) {
                      e.currentTarget.style.color = '#C4889A';
                      e.currentTarget.style.borderBottomColor = 'rgba(196,136,154,0.5)';
                    }
                  }}
                >
                  <span>{activeBridalId
                    ? allBridalServices.find(b => b.key === activeBridalId)?.title || 'Bridal'
                    : CATEGORIES.find(c => c.key === activeCategory)?.label}</span>
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{
                      width: '10px',
                      height: '10px',
                      transition: 'transform 0.2s ease-out',
                      transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                      marginLeft: '2px',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute left-0 top-full z-50"
                    style={{
                      width: '300px',
                      marginTop: '0.6rem',
                      background: '#FEFDFB',
                      backdropFilter: 'blur(40px)',
                      borderRadius: '14px',
                      border: '1px solid rgba(212,160,176,0.25)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
                      animation: 'fadeSlideDown 0.2s cubic-bezier(0.16,1,0.3,1)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Dropdown content */}
                    <div style={{ padding: '14px 0' }}>
                      {/* All Services */}
                      <button
                        onClick={() => handleCategorySelect('all', null)}
                        className="w-full flex items-center gap-3.5 text-left transition-all duration-100"
                        style={{
                          padding: '10px 18px',
                          background: activeCategory === 'all' && !activeBridalId ? 'rgba(212,160,176,0.08)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!(activeCategory === 'all' && !activeBridalId)) e.currentTarget.style.background = 'rgba(212,160,176,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = activeCategory === 'all' && !activeBridalId ? 'rgba(212,160,176,0.08)' : 'transparent'; }}
                      >
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>✦</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: activeCategory === 'all' && !activeBridalId ? 400 : 300, color: '#2a2520', flex: 1, letterSpacing: '0.02em' }}>All Services</span>
                      </button>

                      {/* Bridal group header + items */}
                      <div style={{ paddingTop: '10px', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '6px 18px 8px 18px' }}>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.48rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4A0B0', margin: 0, opacity: 0.6 }}>Bridal</p>
                        </div>

                        {allBridalServices.map((bsvc, i) => (
                          <button
                            key={bsvc.key}
                            onClick={() => handleCategorySelect('bridal', bsvc.key)}
                            className="w-full text-left transition-all duration-100"
                            style={{
                              padding: '10px 18px',
                              background: activeBridalId === bsvc.key ? 'rgba(212,160,176,0.08)' : 'transparent',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                            onMouseEnter={e => { if (activeBridalId !== bsvc.key) e.currentTarget.style.background = 'rgba(212,160,176,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = activeBridalId === bsvc.key ? 'rgba(212,160,176,0.08)' : 'transparent'; }}
                          >
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: activeBridalId === bsvc.key ? 400 : 300, color: '#2a2520', margin: 0, letterSpacing: '0.01em' }}>{bsvc.title}</p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', color: '#a89a8e', margin: 0 }}>{bsvc.price} · {bsvc.duration}</p>
                          </button>
                        ))}
                      </div>

                      {/* Other Services group */}
                      <div style={{ paddingTop: '10px', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '6px 18px 8px 18px' }}>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.48rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', margin: 0, opacity: 0.6 }}>Other</p>
                        </div>

                        {[
                          { key: 'event', label: 'Non-Bridal Makeup', icon: '✨', price: '$400', duration: '1.5 hrs' },
                          { key: 'creative', label: 'Photoshoot Makeup', icon: '📸', price: '$600', duration: '1 hr 45 min' },
                          { key: 'lessons', label: 'Makeup Courses', icon: '💄', price: 'See Classes', duration: 'Varies' },
                        ].map(cat => {
                          const isActive = activeCategory === cat.key && !activeBridalId;
                          return (
                            <button
                              key={cat.key}
                              onClick={() => handleCategorySelect(cat.key, null)}
                              className="w-full text-left transition-all duration-100"
                              style={{
                                padding: '10px 18px',
                                background: isActive ? 'rgba(212,160,176,0.08)' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(212,160,176,0.04)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(212,160,176,0.08)' : 'transparent'; }}
                            >
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: isActive ? 400 : 300, color: '#2a2520', margin: 0, letterSpacing: '0.01em' }}>{cat.label}</p>
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', color: '#a89a8e', margin: 0 }}>{cat.price} · {cat.duration}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
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
                <span className="text-[1rem]">💍</span>
                <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0]">Bridal Services</span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#D4A0B0]/20 to-transparent" />
              </div>

              {/* Mobile: horizontal snap scroll — Desktop: grid */}
              <div className="hidden lg:grid gap-5" style={{ gridTemplateColumns: bridalServices.length >= 3 ? 'repeat(3, 1fr)' : bridalServices.length === 2 ? 'repeat(2, 1fr)' : '1fr' }}>
                {bridalServices.map((svc, idx) => (
                  <BridalCard key={svc.key} svc={svc} idx={idx} onSelect={setSelectedService} onViewDetail={setDetailService} />
                ))}
              </div>

              {/* Mobile snap scroll */}
              <div className="lg:hidden -mx-[clamp(1.25rem,5vw,3rem)]">
                <div
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-[clamp(1.25rem,5vw,3rem)] pb-4"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                  {bridalServices.map((svc, idx) => (
                    <div key={svc.key} className="snap-center flex-shrink-0 w-[82vw] max-w-[340px]">
                      <BridalCard svc={svc} idx={idx} onSelect={setSelectedService} onViewDetail={setDetailService} />
                    </div>
                  ))}
                  {/* Peek spacer */}
                  <div className="flex-shrink-0 w-4" />
                </div>
                {bridalServices.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-1">
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
                <span className="text-[1rem]">✨</span>
                <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999]">Other Services</span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#eee] to-transparent" />
              </div>

              {/* Desktop: vertical stacked cards */}
              <div className="hidden sm:flex flex-col gap-4">
                {nonBridal.map((svc) => (
                  <NonBridalCard key={svc.key} svc={svc} onSelect={setSelectedService} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={setDetailService} />
                ))}
              </div>

              {/* Mobile: horizontal snap scroll */}
              <div className="sm:hidden -mx-[clamp(1.25rem,5vw,3rem)]">
                <div
                  className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory px-[clamp(1.25rem,5vw,3rem)] pb-4"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                  {nonBridal.map((svc) => (
                    <div key={svc.key} className="snap-center flex-shrink-0 w-[82vw] max-w-[320px] self-stretch">
                      <NonBridalCard svc={svc} onSelect={setSelectedService} onOpenClassModal={() => setShowClassModal(true)} onViewDetail={setDetailService} />
                    </div>
                  ))}
                  <div className="flex-shrink-0 w-4" />
                </div>
                {nonBridal.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-1">
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
          onClose={() => setDetailService(null)}
          onBook={(svc) => { setDetailService(null); setSelectedService(svc); }}
          onOpenClassModal={() => { setDetailService(null); setShowClassModal(true); }}
        />
      )}

      {/* Makeup Class Registration Modal */}
      {showClassModal && (
        <MakeupClassModal onClose={() => setShowClassModal(false)} />
      )}
    </div>
  );
}