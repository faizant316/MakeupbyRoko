import { useCallback, useEffect, useRef, useState } from 'react';
import { scrollToTarget } from '@/lib/lenis';

const STATS = [['17+', 'Years'], ['1000+', 'Clients']];

const VIDEO_URL = '/hero.mp4';          // full-quality 1080p, used on both desktop and mobile
const POSTER_URL = '/hero-poster.jpg';  // crisp still shown instantly; video fades in once ready

// Tiny blurred placeholder baked straight into the code. It paints at 0ms with
// zero network, so the hero is never blank even on the very first frame of a
// cold cellular load, before the (small) crisp poster JPG has arrived.
const LQIP = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYyLjI4LjEwMQD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABkAAEBAQEBAQAAAAAAAAAAAAAHBggEAgUBAQAAAAAAAAAAAAAAAAAAAAAQAAIABQEHBQEBAAAAAAAAAAECAwARMQQhUQVBYXM0shNyEgYUIpERAQAAAAAAAAAAAAAAAAAAAAD/wAARCAASACADASIAAhEAAxEA/9oADAMBAAIRAxEAPwAEQ/FlOwg/5NXvGMkaLDdDoU11qa1sdkyIvNLiYpy2ENF9SK7AJDrQUAqzO3BRy1kOVkdQCwIqKiulRtHKfitcy95+58uPjooWF6sJACPkTXShCFrV4cJBnRobsrAhlJBBuCDQiQ8C4lg+pgfuinZAanL+lkfFxLD9S72L0D5LIPDXPunHm8O9yevF8zOw2ufdOPN4d7k9eL5mQ//Z';

// Keeps the hero video playing for the life of the page. Autoplay can be
// blocked at load or revoked later by many things (iOS Low Power / Low Data
// Mode, Android Data Saver, desktop Chrome's Energy Saver, prerendered or
// background-loaded tabs, the browser pausing media to save power), so a
// single successful play() is not enough. Two layers of coverage:
//  1. Retry on the events that typically unblock autoplay: the tab becoming
//     visible and the user's first tap/scroll/click. A real user gesture
//     satisfies every power/data-saver mode that hard-blocks silent autoplay.
//  2. A light watchdog that, while the tab is visible, restarts a video the
//     browser paused and un-wedges a "playing" one whose clock stopped
//     advancing (rare decoder stall). Listeners stay attached for the whole
//     session, because a video that was happily playing can still be paused
//     by the browser later; kicking an already-playing video is a no-op.
// `getVideo` returns the video element that should currently be playing.
function useReliableAutoplay(getVideo) {
  useEffect(() => {
    const gestureEvents = ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown', 'wheel'];
    const kick = () => {
      const v = getVideo();
      if (v && v.paused) v.play().catch(() => {});
    };
    const onVis = () => { if (document.visibilityState === 'visible') kick(); };

    let lastTime = -1;
    const watchdog = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const v = getVideo();
      if (!v) return;
      if (v.paused) { v.play().catch(() => {}); lastTime = -1; return; }
      // Claims to be playing, has frames buffered ahead, but time is frozen:
      // nudge the decoder with a micro-seek, then play again.
      if (v.readyState >= 3 && v.currentTime === lastTime) {
        try { v.currentTime = v.currentTime + 0.001; } catch { /* noop */ }
        v.play().catch(() => {});
      }
      lastTime = v.currentTime;
    }, 2000);

    document.addEventListener('visibilitychange', onVis);
    gestureEvents.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    kick(); // immediate best-effort
    return () => {
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVis);
      gestureEvents.forEach((e) => window.removeEventListener(e, kick));
    };
  }, [getVideo]);
}

// Mobile hero parallax (video scale + text fade) driven by two CSS variables on
// the mobile hero wrapper, batched through requestAnimationFrame. Same reason as
// the page hero: the old setState-on-every-scroll re-rendered this whole hero
// (two <video> elements and all) every frame. A CSS-var write does not.
function useMobileHeroParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      el.style.setProperty('--mh-scale', (1 - p * 0.15).toFixed(4));
      el.style.setProperty('--mh-op', (1 - p * 0.4).toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return ref;
}

function useViewportHeight() {
  // Capture once at mount — do NOT update on resize.
  // iOS Safari increases window.innerHeight when its toolbar collapses during
  // scroll, causing the hero text to visually jump downward. Locking to the
  // initial value (equivalent to 100svh) keeps the layout perfectly stable.
  const [vh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 812));
  return vh;
}

