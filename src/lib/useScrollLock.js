"use client";
import { useEffect } from "react";
import { lenisStop, lenisStart, lenisScrollTo } from "@/lib/lenis";

// Reliably locks the page behind a modal so the background never scrolls.
//
// overflow:hidden alone is not enough: iOS Safari ignores it on <body>, and the
// page-level Lenis instance keeps driving scroll via transforms even when the
// body can't scroll natively. position:fixed on the body (capturing + restoring
// scrollY) is the only cross-browser reliable lock, and we stop Lenis on top of
// it so its RAF loop doesn't fight the lock. This mirrors the proven lock in
// BookingModal so every overlay behaves the same.
export function useScrollLock() {
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';
    lenisStop();
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
      style.position = '';
      style.top = '';
      style.left = '';
      style.right = '';
      style.width = '';
      style.overflow = '';
      window.scrollTo(0, scrollY);
      lenisStart();
      // Resync Lenis to the restored position — otherwise its internal offset
      // (drifted to 0 while the body was fixed) makes the next wheel tick jump
      // the page back to the top.
      lenisScrollTo(scrollY, { immediate: true, force: true });
      requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
    };
  }, []);
}
