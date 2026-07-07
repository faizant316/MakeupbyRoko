import { useCallback, useEffect, useRef, useState } from 'react';

const STATS = [['17+', 'Years'], ['1000+', 'Clients']];

const VIDEO_URL = '/hero.mp4';           // 1080p — desktop split panel
const MOBILE_VIDEO_URL = '/hero-mobile.mp4'; // 720p, ~650KB — fast start on cellular
const POSTER_URL = '/hero-poster.jpg';

// Keeps trying to start playback through the events that typically unblock
// autoplay on mobile: the video finishing its initial buffer, the tab becoming
// visible, or the user's first tap/scroll/click. That last one is the key to
// getting near-100% coverage — a single real "user gesture" satisfies iOS Low
// Power Mode, iOS Low Data Mode, and Android Data Saver, all of which hard-block
// silent autoplay no matter what attributes the <video> has. `playFn` must
// return the play() promise so we can stop retrying once it succeeds.
function useReliableAutoplay(playFn) {
  useEffect(() => {
    let done = false;
    const gestureEvents = ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown'];
    const cleanup = () => {
      done = true;
      document.removeEventListener('visibilitychange', onVis);
      gestureEvents.forEach((e) => window.removeEventListener(e, attempt));
    };
    const attempt = () => {
      if (done) return;
      const p = playFn();
      if (p && typeof p.then === 'function') {
        p.then(() => cleanup()).catch(() => {});
      }
    };
    const onVis = () => { if (document.visibilityState === 'visible') attempt(); };

    document.addEventListener('visibilitychange', onVis);
    gestureEvents.forEach((e) => window.addEventListener(e, attempt, { passive: true }));
    attempt(); // immediate best-effort
    return cleanup;
  }, [playFn]);
}

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
  // Capture once at mount — do NOT update on resize.
  // iOS Safari increases window.innerHeight when its toolbar collapses during
  // scroll, causing the hero text to visually jump downward. Locking to the
  // initial value (equivalent to 100svh) keeps the layout perfectly stable.
  const [vh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 812));
  return vh;
}

// Two-video swap loop — the only reliable way to get a seamless loop on iOS Safari.
// While video A is playing, video B sits ready at t=0. When A has ~1.5s left,
// B starts playing and fades in. A is paused and reset. They alternate forever.
//
// Loading strategy for slow/metered connections: ONLY video A preloads at page
// load, so the visible first frame arrives as fast as possible on a single
// stream. Video B is deferred (preload="none") and only warmed up once A is
// actually playing. If a swap comes due before B is buffered, we simply re-loop
// A instead of stalling on a black frame.
function MobileVideoLoop({ src, poster, videoStyle, onError }) {
  const refA = useRef(null);
  const refB = useRef(null);
  const activeRef = useRef('A');
  const swapping = useRef(false);
  const [front, setFront] = useState('A');
  const [started, setStarted] = useState(false); // true once a real frame has played

  // Play whichever video is currently in front. Returns the play() promise so
  // useReliableAutoplay can stop retrying on success.
  const playFront = useCallback(() => {
    const v = activeRef.current === 'A' ? refA.current : refB.current;
    return v ? v.play() : undefined;
  }, []);
  useReliableAutoplay(playFront);

  useEffect(() => {
    const HANDOFF = 1.5;
    const vA = refA.current;
    const vB = refB.current;
    if (!vA || !vB) return;

    vA.play().catch(() => {});

    // Retry A whenever more data buffers (covers "not enough data yet" stalls).
    const kickA = () => { if (activeRef.current === 'A') vA.play().catch(() => {}); };
    const onAPlaying = () => {
      setStarted(true);
      // Visible video is running — now quietly warm up B for a seamless loop.
      if (vB.preload !== 'auto') vB.preload = 'auto';
      try { vB.load(); } catch { /* noop */ }
    };
    vA.addEventListener('loadeddata', kickA);
    vA.addEventListener('canplay', kickA);
    vA.addEventListener('playing', onAPlaying);

    const doSwap = () => {
      if (swapping.current) return;
      const isA = activeRef.current === 'A';
      const next = isA ? vB : vA;
      const prev = isA ? vA : vB;
      const nextKey = isA ? 'B' : 'A';

      // Incoming video not buffered enough? Don't freeze on a swap — re-loop the
      // current one so playback never stalls on a slow connection.
      if (next.readyState < 3) {
        prev.currentTime = 0;
        prev.play().catch(() => {});
        return;
      }

      swapping.current = true;
      next.currentTime = 0;
      next.play().catch(() => {});
      setFront(nextKey);
      setTimeout(() => {
        prev.pause();
        prev.currentTime = 0;
        activeRef.current = nextKey;
        swapping.current = false;
      }, (HANDOFF + 0.6) * 1000);
    };

    const onTime = (e) => {
      const active = activeRef.current === 'A' ? vA : vB;
      if (e.target !== active || swapping.current || !e.target.duration) return;
      if (e.target.currentTime >= e.target.duration - HANDOFF) doSwap();
    };

    vA.addEventListener('timeupdate', onTime);
    vB.addEventListener('timeupdate', onTime);
    return () => {
      vA.removeEventListener('timeupdate', onTime);
      vB.removeEventListener('timeupdate', onTime);
      vA.removeEventListener('loadeddata', kickA);
      vA.removeEventListener('canplay', kickA);
      vA.removeEventListener('playing', onAPlaying);
    };
  }, []);

  const base = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', transition: 'opacity 0.5s ease',
    ...videoStyle,
  };

  return (
    <>
      <video ref={refA} src={src} poster={poster} muted playsInline preload="auto" autoPlay
        style={{ ...base, opacity: front === 'A' ? 1 : 0 }} onError={onError} />
      <video ref={refB} src={src} poster={poster} muted playsInline preload="none"
        style={{ ...base, opacity: front === 'B' ? 1 : 0 }} />
      {/* Poster overlay sits on top until real playback starts. It hides the
          native "tap to play" glyph iOS paints on a paused video, and gives a
          clean still frame in the rare case autoplay stays blocked. Fades out
          the moment a frame plays. Non-interactive so taps still reach the page
          (and trigger the gesture-based autoplay retry). */}
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        style={{ ...base, transition: 'opacity 0.6s ease', opacity: started ? 0 : 1, pointerEvents: 'none' }}
      />
    </>
  );
}

