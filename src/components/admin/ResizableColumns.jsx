import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Draggable two-column layout for the Home tab (wide screens only). The calendar
// column's width is user-adjustable via a grab handle between the panels,
// remembered across visits. When there isn't room for two useful columns it
// collapses to a plain stacked layout — dragging never applies there.
const STORAGE_KEY = 'admin-home-split-w';
const DEFAULT_LEFT = 520;
const MIN_LEFT = 400;
const MAX_LEFT = 720;
// Below this the appointments column stops being able to show a row properly,
// so there is no point splitting at all.
const MIN_RIGHT = 380;

// Everything below measures the CONTAINER, never the window.
//
// This used to split on `window.innerWidth >= 1280`, but these columns sit
// inside the admin content area, which is the window minus a 234px sidebar and
// its page padding — about 300px narrower. On a 1280px laptop that meant a split
// was declared with only ~982px to actually do it in, and a left width saved on
// a big external monitor (up to 720px) was restored as-is, leaving the
// appointments column squeezed to ~260px. Measuring the real container makes the
// decision and the clamp both honest at any screen size.
const MIN_SPLIT = MIN_LEFT + MIN_RIGHT;

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ResizableColumns({ left, right, darkMode: dm }) {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [containerW, setContainerW] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef(null);
  const widthRef = useRef(DEFAULT_LEFT);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (!Number.isNaN(saved)) {
      const clamped = Math.min(MAX_LEFT, Math.max(MIN_LEFT, saved));
      setLeftWidth(clamped);
      widthRef.current = clamped;
    }
  }, []);

  // Measured before the first paint, so a wide screen never flashes the stacked
  // layout on the way to the split one. The container's own width doesn't depend
  // on which layout is chosen (it's a full-width block either way), so there's no
  // feedback loop between the observer and the decision.
  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isDesktop = containerW >= MIN_SPLIT;
  // Never let the calendar grow past the point where the appointments column
  // stops working, whatever is in localStorage.
  const maxLeft = Math.min(MAX_LEFT, Math.max(MIN_LEFT, containerW - MIN_RIGHT));
  const effectiveLeft = Math.min(leftWidth, maxLeft);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = containerRef.current.getBoundingClientRect();
      const next = Math.min(maxLeft, Math.max(MIN_LEFT, clientX - rect.left));
      widthRef.current = next;
      setLeftWidth(next);
    };
    const onUp = () => {
      setDragging(false);
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, maxLeft]);

  const resetWidth = () => {
    setLeftWidth(DEFAULT_LEFT);
    widthRef.current = DEFAULT_LEFT;
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_LEFT));
  };

  // One ref on the outer element in BOTH layouts — it's what gets measured, so
  // it has to exist before we know which layout we're in.
  if (!isDesktop) {
    return (
      <div ref={containerRef}>
        {left}
        <div className="mt-2 mb-7 h-px" style={{ background: dm ? '#2e2e38' : '#ECECF1' }} />
        {right}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-stretch">
      <div style={{ width: effectiveLeft, flexShrink: 0 }} className="min-w-0">{left}</div>

      {/* Drag handle */}
      <div
        onPointerDown={(e) => { e.preventDefault(); setDragging(true); }}
        onDoubleClick={resetWidth}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize calendar and appointments columns. Double-click to reset."
        title="Drag to resize · double-click to reset"
        className="relative flex-shrink-0 self-stretch cursor-col-resize"
        style={{ width: 32, marginLeft: -8, marginRight: -8, touchAction: 'none' }}
      >
        <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-px transition-colors"
          style={{ background: (dragging || hovering) ? '#D4A0B0' : 'transparent' }} />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[5px] h-11 rounded-full transition-colors"
          style={{ background: (dragging || hovering) ? '#D4A0B0' : (dm ? '#34343d' : '#E5E7EB') }}
        />
      </div>

      <div className="flex-1 min-w-0">{right}</div>
    </div>
  );
}
