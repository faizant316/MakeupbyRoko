import { useEffect, useRef, useState } from 'react';

const STATS = [['17+', 'Years'], ['1000+', 'Clients'], ['100%', 'Bespoke']];

const VIDEO_URL = 'https://videos.pexels.com/video-files/35088452/14864542_1080_1920_25fps.mp4';
const POSTER_URL = 'https://images.pexels.com/videos/35088452/pexels-photo-35088452.jpeg';

function useMobileHeroProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      setProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

function useViewportHeight() {
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return vh;
}

export default function ServicesHero() {
  const videoRef = useRef(null);
  const desktopVideoRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileVideoFailed, setMobileVideoFailed] = useState(false);
  const [desktopVideoFailed, setDesktopVideoFailed] = useState(false);
  const mobileProgress = useMobileHeroProgress();
  const vh = useViewportHeight();

  const setupVideoLoop = (video) => {
    if (!video) return;
    video.load();
    video.currentTime = 1;
    video.play().catch(() => {});
    const handleTimeUpdate = () => {
      if (video.currentTime >= 10) {
        video.currentTime = 0;
      }
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  };

  useEffect(() => setupVideoLoop(videoRef.current), []);
  useEffect(() => setupVideoLoop(desktopVideoRef.current), []);

  // Track scroll for mobile fade effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollDown = () => {
    window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' });
  };

  return (
    <>
      {/* ═══════════ MOBILE: Full-screen video hero ═══════════ */}
      <div
        className="md:hidden relative w-full flex flex-col"
        style={{ marginTop: 'var(--nav-h)' }}
      >
        {/* Scaling video container — ONLY the video scales, not text */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: `calc(${vh}px - var(--nav-h))`,
            transform: `scale3d(${1 - mobileProgress * 0.15}, ${1 - mobileProgress * 0.15}, 1)`,
            transformOrigin: 'top center',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {mobileVideoFailed && (
            <img src={POSTER_URL} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.3) brightness(0.75) contrast(1.1)' }} />
          )}
          <video
            ref={videoRef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'saturate(0.3) brightness(0.75) contrast(1.1)', display: mobileVideoFailed ? 'none' : 'block' }}
            onError={() => setMobileVideoFailed(true)}
          />

          {/* Pink tint */}
          <div className="absolute inset-0" style={{
            background: 'rgba(180, 120, 150, 0.1)',
            mixBlendMode: 'color',
            pointerEvents: 'none',
          }} />

          {/* Gradient overlay at bottom for text legibility */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, #0C0A09 0%, rgba(12,10,9,0.9) 20%, rgba(12,10,9,0.4) 40%, transparent 60%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Text content — FIXED outside scaling, only fades */}
        <div
          className="absolute px-6 z-10"
          style={{
            top: `var(--nav-h)`,
            left: 0,
            right: 0,
            height: `calc(${vh}px - var(--nav-h))`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)',
            opacity: 1 - mobileProgress * 0.4,
            WebkitFontSmoothing: 'antialiased',
            WebkitTextSizeAdjust: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* Headline */}
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2.5rem, 9vw, 3.5rem)',
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#fff',
              marginBottom: '0.5rem',
            }}
          >
            Roqia <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Moshref</em>
          </h1>

          {/* Instagram link — below name */}
          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 mb-4 w-fit"
            style={{ textDecoration: 'none', pointerEvents: 'auto' }}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0">
              <defs>
                <linearGradient id="ig-grad-mobile" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#feda75"/>
                  <stop offset="25%" stopColor="#fa7e1e"/>
                  <stop offset="50%" stopColor="#d62976"/>
                  <stop offset="75%" stopColor="#962fbf"/>
                  <stop offset="100%" stopColor="#4f5bd5"/>
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="url(#ig-grad-mobile)" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="none" stroke="url(#ig-grad-mobile)" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad-mobile)"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D4A0B0' }}>
              @makeupbyroko_
            </span>
          </a>

          {/* Brief text */}
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: '360px', marginBottom: '0.75rem' }}>
            Every service is crafted for you — from your everyday glow to your wedding day.
          </p>

          {/* Stats row */}
          <div className="flex gap-6 mb-4">
            {STATS.map(([num, label]) => (
              <div key={label}>
                <div className="font-serif" style={{ fontSize: '1.3rem', color: '#fff', lineHeight: 1, fontWeight: 300 }}>{num}</div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <button
            onClick={handleScrollDown}
            className="flex flex-col items-center gap-1.5 mx-auto"
            style={{ color: 'rgba(255,255,255,0.6)', textShadow: '0 0 12px rgba(212,160,176,0.5), 0 0 24px rgba(200,170,210,0.3)', pointerEvents: 'auto' }}
          >
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Explore Services</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ═══════════ DESKTOP: Dark split layout ═══════════ */}
      <div
        className="hidden md:flex relative w-full flex-row overflow-hidden"
        style={{
          minHeight: 'calc(100vh - var(--nav-h))',
          marginTop: 'var(--nav-h)',
          background: '#080607',
        }}
      >

        {/* LEFT PANEL */}
        <div className="relative z-10 flex flex-col justify-center px-[clamp(2rem,8vw,5rem)] py-16 w-[50%] min-h-[calc(100vh-var(--nav-h))] flex-shrink-0">
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(4rem, 7vw, 6rem)',
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#F5F0EB',
              marginBottom: '1rem',
            }}
          >
            Roqia<br />
            <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Moshref</em>
          </h1>

          <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 mb-6 group w-fit"
            style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <defs>
                <linearGradient id="ig-grad-desktop" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#feda75"/>
                  <stop offset="25%" stopColor="#fa7e1e"/>
                  <stop offset="50%" stopColor="#d62976"/>
                  <stop offset="75%" stopColor="#962fbf"/>
                  <stop offset="100%" stopColor="#4f5bd5"/>
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="url(#ig-grad-desktop)" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="none" stroke="url(#ig-grad-desktop)" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad-desktop)"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4A0B0' }}
              className="group-hover:opacity-70 transition-opacity">
              @makeupbyroko_
            </span>
          </a>

          <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.12)', marginBottom: '1.5rem' }} />

          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, maxWidth: '500px', marginBottom: '1.5rem' }}>
            Every service is crafted for you — from your everyday glow to your wedding day. Roqia works with a limited number of clients to ensure the highest level of care.
          </p>

          <a
            href="#services-grid"
            className="group"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)',
              padding: '0.875rem 1.75rem', width: 'fit-content',
              transition: 'all 0.25s', borderRadius: '1px',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
          >
            Explore Services
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '14px', height: '14px' }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>

          <div className="flex gap-8 mt-8">
            {STATS.map(([num, label]) => (
              <div key={label}>
                <div className="font-serif" style={{ fontSize: '2rem', color: '#F5F0EB', lineHeight: 1, fontWeight: 300 }}>{num}</div>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: '0.35rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — video */}
        <div className="relative w-[50%] flex-1 overflow-hidden" style={{ minHeight: '300px', zIndex: 1 }}>
          {desktopVideoFailed && (
            <img src={POSTER_URL} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.3) brightness(0.7) contrast(1.15)' }} />
          )}
          <video
            ref={desktopVideoRef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            autoPlay
            muted
            playsInline
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              filter: 'saturate(0.3) brightness(0.7) contrast(1.15)',
              display: desktopVideoFailed ? 'none' : 'block',
            }}
            onError={() => setDesktopVideoFailed(true)}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(120, 80, 60, 0.08)',
            mixBlendMode: 'color',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, #080607 0%, rgba(8,6,7,0.85) 18%, rgba(8,6,7,0.3) 40%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
            background: 'linear-gradient(to top, rgba(12,10,9,0.7), transparent)',
            pointerEvents: 'none',
          }} />

        </div>
      </div>
    </>
  );
}