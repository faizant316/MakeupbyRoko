import { STUDIO_READY_VALUE } from './studio';

// Pulling the city back out of a one-line address.
//
// Addresses reach us as a single formatted string from two different places:
// Google Places on the booking form ("2372 Cabrillo Dr, Hayward, CA 94545, USA")
// and the Booksy import, which we assemble ourselves from separate street/city/
// zip fields. Only the second one knows the city for certain, so this exists for
// the first: the appointments list shows a city chip, and re-deriving it on
// every render is both slower and less predictable than storing it once.

const COUNTRY = /^(usa|us|united states)$/i;
// "CA" or "CA 94545" — the state part, which is always directly after the city.
const STATE = /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/;

/**
 * Best guess at the city in a one-line address. Returns null rather than a
 * wrong guess: a blank chip is honest, a chip reading "CA 94545" is not.
 */
export function cityFromLocation(location) {
  if (!location || typeof location !== 'string') return null;

  // A label with the place in brackets: "Roko's Studio (Mountain House, CA)",
  // which is exactly how a studio-ready bridal booking is stored, and the shape
  // a venue pick can take too. Splitting the whole string on commas made the
  // last segment "CA)", which fails the state test and was then handed back as
  // the city — so every bride getting ready at the studio showed a chip reading
  // "CA)". Read what's inside the brackets instead; that IS the address part.
  const bracketed = location.match(/\(([^()]+)\)\s*$/);
  if (bracketed) return cityFromLocation(bracketed[1]);

  const parts = location.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // Drop a trailing country so it can't be mistaken for the city.
  const trimmed = parts[parts.length - 1] && COUNTRY.test(parts[parts.length - 1])
    ? parts.slice(0, -1)
    : parts;
  if (trimmed.length < 2) return null;

  // The city is whatever sits immediately before the state.
  const stateAt = trimmed.findIndex(p => STATE.test(p));
  if (stateAt > 0) return trimmed[stateAt - 1];

  // No state in the string (common with venue-name picks). The last segment is
  // then usually the city, e.g. "Mission Paradise Banquet Hall, Hayward".
  return trimmed[trimmed.length - 1] || null;
}

/** Assemble Booksy's separate address fields into one displayable line. */
export function formatAddress({ street, apt, city, zip, state = 'CA' } = {}) {
  const line1 = [street, apt].filter(Boolean).join(' ').trim();
  const line2 = [city, [state, zip].filter(Boolean).join(' ').trim()].filter(Boolean).join(', ');
  return [line1, line2].filter(Boolean).join(', ') || null;
}

/** True when a stored location is Roko's own studio, not a client's address. */
export function isStudioLocation(location) {
  return String(location || '').trim() === STUDIO_READY_VALUE;
}

/**
 * A place as it should read in a list.
 *
 * Two things get in the way of just printing `booking.location`. Google Places
 * appends ", USA" to everything it returns, which is noise in a list of Bay
 * Area addresses. And a bride getting ready at the studio is stored under the
 * full label "Roko's Studio (Mountain House, CA)", which is the right value to
 * store (it is the single no-travel-fee signal) and the wrong thing to print in
 * a row about where Roko is going.
 */
export function displayLocation(location) {
  const s = String(location || '').trim();
  if (!s) return '';
  if (isStudioLocation(s)) return "Roko's Studio";
  return s.replace(/,\s*(USA|US|United States)\.?\s*$/i, '').trim();
}