// POSTER-FIRST hero. The crisp still image (over an instant blurred placeholder)
// is what the visitor sees the moment the page opens, on ANY connection. The
// video loads quietly underneath and is only revealed once it is genuinely
// playing and advancing frames. If the connection is bad or autoplay is blocked,
// the visitor simply keeps seeing a sharp still and never a broken/half-loaded
// player. Quality never suffers because the still is full quality and the video
// is full 1080p.
//
// Seamless loop: two copies of the video alternate so iOS never shows its
// loop-point flicker. Only copy A preloads up front (single stream = fastest);
// copy B warms up once A is playing. If a loop swap comes due before B is
// buffered, we just re-loop A rather than stall.
function MobileVideoLoop({ src, poster, lqip, videoStyle, onError }) {
  const refA = useRef(null);
  const refB = useRef(null);
  const activeRef = useRef('A');
  const swapping = useRef(false);
  const revealed = useRef(false);
  const [front, setFront] = useState('A');
  const [ready, setReady] = useState(false); // true once the video is truly playing

  // Hand useReliableAutoplay whichever video is currently in front so its
  // keep-alive always watches the copy that should be playing.
  const getFrontVideo = useCallback(
    () => (activeRef.current === 'A' ? refA.current : refB.current),
    [],
  );
  useReliableAutoplay(getFrontVideo);

  useEffect(() => {
    const HANDOFF = 1.5;
    const vA = refA.current;
    const vB = refB.current;
    if (!vA || !vB) return;

    vA.play().catch(() => {});

    // Retry A whenever more data buffers (covers "not enough data yet" stalls).
    const kickA = () => { if (activeRef.current === 'A') vA.play().catch(() => {}); };
    vA.addEventListener('loadeddata', kickA);
    vA.addEventListener('canplay', kickA);

    const doSwap = () => {
      if (swapping.current) return;
      const isA = activeRef.current === 'A';
      const next = isA ? vB : vA;
      const prev = isA ? vA : vB;
      const nextKey = isA ? 'B' : 'A';

      // Incoming video not buffered enough? Don't freeze on a swap. Re-loop the
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
      if (e.target !== active) return;

      // First real evidence the video is playing: reveal it (crossfade off the
      // poster) and warm up copy B for the seamless loop. Runs once.
      if (!revealed.current && e.target.currentTime > 0.2) {
        revealed.current = true;
        setReady(true);
        if (vB.preload !== 'auto') vB.preload = 'auto';
        try { vB.load(); } catch { /* noop */ }
      }

      if (swapping.current || !e.target.duration) return;
      if (e.target.currentTime >= e.target.duration - HANDOFF) doSwap();
    };

    vA.addEventListener('timeupdate', onTime);
    vB.addEventListener('timeupdate', onTime);
    return () => {
      vA.removeEventListener('timeupdate', onTime);
      vB.removeEventListener('timeupdate', onTime);
      vA.removeEventListener('loadeddata', kickA);
      vA.removeEventListener('canplay', kickA);
    };
  }, []);

  const base = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover',
    ...videoStyle,
  };
  const fade = { transition: 'opacity 0.7s ease' };

  return (
    <>
      {/* 0ms blurred paint, zero network */}
      <div style={{ ...base, backgroundImage: `url(${lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <video ref={refA} src={src} muted playsInline preload="auto" autoPlay
        style={{ ...base, ...fade, opacity: ready && front === 'A' ? 1 : 0 }} onError={onError} />
      <video ref={refB} src={src} muted playsInline preload="none"
        style={{ ...base, ...fade, opacity: ready && front === 'B' ? 1 : 0 }} />
      {/* Crisp still on top. Covers the video until it is truly playing, then
          crossfades out. Non-interactive so a tap still reaches the page and
          triggers the gesture-based autoplay retry. */}
      <img src={poster} alt="" aria-hidden="true"
        style={{ ...base, ...fade, opacity: ready ? 0 : 1, pointerEvents: 'none' }} />
    </>
  );
}

export default function ServicesHero() {
  const desktopVideoRef = useRef(null);
  const [mobileVideoFailed, setMobileVideoFailed] = useState(false);
  const [desktopVideoFailed, setDesktopVideoFailed] = useState(false);
  const [desktopReady, setDesktopReady] = useState(false);
  const mobileHeroRef = useMobileHeroParallax();
  const vh = useViewportHeight();

  // Same resilient autoplay coverage for the desktop split-panel video.
  const getDesktopVideo = useCallback(() => desktopVideoRef.current, []);
  useReliableAutoplay(getDesktopVideo);

  // Reveal the desktop video (crossfade off its poster) only once it is truly
  // playing and advancing frames.
  useEffect(() => {
    const v = desktopVideoRef.current;
    if (!v) return;
    const onAdvance = () => { if (v.currentTime > 0.2) setDesktopReady(true); };
    v.addEventListener('timeupdate', onAdvance);
    v.addEventListener('playing', onAdvance);
    return () => {
      v.removeEventListener('timeupdate', onAdvance);
      v.removeEventListener('playing', onAdvance);
    };
  }, []);

  // Lenis owns the page scroll, so go through scrollToTarget — a raw
  // window.scrollTo fights its RAF loop and gets snapped back.
  const handleScrollDown = () => {
    scrollToTarget('#services-grid', { offset: -60 });
  };

  return (
    <>
      {/* ═══════════ MOBILE: Full-screen video hero ═══════════ */}
      <div
        ref={mobileHeroRef}
        className="md:hidden relative w-full flex flex-col"
        style={{ marginTop: 'var(--nav-h)' }}
      >
        {/* Scaling video container — ONLY the video scales, not text.
            --mh-scale is updated on scroll by useMobileHeroParallax. */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: `calc(${vh}px - var(--nav-h))`,
            transform: 'scale3d(var(--mh-scale, 1), var(--mh-scale, 1), 1)',
            transformOrigin: 'top center',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {mobileVideoFailed
            ? <img src={POSTER_URL} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.3) brightness(0.75) contrast(1.1)' }} />
            : <MobileVideoLoop
                src={VIDEO_URL}
                poster={POSTER_URL}
                lqip={LQIP}
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
            opacity: 'var(--mh-op, 1)',
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

          {/* CTA — solid so it still reads as a real button, but sized to its own
              words rather than the full column. Full-width + a wide pink glow made
              it the loudest thing on a phone screen; this keeps the same colour and
              weight at roughly half the footprint, still well over the 44px tap
              minimum. */}
          <a
            href="#services-grid"
            onClick={(e) => { e.preventDefault(); scrollToTarget('#services-grid', { offset: -60 }); }}
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '0.8rem 1.4rem',
              background: '#D4A0B0',
              border: '1px solid #D4A0B0',
              color: '#1A1416',
              borderRadius: '2px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              width: 'fit-content',
              boxShadow: '0 4px 14px rgba(212,160,176,0.16)',
              transition: 'background-color 0.25s, box-shadow 0.25s',
            }}
          >
            Book a Service
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}>
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

          {/* Scroll cue — quietly says "there's more below". The hero fills the
              whole screen on a phone, so without it the fold reads as the end. */}
          <button
            type="button"
            onClick={handleScrollDown}
            aria-label="Scroll to services"
            style={{
              pointerEvents: 'auto',
              alignSelf: 'center',
              marginTop: '1.35rem',
              background: 'none',
              border: 'none',
              padding: '6px',
              lineHeight: 0,
              cursor: 'pointer',
              animation: 'scrollCueBob 2.1s ease-in-out infinite',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <polyline points="6 9 12 15 18 9" />
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

          {/* Location & travel */}
          <p className="mb-5" style={{ fontSize: '1rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)' }}>
            Bay Area, California &nbsp;·&nbsp; Traveling Artist
          </p>

          <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.12)', marginBottom: '1.5rem' }} />

          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, maxWidth: '500px', marginBottom: '1.5rem' }}>
            Every service is crafted for you, from your everyday glow to your wedding day. Roqia works with a limited number of clients to ensure the highest level of care.
          </p>

          {/* Solid to match mobile — same button, same weight, both breakpoints. */}
          <a
            href="#services-grid"
            className="group"
            onClick={(e) => { e.preventDefault(); scrollToTarget('#services-grid', { offset: -60 }); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              fontWeight: 600,
              color: '#1A1416', background: '#D4A0B0', border: '1px solid #D4A0B0',
              padding: '1rem 2rem', width: 'fit-content',
              transition: 'background-color 0.25s, border-color 0.25s, box-shadow 0.25s',
              borderRadius: '2px',
              boxShadow: '0 10px 30px rgba(212,160,176,0.22)',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E0B4C2'; e.currentTarget.style.borderColor = '#E0B4C2'; e.currentTarget.style.boxShadow = '0 14px 38px rgba(212,160,176,0.34)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#D4A0B0'; e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(212,160,176,0.22)'; }}
          >
            Book a Service
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
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

        {/* RIGHT PANEL — video (poster-first, same as mobile) */}
        <div className="relative w-[50%] flex-1 overflow-hidden" style={{ minHeight: '300px', zIndex: 1 }}>
          {/* 0ms blurred paint, zero network */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${LQIP})`, backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'saturate(0.3) brightness(0.7) contrast(1.15)',
          }} />
          <video
            ref={desktopVideoRef}
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              filter: 'saturate(0.3) brightness(0.7) contrast(1.15)',
              opacity: desktopReady && !desktopVideoFailed ? 1 : 0,
              transition: 'opacity 0.7s ease',
            }}
            onError={() => setDesktopVideoFailed(true)}
          />
          {/* Crisp still, covers the video until it is truly playing, then crossfades out */}
          <img src={POSTER_URL} alt="" aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            filter: 'saturate(0.3) brightness(0.7) contrast(1.15)',
            opacity: desktopReady ? 0 : 1, transition: 'opacity 0.7s ease', pointerEvents: 'none',
          }} />
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