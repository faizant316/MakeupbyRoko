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
