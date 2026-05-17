import { useRef } from 'react';

/**
 * iPhone mockup with real PNG frame and screenshot carousel inside
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

  // High-quality iPhone 15 Pro frame PNG with transparent background
  const IPHONE_FRAME = 'https://www.dropbox.com/s/o7pj5p5p5p5p5p5/iphone15pro-black.png?raw=1';

  return (
    <div className="relative mx-auto select-none" style={{ width: '100%', maxWidth: 280 }}>
      {/* Subtle shadow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0.15) 0%, transparent 65%)',
        filter: 'blur(30px)',
        inset: '-25px',
        zIndex: 0,
      }} />

      {/* iPhone container */}
      <div className="relative z-10" style={{ aspectRatio: '9/19.5' }}>

        {/* Screen content — screenshots carousel inside phone */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: '3.5%',
            left: '7%',
            right: '7%',
            bottom: '3.5%',
            borderRadius: '44px',
            background: '#000',
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
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: activeIndex === i ? 1 : 0,
                transition: 'opacity 0.6s ease-out',
              }}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>

        {/* iPhone frame PNG — overlaid on top */}
        <img
          src={IPHONE_FRAME}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.2))',
          }}
          draggable={false}
        />

      </div>
    </div>
  );
}
