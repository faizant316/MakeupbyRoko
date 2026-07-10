"use client";
import { useEffect } from "react";
import { lenisStop, lenisStart, lenisResize } from "@/lib/lenis";

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
  requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
}

export function useScrollLock() {
  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);
}