export default function ServicesHero() {
  const desktopVideoRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileVideoFailed, setMobileVideoFailed] = useState(false);
  const [desktopVideoFailed, setDesktopVideoFailed] = useState(false);
  const mobileProgress = useMobileHeroProgress();
  const vh = useViewportHeight();

  // Same resilient autoplay coverage for the desktop split-panel video.
  const playDesktop = useCallback(() => desktopVideoRef.current?.play(), []);
  useReliableAutoplay(playDesktop);

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
          {mobileVideoFailed
            ? <img src={POSTER_URL} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.3) brightness(0.75) contrast(1.1)' }} />
            : <MobileVideoLoop
                src={MOBILE_VIDEO_URL}
                poster={POSTER_URL}
                videoStyle={{ filter: 'saturate(0.3) brightness(0.75) contrast(1.1)' }}
                onError={() => setMobileVideoFailed(true)}
              />
          }

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

        {/* Text content — outside scaling container, position matches original */}
        <div
          className="absolute px-6 z-10"
          style={{
            top: 'var(--nav-h)',
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

          {/* Location & travel */}
          <p className="mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)' }}>
            Bay Area, California &nbsp;·&nbsp; Traveling Artist
          </p>

          {/* Brief text */}
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: '360px', marginBottom: '1.25rem' }}>
            Every service is crafted for you, from your everyday glow to your wedding day.
          </p>

          {/* CTA ghost button — same position as desktop */}
          <a
            href="#services-grid"
            onClick={(e) => { e.preventDefault(); document.getElementById('services-grid')?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '0.75rem 1.4rem',
              border: '1px solid #D4A0B0',
              color: '#D4A0B0',
              borderRadius: '1px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              width: 'fit-content',
              transition: 'border-color 0.25s, color 0.25s',
            }}
          >
            Book a Service
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '12px', height: '12px' }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>

          {/* Stats row */}
          <div className="flex gap-6">
            {STATS.map(([num, label]) => (
              <div key={label}>
                <div className="font-serif" style={{ fontSize: '1.3rem', color: '#fff', lineHeight: 1, fontWeight: 300 }}>{num}</div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{label}</div>
              </div>
            ))}
          </div>
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

          {/* Location & travel */}
          <p className="mb-5" style={{ fontSize: '1rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)' }}>
            Bay Area, California &nbsp;·&nbsp; Traveling Artist
          </p>

          <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.12)', marginBottom: '1.5rem' }} />

          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, maxWidth: '500px', marginBottom: '1.5rem' }}>
            Every service is crafted for you, from your everyday glow to your wedding day. Roqia works with a limited number of clients to ensure the highest level of care.
          </p>

          <a
            href="#services-grid"
            className="group"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#D4A0B0', border: '1px solid #D4A0B0',
              padding: '0.875rem 1.75rem', width: 'fit-content',
              transition: 'all 0.25s', borderRadius: '1px',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,176,0.12)'; e.currentTarget.style.borderColor = '#E0B4C2'; e.currentTarget.style.color = '#E0B4C2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
          >
            Book a Service
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
            loop
            playsInline
            preload="auto"
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