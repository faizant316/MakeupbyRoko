import { useEffect, useRef, useState } from 'react';

// Draggable two-column layout for the Home tab (desktop only). The calendar
// column's width is user-adjustable via a grab handle between the panels,
// remembered across visits. Below the desktop breakpoint it collapses to a
// plain stacked layout — dragging never applies on mobile/tablet.
const STORAGE_KEY = 'admin-home-split-w';
const DEFAULT_LEFT = 520;
const MIN_LEFT = 400;
const MAX_LEFT = 720;
const BREAKPOINT = 1280; // matches Tailwind's `xl`

export default function ResizableColumns({ left, right, darkMode: dm }) {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [isDesktop, setIsDesktop] = useState(false);
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

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = containerRef.current.getBoundingClientRect();
      const next = Math.min(MAX_LEFT, Math.max(MIN_LEFT, clientX - rect.left));
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
  }, [dragging]);

  const resetWidth = () => {
    setLeftWidth(DEFAULT_LEFT);
    widthRef.current = DEFAULT_LEFT;
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_LEFT));
  };

  if (!isDesktop) {
    return (
      <div>
        {left}
        <div className="mt-2 mb-7 h-px" style={{ background: dm ? '#2e2e38' : '#ECECF1' }} />
        {right}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-stretch">
      <div style={{ width: leftWidth, flexShrink: 0 }} className="min-w-0">{left}</div>

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
