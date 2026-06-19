import { useRef, useState, useLayoutEffect } from 'react';

// Smoothly animates its content open/closed by measuring real pixel height.
// Pixel height (not grid-template-rows fr) keeps it from janking on iOS Safari,
// and the animation avoids the abrupt scroll jump a plain mount/unmount causes.
export default function Collapse({ open, children, duration = 320 }) {
  const innerRef = useRef(null);
  const mounted = useRef(false);
  const [height, setHeight] = useState(open ? 'auto' : 0);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    // Settle the first render instantly so a default-collapsed section
    // doesn't flash open before folding away.
    if (!mounted.current) {
      mounted.current = true;
      setHeight(open ? 'auto' : 0);
      return undefined;
    }
    let raf1, raf2, timer;
    if (open) {
      // 0 -> measured -> auto (so nested content can resize afterwards)
      setHeight(el.scrollHeight);
      timer = setTimeout(() => setHeight('auto'), duration);
    } else {
      // auto -> measured -> 0 (concrete start value so the transition runs)
      setHeight(el.scrollHeight);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setHeight(0));
      });
    }
    return () => { clearTimeout(timer); cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [open, duration]);

  return (
    <div
      style={{
        height: height === 'auto' ? 'auto' : `${height}px`,
        overflow: 'hidden',
        transition: `height ${duration}ms cubic-bezier(0.22,1,0.36,1)`,
        willChange: 'height',
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
