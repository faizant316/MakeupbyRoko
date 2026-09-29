'use client';
import { useEffect, useRef, useState } from 'react';

const clamp = (n) => Math.min(100, Math.max(0, n));

const Tag = ({ side, small, children }) => (
  <span
    className={`absolute pointer-events-none rounded-full font-semibold uppercase text-white ${small ? 'bottom-2 px-2 py-[3px] text-[0.5rem]' : 'bottom-3 px-2.5 py-1 text-[0.58rem]'}`}
    style={{ background: 'rgba(0,0,0,0.5)', letterSpacing: '0.12em', [side]: small ? 8 : 12 }}
  >
    {children}
  </span>
);

/**
 * Before/after compare built from two photos of the same size: the after photo
 * fills the frame and the before photo sits on top of it, clipped to the left of
 * a divider. Everything reads one CSS variable, --ba-pos (see .ba in index.css).
 *
 * The position is written straight onto the element's style, never into React
 * state, so dragging the divider re-renders nothing. Same reason the hero
 * parallax writes CSS variables instead of calling setState on every frame.
 *
 * Two modes:
 * - 'hover' (the gallery grid): a mouse moving across the photo drives the
 *   divider and it settles back to the middle on leave. Touch is ignored so a
 *   tap still opens the look.
 * - 'drag' (the viewer): a mouse can grab anywhere. A finger has to grab the
 *   handle, because everywhere else a sideways swipe belongs to the viewer and
 *   moves to the next look. The handle is also a keyboard slider.
 */
export default function CompareSlider({
  before,
  after,
  alt = '',
  mode = 'drag',
  small = false,
  peek = false,
  peekDelay = 0,
  focusable = true,
  loading = 'lazy',
  position = 'center 30%',
  onReady,
  className = '',
}) {
  const ref = useRef(null);
  const handleRef = useRef(null);
  const beforeImg = useRef(null);
  const afterImg = useRef(null);
  const posRef = useRef(50);
  const pendingRef = useRef(50);
  const rafRef = useRef(0);
  const dragRef = useRef(false);
  const peekedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const write = (pct) => {
    posRef.current = pct;
    ref.current?.style.setProperty('--ba-pos', `${pct}%`);
    handleRef.current?.setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  // At most one write per frame, however fast the pointer events arrive.
  const schedule = (pct) => {
    pendingRef.current = pct;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = 0; write(pendingRef.current); });
  };
  const fromClientX = (x) => {
    const r = ref.current.getBoundingClientRect();
    return clamp(((x - r.left) / r.width) * 100);
  };
  // Any real input wins over the peek, mid-animation or not.
  const takeOver = () => {
    peekedRef.current = true;
    ref.current?.classList.remove('ba-peek', 'ba-settle');
  };

  // Both photos have to be there before the gallery develops the frame in or
  // the peek plays. A cached photo can finish before onLoad is attached, so
  // check on mount as well. A broken photo counts as ready rather than leaving
  // the frame blurred forever.
  const checkLoaded = () => {
    const b = beforeImg.current, a = afterImg.current;
    if (b?.complete && a?.complete && b.naturalWidth && a.naturalWidth) setReady(true);
  };
  useEffect(checkLoaded, []);
  useEffect(() => { if (ready) onReady?.(); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!peek || !ready || peekedRef.current) return;
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el || peekedRef.current) return;
      peekedRef.current = true;
      el.classList.remove('ba-settle');
      write(50);
      el.classList.add('ba-peek');
    }, peekDelay);
    return () => clearTimeout(t);
  }, [peek, ready, peekDelay]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onPointerDown = (e) => {
    if (mode !== 'drag') return;
    const onHandle = !!e.target.closest('[data-ba-handle]');
    if (e.pointerType === 'mouse' ? e.button !== 0 : !onHandle) return;
    e.preventDefault();
    dragRef.current = true;
    ref.current.setPointerCapture?.(e.pointerId);
    takeOver();
    if (!onHandle) write(fromClientX(e.clientX));
  };
  const onPointerMove = (e) => {
    if (mode === 'hover') {
      if (e.pointerType !== 'mouse') return;
      takeOver();
      schedule(fromClientX(e.clientX));
      return;
    }
    if (dragRef.current) schedule(fromClientX(e.clientX));
  };
  const endDrag = (e) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    ref.current.releasePointerCapture?.(e.pointerId);
  };
  const onPointerLeave = (e) => {
    if (mode !== 'hover' || e.pointerType !== 'mouse') return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    ref.current.classList.add('ba-settle');
    write(50);
  };
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 20 : 5;
    const next = { ArrowLeft: posRef.current - step, ArrowRight: posRef.current + step, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    takeOver();
    ref.current.classList.add('ba-settle');
    write(clamp(next));
  };

  const drag = mode === 'drag';
  const knob = small ? 28 : 44;
  const imgProps = {
    loading,
    decoding: 'async',
    draggable: false,
    onLoad: checkLoaded,
    onError: () => setReady(true),
    className: 'absolute inset-0 w-full h-full object-cover',
    style: { objectPosition: position },
  };

  return (
    <div
      ref={ref}
      className={`ba relative overflow-hidden select-none ${className}`}
      style={{ cursor: drag ? 'ew-resize' : undefined, WebkitTouchCallout: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={onPointerLeave}
      onAnimationEnd={(e) => { if (e.animationName === 'baPeek') ref.current?.classList.remove('ba-peek'); }}
    >
      <img ref={afterImg} src={after} alt={`${alt}, after`} {...imgProps} />
      <Tag side="right" small={small}>After</Tag>

      {/* The before tag rides inside the clip, so the divider covers it along
          with the photo instead of leaving it floating over the after. */}
      <div className="ba-before absolute inset-0">
        <img ref={beforeImg} src={before} alt={`${alt}, before`} {...imgProps} />
        <Tag side="left" small={small}>Before</Tag>
      </div>

      <div className="ba-rail absolute inset-0 pointer-events-none">
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -ml-px bg-white" style={{ boxShadow: '0 0 10px rgba(0,0,0,0.35)' }} />
        {/* In drag mode this strip is the finger's grab zone: wider than the
            knob, full height, and touch-action none so the browser hands the
            gesture to us instead of scrolling the viewer. */}
        <div
          ref={handleRef}
          data-ba-handle
          role={drag ? 'slider' : undefined}
          tabIndex={drag && focusable ? 0 : -1}
          aria-label={drag ? 'Compare before and after' : undefined}
          aria-valuemin={drag ? 0 : undefined}
          aria-valuemax={drag ? 100 : undefined}
          aria-valuenow={drag ? 50 : undefined}
          aria-hidden={drag ? undefined : true}
          onKeyDown={drag ? onKeyDown : undefined}
          className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center outline-none ${drag ? 'pointer-events-auto' : ''}`}
          style={{ width: drag ? 56 : knob, touchAction: 'none' }}
        >
          <span
            className="rounded-full bg-white flex items-center justify-center"
            style={{ width: knob, height: knob, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              width={small ? 13 : 18} height={small ? 13 : 18} aria-hidden="true">
              <polyline points="9 7 4 12 9 17" />
              <polyline points="15 7 20 12 15 17" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
