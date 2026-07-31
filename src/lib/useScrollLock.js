"use client";
import { useEffect, useLayoutEffect } from "react";
import { lenisStop, lenisStart, lenisResize, lenisScrollTo } from "@/lib/lenis";

// useLayoutEffect is the right hook for "put the page back before the browser
// paints", but React warns about it during SSR. Same hook, no warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Reliably locks the page behind a modal so the background never scrolls, then
// restores the exact scroll position (and Lenis state) when the last overlay
// closes.
//
// Why position:fixed and not overflow:hidden — iOS Safari ignores overflow on
// <body>, and the page-level Lenis keeps driving scroll via its RAF loop even
// when the body can't scroll natively. Pinning the body with position:fixed
// (capturing + restoring scrollY) is the only cross-browser reliable lock, and
// we stop Lenis on top of it so its loop doesn't fight the lock.
//
// Why a shared reference count — sheets stack (a service preview opens the
// booking sheet on top of itself). If each overlay locked/unlocked the body
// independently, the inner one closing would restart Lenis while the outer is
// still open, and the two would race over the scroll position. A single counter
// means the body is pinned on the FIRST lock and only restored on the LAST
// unlock, so nested overlays are seamless.

let lockCount = 0;
let savedScrollY = 0;

// Is the page currently pinned behind an overlay?
//
// Anything that reads window.scrollY on a scroll event has to know this. While
// the body is position:fixed the document is genuinely scrolled to 0, so the
// browser fires a scroll event reporting 0 — and every scroll-driven effect on
// the page (the hero's parallax fade, most of all) recomputes itself as though
// the visitor had jumped back to the top. The hero would go back to full opacity
// behind the overlay, and closing it flashed that near-black hero for a frame
// before the restore landed. Scroll-driven work simply freezes while locked.
export function isScrollLocked() { return lockCount > 0 || freezeCount > 0; }

// The mobile menu pins the body itself rather than through lockScroll (it has
// its own restore, which has to land on a nav target rather than the saved
// position). It still needs scroll-driven effects frozen for exactly the same
// reason, so it flags that separately. Kept out of lockCount on purpose: that
// counter decides whether the body is pinned, and a menu that pins it its own
// way must not make the next real lockScroll() think the work is already done.
let freezeCount = 0;
export function freezeScrollEffects() { freezeCount += 1; }
export function unfreezeScrollEffects() { freezeCount = Math.max(0, freezeCount - 1); }

export function lockScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${savedScrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';
    lenisStop();
  }
  lockCount += 1;
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;

  const { style } = document.body;
  // Kill the global `scroll-behavior: smooth` for this one jump so the restore
  // is instant, not a visible animated scroll back down.
  document.documentElement.style.scrollBehavior = 'auto';
  style.position = '';
  style.top = '';
  style.left = '';
  style.right = '';
  style.width = '';
  style.overflow = '';
  window.scrollTo(0, savedScrollY);
  lenisStart();
  // The body is back in normal flow now, so this makes Lenis re-measure the real
  // page height and resync its internal offset to the restored scroll position.
  // This is what prevents the snap-to-top: without it Lenis still thinks the
  // scrollable limit is ~0 (measured while the body was pinned) and clamps the
  // next scroll to the hero.
  lenisResize();
  // ...and hand Lenis the position THROUGH Lenis, not just to the window. While
  // the body was pinned the document really was at 0, so Lenis's own internal
  // offset tracked to 0 as well. Restarting it with a stale 0 meant its very next
  // frame wrote the page back to the top, the hero appeared, and the native
  // scroll event then yanked it back down — a single black frame on the way out
  // of a service card. This is the same pairing the mobile menu already does.
  lenisScrollTo(savedScrollY, { immediate: true });
  requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
}

// Layout effect, not effect: on close, React runs passive cleanup AFTER the
// browser has had a chance to paint the frame in which the overlay is already
// gone. Restoring in the layout phase means the page is back where it belongs in
// the same commit that removes the overlay, so there is never a frame showing
// the unlocked-but-not-yet-restored page.
export function useScrollLock() {
  useIsoLayoutEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Site nav hiding, for full-screen sheets.
//
// The public nav is fixed at z-9999, ABOVE the booking sheets (z-500), so the
// sheets used to offset themselves by --nav-h and leave a black "MAKEUP BY ROKO"
// bar sitting on top of the flow. Inside a sheet that already has its own back
// and close buttons that bar does nothing but eat 52px of height, which on a
// phone is roughly a whole calendar row. Hide it while a sheet is open.
//
// Ref-counted for the same reason the scroll lock is: sheets stack (a service
// preview can open the booking sheet over itself), and the inner one closing
// must not bring the nav back while the outer is still covering the screen.

let navHideCount = 0;

export function hideSiteNav() {
  if (navHideCount === 0) document.body.classList.add('site-nav-hidden');
  navHideCount += 1;
}

export function showSiteNav() {
  navHideCount = Math.max(0, navHideCount - 1);
  if (navHideCount === 0) document.body.classList.remove('site-nav-hidden');
}

export function useHideSiteNav() {
  useIsoLayoutEffect(() => {
    hideSiteNav();
    return () => showSiteNav();
  }, []);
}
