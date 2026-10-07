// Warm a lazily loaded chunk once the page has finished loading and the main
// thread is idle.
//
// The homepage splits everything a visitor only sees after a tap (the booking
// sheets, the service detail sheet, the gallery and review viewers, the footer
// policy popups) out of its first load, so a phone can show the hero without
// first downloading and parsing the whole checkout. This is the other half of
// that deal: by the time anyone taps, the chunk is already here, so the first
// open is as instant as it was when everything shipped up front.
//
// Call it at module level next to the matching next/dynamic, with the SAME
// import path, so webpack resolves both to one chunk. No-op on the server.
export function prefetchWhenIdle(load) {
  if (typeof window === 'undefined') return;
  const go = () => { load().catch(() => {}); };
  const afterLoad = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 });
    else setTimeout(go, 1500);
  };
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
}
