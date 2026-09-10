// The hour rule: how far Roko will travel before the booking becomes a Full Day.
//
// The rule itself is old and written all over the site (the FAQs, the service
// descriptions, the contract): a venue more than an hour from the studio is a
// Full Day Service, not a Luxury Bridal Look with a bigger travel fee. What did
// not exist until now was any way to *check* it. The venue field stored the
// words a bride typed and nothing else, so the rule was enforced by asking her
// to estimate her own drive time and then volunteer to pay $950 more. On
// 2026-09-04 a bride booked the Luxury Bridal Look for a venue two hours out,
// which is what that arrangement was always going to produce eventually.
//
// The site now measures the drive (see app/api/travel-distance/route.js) and
// these constants decide what it does with the answer.

// What every piece of client-facing copy says the limit is. Changing this means
// changing the FAQs, the service records and the contract to match, so it is
// deliberately separate from the number the gate actually fires on.
export const TRAVEL_HOUR_MINUTES = 60;

// Where the gate actually fires. The five minutes of slack are Roko's call
// (2026-09-05): drive times are estimates, and pushing a 61-minute venue into a
// $1,700 package over a rounding difference is worse than absorbing it. Between
// 60 and 65 the bride keeps the Luxury Bridal Look and the flat travel fee.
export const TRAVEL_GATE_MINUTES = 65;

// The flat on-location fee for anything inside the rule. Quoted in the form, the
// confirmation email and the contract, so it lives here rather than in each.
export const LOCAL_TRAVEL_FEE = '$200';

/**
 * The drive time as the bride is shown it: exact under an hour, nearest five
 * minutes above one. Google answers to the second, and repeating that back
 * ("1 hr 53 min") claims a confidence that traffic, her real departure and the
 * venue's actual gate all make untrue.
 *
 * Exported because the gate decides on this number rather than the raw one. If
 * it decided on the raw figure, a 63-minute venue and a 66-minute venue would
 * both read "1 hr 5 min" on screen while only one of them was gated, and there
 * would be no way for Roko to explain the difference to the bride who called.
 * The cost is that the gate effectively fires a couple of minutes later than
 * TRAVEL_GATE_MINUTES, which is well inside the slack that constant exists for.
 */
export function displayMinutes(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return null;
  return minutes < 60 ? Math.max(1, Math.round(minutes)) : Math.round(minutes / 5) * 5;
}

/**
 * Does a measured drive time force the Full Day Service?
 *
 * Returns false for a null/undefined measurement on purpose. "We could not work
 * out how far away this is" must never harden into "you cannot book": Google
 * fails on private estates, on venues with no listing, and whenever billing or
 * quota lapses. An unmeasurable venue falls back to the soft note the form has
 * always shown, and Roko settles it on the consultation call the way she does now.
 */
export function needsFullDay(minutes) {
  const shown = displayMinutes(minutes);
  return shown !== null && shown > TRAVEL_GATE_MINUTES;
}

/**
 * Does a Google-formatted address sit outside California?
 *
 * The hour rule is a local-travel rule. A destination wedding is quoted per trip
 * (flights, hotel, the add-on person) and the Full Day Service is not the answer
 * to it. The form asks "is this out of state?" further down the page than the
 * venue field, so for the moments in between this is the only thing that knows,
 * and without it a bride typing an Austin venue is told to book a Full Day.
 *
 * Answers false when it cannot tell. The safe default for the hour rule is to
 * treat an address as local, because being wrong that way shows her a gate she
 * can read and dismiss, rather than quietly letting a two-hour venue through.
 */
export function isOutsideCalifornia(formattedAddress) {
  if (!formattedAddress || typeof formattedAddress !== 'string') return false;
  return !/,\s*CA(\s+\d{5}(-\d{4})?)?\s*(,|$)/.test(formattedAddress);
}

/** A drive time a bride would say out loud: "20 min", "1 hr 5 min", "2 hr". */
export function formatDriveTime(minutes) {
  const shown = displayMinutes(minutes);
  if (shown === null) return null;
  if (shown < 60) return `${shown} min`;

  const hrs = Math.floor(shown / 60);
  const mins = shown % 60;
  return mins ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

// ── The two-hour rule ──────────────────────────────────────────────────────
//
// The hour rule above decides WHICH package a bride books. This one decides
// what that package costs. Past roughly two hours the Full Day stops being a
// drive and becomes an overnight: Roko books a hotel the night before so she
// can start on time, and the day costs her the travel there and back on top of
// the wedding itself. Until now the Full Day quoted "travel included" at any
// distance, so a San Diego wedding (about seven hours out) and one in Sacramento
// (about ninety minutes) were the same $1,700.
//
// Roko's decision, 2026-09-09: a flat $750 at any distance past two hours,
// covering the hotel, the transportation and the extra day. Flat rather than
// per-mile on purpose — she quotes it the same way she says it out loud, and a
// sliding scale would need a number nobody can defend for a seven-hour drive.

// What the copy says the limit is. See TRAVEL_HOUR_MINUTES for why the number
// in the sentence is kept apart from the number the gate fires on.
export const FAR_TRAVEL_MINUTES = 120;

// Where it actually fires. Same slack as TRAVEL_GATE_MINUTES, and for the same
// reason: drive times are estimates, and charging $750 more over a two-minute
// rounding difference is indefensible to the bride who phones about it.
//
// The gate decides on the DISPLAYED figure, which is rounded to five minutes,
// so in practice the fee starts around 2 hr 10 rather than exactly here. That
// is deliberate and identical to the hour rule: if it decided on the raw
// number, two venues both reading "2 hr 5 min" on screen could be charged
// differently, and Roko would have no way to explain the difference.
export const FAR_TRAVEL_GATE_MINUTES = 125;

// The flat surcharge. Quoted in the form, the confirmation email, the deposit
// page and the contract, so it lives here rather than being retyped in each.
export const FAR_TRAVEL_FEE = '$750';

/**
 * Does a measured drive time add the far-travel fee?
 *
 * Fails open exactly like needsFullDay: an unmeasurable venue is never charged
 * $750 on a guess. Roko settles those on the consultation call, which is what
 * she does today for every venue.
 */
export function needsFarTravelFee(minutes) {
  const shown = displayMinutes(minutes);
  return shown !== null && shown > FAR_TRAVEL_GATE_MINUTES;
}

/** "$1,700" + "$750" → "$2,450". Null when either side isn't one clean figure. */
export function addMoney(a, b) {
  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const x = num(a);
  const y = num(b);
  if (x === null || y === null) return null;
  return `$${(x + y).toLocaleString('en-US')}`;
}
