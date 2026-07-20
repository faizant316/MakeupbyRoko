"use client";
import { useEffect } from "react";
import Lenis from "lenis";

// Gives a modal's internal scroll container the same buttery wheel scrolling as
// the main page. The page-level Lenis is stopped while a modal is open, so these
// overlays would otherwise fall back to plain native scrolling. We attach a
// dedicated Lenis instance scoped to the scroll element instead.
//
// Touch stays native (syncTouch is off), so mobile keeps its momentum scrolling
// and any custom swipe handlers untouched — only the desktop wheel is smoothed.
//
// Pass a ref to the scrollable element (the one with overflow-y:auto). The
// instance is stashed on the element as `__modalLenis` so callers can scroll it
// programmatically via scrollModalTop without the RAF loop fighting the reset.
export function useModalLenis(ref) {
  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;

    // Reduced motion: skip Lenis but keep native scrolling alive. The stopped
    // page Lenis preventDefaults wheel events outside its prevent zones, so flag
    // this subtree to be ignored by it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrapper.setAttribute("data-lenis-prevent", "");
      return () => wrapper.removeAttribute("data-lenis-prevent");
    }

    // lerp-based (see SmoothScroll for the why): duration-based smoothing feels
    // laggy under a Mac trackpad's high-frequency wheel deltas, which is exactly
    // the "choppy when scrolling inside the form" complaint. Damping toward a
    // moving target keeps the modal's inner scroll responsive on the trackpad.
    const lenis = new Lenis({
      wrapper,
      content: wrapper.firstElementChild || wrapper,
      lerp: 0.1,
      smoothWheel: true,
      overscroll: false,
    });
    wrapper.__modalLenis = lenis;

    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      delete wrapper.__modalLenis;
      lenis.destroy();
    };
  }, [ref]);
}

// Jump a modal scroll container (or any element) to the top, respecting an
// attached modal-Lenis instance so its RAF loop doesn't immediately undo it.
export function scrollModalTop(el) {
  if (!el) return;
  if (el.__modalLenis) el.__modalLenis.scrollTo(0, { immediate: true });
  else el.scrollTop = 0;
}

// Smooth-scroll a modal scroll container to one of its descendants. Same Lenis
// caveat as scrollModalTop: scrollIntoView would scroll the element but the RAF
// loop would immediately snap it back, so go through the instance when there is
// one. `offset` leaves breathing room above the target (negative = higher up).
export function scrollModalToEl(container, target, offset = -16) {
  if (!container || !target) return;
  if (container.__modalLenis) {
    container.__modalLenis.scrollTo(target, { offset, duration: 0.7 });
    return;
  }
  const top = target.getBoundingClientRect().top
    - container.getBoundingClientRect().top
    + container.scrollTop
    + offset;
  container.scrollTo({ top, behavior: 'smooth' });
}
