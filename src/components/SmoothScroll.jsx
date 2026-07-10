"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { setLenis } from "@/lib/lenis";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // lerp-based smoothing (NOT duration-based). A duration+easing config
    // restarts a fixed-length animation on every wheel event, which feels
    // buttery on a mouse wheel (few, chunky ticks) but floaty and laggy on a
    // Mac trackpad (a stream of tiny, high-frequency deltas — the target never
    // settles). lerp damps toward a moving target every frame, so the trackpad
    // stays glued to your fingers while the mouse wheel is still smooth.
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false, // leave native momentum + swipe handlers alone on mobile
      touchMultiplier: 1.6,
    });
    setLenis(lenis);

    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return null;
}
