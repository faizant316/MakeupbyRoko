let instance = null;

export function setLenis(l) { instance = l; }
export function lenisStop()  { instance?.stop(); }
export function lenisStart() { instance?.start(); }
// Scroll Lenis to a target (Lenis owns the scroll position site-wide, so a
// plain window.scrollTo won't move it). Pass { immediate: true } to jump.
export function lenisScrollTo(target, opts) { instance?.scrollTo(target, opts); }
// Force Lenis to recompute its dimensions (scroll limit) and resync its internal
// offset to the real window scroll. Critical after a modal that pinned the body
// with position:fixed: while pinned, the page height collapses and Lenis's
// debounced ResizeObserver caches a scroll limit of ~0. Without a fresh resize
// on close, Lenis clamps any restore to that stale 0 and snaps back to the top.
export function lenisResize() { instance?.resize(); }

// Is page-level Lenis currently running? (It's off under prefers-reduced-motion.)
export function hasLenis() { return !!instance; }

// Scroll to a target that may be a pixel offset, a CSS selector, or an element —
// going THROUGH Lenis when it's active so its RAF loop doesn't undo the move, and
// falling back to the native scroller (honoring the page's scroll-behavior) when
// Lenis is off. `offset` shifts the landing point — pass a negative value to stop
// short of a fixed header. `immediate: true` jumps with no animation.
export function scrollToTarget(target, { immediate = false, offset = 0 } = {}) {
  if (instance) {
    instance.scrollTo(target, { immediate, offset });
    return;
  }
  let y = null;
  if (typeof target === 'number') {
    y = target + offset;
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el?.getBoundingClientRect) y = el.getBoundingClientRect().top + window.scrollY + offset;
  }
  if (y == null) return;
  y = Math.max(0, Math.round(y));
  if (immediate) {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    requestAnimationFrame(() => { html.style.scrollBehavior = prev; });
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}
