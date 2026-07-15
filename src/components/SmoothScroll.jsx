"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { setLenis } from "@/lib/lenis";

// How tightly the page tracks your input. Lower = more glide (silky, weighty).
// Higher = snappier, settles almost instantly (reads as "native").
const MOUSE_LERP = 0.1; // desktop mouse wheel: keep the smooth, premium feel
const TRACKPAD_LERP = 0.6; // Mac/precision trackpad: mostly native, only a whisper of smoothing

// Tell a trackpad apart from a mouse wheel using the raw wheel event.
// - Mouse wheels emit chunky, discrete deltas: line/page mode (deltaMode !== 0),
//   or pixel-mode wheelDeltaY in multiples of 120.
// - Trackpads emit a stream of tiny, high-resolution pixel deltas; Chrome/Safari
//   report wheelDeltaY === -3 * deltaY for them. Small magnitudes fall back to trackpad.
function isTrackpad(e) {
  if (e.deltaMode !== 0) return false; // line/page mode is always a real wheel
  const wdy = e.wheelDeltaY;
  if (typeof wdy === "number" && wdy !== 0) {
    if (wdy === -3 * e.deltaY) return true; // trackpad signature
    if (wdy % 120 === 0) return false; // classic mouse-wheel notch
  }
  return Math.abs(e.deltaY) < 40; // small, fine deltas read as trackpad
}

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // lerp-based smoothing (NOT duration-based). A duration+easing config
    // restarts a fixed-length animation on every wheel event, which feels
    // buttery on a mouse wheel (few, chunky ticks) but floaty and laggy on a
    // Mac trackpad (a stream of tiny, high-frequency deltas). lerp damps toward
    // a moving target every frame, so the trackpad stays glued to your fingers
    // while the mouse wheel is still smooth.
    const lenis = new Lenis({
      lerp: MOUSE_LERP,
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false, // leave native momentum + swipe handlers alone on mobile
      touchMultiplier: 1.6,
    });
    setLenis(lenis);

    // Device-aware smoothing. Mac/precision trackpads already do their own OS-level
    // momentum, so Lenis's easing stacks on top and a tiny flick over-glides. Lenis
    // re-reads options.lerp on every wheel event, so we set a near-native lerp for
    // trackpad input and the silky lerp for a mouse wheel, per gesture. This capture-
    // phase listener runs before Lenis's own (bubble-phase) handler, so the value is
    // already updated by the time Lenis processes the same event.
    const tuneLerp = (e) => {
      lenis.options.lerp = isTrackpad(e) ? TRACKPAD_LERP : MOUSE_LERP;
    };
    window.addEventListener("wheel", tuneLerp, { capture: true, passive: true });

    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", tuneLerp, { capture: true });
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return null;
}
