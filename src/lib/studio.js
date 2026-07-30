// The in-person class location. The real street address lives here as the
// default and flows into the confirmation emails, the admin panel, and the
// maps link. NEXT_PUBLIC_STUDIO_ADDRESS in Vercel overrides it (takes effect
// on the next deploy) if the studio ever moves.
// Note: Mountain House addresses also resolve under the legacy USPS city
// "Tracy, CA" with the same 95391 ZIP; both point to the same door.

export const STUDIO_ADDRESS = process.env.NEXT_PUBLIC_STUDIO_ADDRESS || '1301 S Durant Terrace, Mountain House, CA 95391';
export const STUDIO_TOWN = 'Mountain House, CA';
export const STUDIO_DISPLAY = STUDIO_ADDRESS || `${STUDIO_TOWN} (exact address shared before your class)`;
export const STUDIO_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_ADDRESS || STUDIO_TOWN)}`;
// The readable label stored as a bridal booking's location when the bride
// chooses to get ready at the studio (instead of an on-location address). Shared
// so the form that stamps it and the email that reads it can never disagree:
// location === STUDIO_READY_VALUE is the single "no travel fee" signal.
export const STUDIO_READY_VALUE = `Roko's Studio (${STUDIO_TOWN})`;

// ── The studio's clock ──────────────────────────────────────────────────────
// "Today" has to mean the same day to the client's browser and to the server,
// and it did not: the browser is on Pacific time, Vercel runs on UTC, so from
// 5 PM Pacific onward the server had already rolled over to tomorrow. A client
// picking the earliest date the calendar offered was told it was a day too soon
// (reported 2026-07-29: a class on Aug 12, picked at 5:07 PM, bounced with
// "please pick a Wednesday at least two weeks out"). Every lead-time rule now
// counts from the day it is where Roko is, wherever the code happens to run.
export const STUDIO_TZ = 'America/Los_Angeles';

const STUDIO_DAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** 'YYYY-MM-DD' of whatever day it currently is at the studio. */
export function studioDayKey(at = new Date()) {
  return STUDIO_DAY_FMT.format(at);
}

/**
 * Midnight of the studio's current day. Built by parsing a date key, the same
 * way every stored date ('YYYY-MM-DD') is parsed, so the two are always
 * comparable no matter what timezone the runtime is in.
 */
export function studioToday(at = new Date()) {
  return new Date(`${studioDayKey(at)}T00:00:00`);
}
