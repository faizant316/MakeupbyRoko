import { useRef } from 'react';

/**
 * Realistic iPhone mockup — uses a real transparent-background iPhone 15 Pro PNG.
 * Review screenshots are composited BEHIND the frame so bezels look photorealistic.
 */
export default function TestimonialPhone({ images, activeIndex, onNext, onPrev }) {
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? onNext?.() : onPrev?.();
    touchStartX.current = null;
  };

  // User-uploaded iPhone PNG with transparent background
  const FRAME_URL = 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/f95c7b146_image.png';

  return (
    <div className="relative mx-auto select-none" style={{ width: '100%', maxWidth: 300 }}>

      {/* Ambient glow */}
      <div className="absolute pointer-events-none z-0" style={{
        inset: '-30%',
        background: 'radial-gradient(ellipse at 50% 55%, rgba(212,160,176,0.55) 0%, rgba(200,155,215,0.28) 45%, transparent 70%)',
        filter: 'blur(55px)',
      }} />

      {/* Outer container — matches the iPhone PNG aspect ratio */}
      <div className="relative z-10" style={{ aspectRatio: '9/19.5' }}>

        {/* Screen content — calibrated to the uploaded iPhone PNG screen area */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: '3.5%',
            left: '7.5%',
            right: '7.5%',
            bottom: '3.5%',
            borderRadius: '11%',
            background: '#fff',
            zIndex: 1,
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Client review"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'top center',
                opacity: activeIndex === i ? 1 : 0,
                transition: 'opacity 0.85s ease-in-out',
              }}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>

        {/* iPhone frame PNG — on top, covers bezels photorealistically */}
        <img
          src={FRAME_URL}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 2, objectFit: 'contain' }}
          draggable={false}
        />

      </div>
    </div>
  );
}