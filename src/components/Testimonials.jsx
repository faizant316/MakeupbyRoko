import { useState, useEffect } from 'react';
import TestimonialPhone from './TestimonialPhone';
import LeaveReviewForm from './LeaveReviewForm';

const REVIEWS = [
  {
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/43ff616cf_image.png',
    name: 'Engagement Client',
    service: 'Full Glam',
    quote: '"I never felt so beautiful before and everyone told me I look like a doll… ur work is absolute magic"',
  },
  {
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/03d618924_image.png',
    name: 'Bridal Client',
    service: 'Bridal Package',
    quote: '"My favorite part about the wedding was my makeup. Your my one and only favorite artist."',
  },
  {
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/fb4610611_image.png',
    name: 'Bridal Client',
    service: 'Bridal Package',
    quote: '"Everyone LOVED both my makeup and hair. They said I was a princess. You two are the best both inside and out!"',
  },
  {
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/c50d73a88_image.png',
    name: 'NY Bridal Client',
    service: 'Bridal Package',
    quote: '"You both have officially ruined NY artists for me… no one is good enough for us anymore since you and Roko"',
  },
  {
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/ed5925dbe_image.png',
    name: 'Bridal Client',
    service: 'Full Glam',
    quote: '"I got told I looked like a princess countless times… I had sweat DRIPPING down my face all night & my makeup did not budge"',
  },
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-cycle through screenshots
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const goTo = (i) => {
    setActiveIndex((i + REVIEWS.length) % REVIEWS.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 6000);
  };
  const prev = () => goTo(activeIndex - 1);
  const next = () => goTo(activeIndex + 1);

  const allImages = REVIEWS.map((r) => r.image);

  const current = REVIEWS[activeIndex];

  return (
    <section id="reviews" className="bg-white py-[clamp(4rem,8vw,7rem)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-[clamp(1.25rem,5vw,3rem)]">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="w-6 h-px bg-[#D4A0B0]" />
            <span className="label" style={{ color: '#D4A0B0' }}>Client Love</span>
            <span className="w-6 h-px bg-[#D4A0B0]" />
          </div>
          <h2
            className="font-serif mb-3"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 300, color: '#111', lineHeight: 1.1 }}
          >
            Straight from <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Their</em> Texts
          </h2>
          <p className="text-[0.85rem] text-[#6d6460] max-w-[420px] mx-auto leading-[1.7]">
            Real messages from real clients. Nothing speaks louder than love in the inbox.
          </p>

          {/* Social proof strip */}
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-2 mt-5">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} viewBox="0 0 24 24" fill="#D4A0B0" className="w-3.5 h-3.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <span className="text-[0.72rem] font-semibold text-[#111]">5.0</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-[#e0d6cf]" />
            <span className="text-[0.72rem] text-[#6d6460]">Loved by brides &amp; clients</span>
            <span className="w-1 h-1 rounded-full bg-[#e0d6cf]" />
            <span className="text-[0.72rem] text-[#6d6460]">Bay Area &amp; beyond</span>
          </div>
        </div>

        {/* Desktop: Phone left + Review form right */}
        <div className="hidden md:grid grid-cols-2 gap-12 items-center">

          {/* Left — Phone with crossfading screenshots */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4">
              {/* Left arrow */}
              <button onClick={prev} className="flex items-center justify-center text-[#ccc] hover:text-[#D4A0B0] transition-all flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="relative" style={{ width: '280px' }}>
                <TestimonialPhone images={allImages} activeIndex={activeIndex} onNext={next} onPrev={prev} />
              </div>
              {/* Right arrow */}
              <button onClick={next} className="flex items-center justify-center text-[#ccc] hover:text-[#D4A0B0] transition-all flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Quote + info below phone */}
            <div className="mt-6 text-center max-w-[340px] transition-all duration-700" key={activeIndex}
              style={{ animation: 'fadeSlideDown 0.6s ease-out' }}
            >
              <p className="font-serif italic text-[0.95rem] text-[#555] leading-[1.7] mb-3">
                {current.quote}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">
                  {current.name}
                </span>
                <span className="text-[#ddd]">·</span>
                <span className="text-[0.65rem] tracking-[0.08em] uppercase text-[#D4A0B0]">
                  {current.service}
                </span>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-2 mt-5">
              {REVIEWS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    activeIndex === i ? 'w-6 h-2 bg-[#D4A0B0]' : 'w-2 h-2 bg-[#e8e2dc] hover:bg-[#d5cdc5]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right — Leave a Review */}
          <div className="bg-white rounded-xl p-8 border border-[#EDD8E0]/60 shadow-[0_8px_40px_rgba(212,160,176,0.12),_0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#D4A0B0] text-sm">✦</span>
                <span className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-[#8A4A63]">Share Your Experience</span>
              </div>
              <h3 className="font-serif text-[1.5rem] text-[#111]" style={{ fontWeight: 300 }}>
                Leave a <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Review</em>
              </h3>
              <p className="text-[0.8rem] text-[#999] mt-1 leading-relaxed">
                Had a great experience? I'd love to hear from you!
              </p>
            </div>
            <LeaveReviewForm />
          </div>
        </div>

        {/* Mobile: Stacked — phone carousel then review form */}
        <div className="md:hidden flex flex-col items-center gap-10">

          {/* Phone with crossfade */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <button onClick={prev} className="flex items-center justify-center text-[#ccc] hover:text-[#D4A0B0] transition-all flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="relative" style={{ width: '260px' }}>
                <TestimonialPhone images={allImages} activeIndex={activeIndex} onNext={next} onPrev={prev} />
              </div>
              <button onClick={next} className="flex items-center justify-center text-[#ccc] hover:text-[#D4A0B0] transition-all flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div className="mt-5 text-center max-w-[300px]" key={activeIndex}
              style={{ animation: 'fadeSlideDown 0.6s ease-out' }}
            >
              <p className="font-serif italic text-[0.9rem] text-[#555] leading-[1.7] mb-2">
                {current.quote}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">
                  {current.name}
                </span>
                <span className="text-[#ddd]">·</span>
                <span className="text-[0.6rem] tracking-[0.08em] uppercase text-[#D4A0B0]">
                  {current.service}
                </span>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-2 mt-4">
              {REVIEWS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    activeIndex === i ? 'w-5 h-1.5 bg-[#D4A0B0]' : 'w-1.5 h-1.5 bg-[#e8e2dc]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Review form */}
          <div className="w-full bg-white rounded-xl p-6 border border-[#EDD8E0]/60 shadow-[0_8px_40px_rgba(212,160,176,0.12),_0_1px_6px_rgba(0,0,0,0.04)] relative z-10 pointer-events-auto">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#D4A0B0] text-sm">✦</span>
                <span className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-[#8A4A63]">Share Your Experience</span>
              </div>
              <h3 className="font-serif text-[1.3rem] text-[#111]" style={{ fontWeight: 300 }}>
                Leave a <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Review</em>
              </h3>
            </div>
            <LeaveReviewForm />
          </div>
        </div>

        {/* Instagram CTA */}
        <div className="text-center mt-10">
          <a
            href="https://www.instagram.com/makeupbyroko_/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.08em] uppercase text-[#999] hover:text-[#D4A0B0] transition-colors"
          >
            See more reviews on Instagram
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}