let instance = null;

export function setLenis(l) { instance = l; }
export function lenisStop()  { instance?.stop(); }
export function lenisStart() { instance?.start(); }
// Scroll Lenis to a target (Lenis owns the scroll position site-wide, so a
// plain window.scrollTo won't move it). Pass { immediate: true } to jump.
export function lenisScrollTo(target, opts) { instance?.scrollTo(target, opts); }
