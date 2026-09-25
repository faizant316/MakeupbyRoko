// One place for the words and dates the service cards, the detail sheet and the
// "help me choose" flow all need to agree on.
//
// Before this, each card invented its own button verb ("Inquire About Bridal",
// "Select & Book", "View Available Classes") and the earliest bookable date was
// only ever shown INSIDE step 1 of the booking sheet. A visitor who needed
// makeup this weekend had to tap through two screens to find out the answer was
// no. Both now come from here.

import { BRIDAL_LEAD_DAYS, NON_BRIDAL_LEAD_DAYS, LEAD_LABEL, leadDate } from './bookingLeadTime';
import { TRAVEL_HOUR_MINUTES, FAR_TRAVEL_MINUTES, FAR_TRAVEL_FEE } from './travel';
import { STUDIO_TOWN } from './studio';
import { AVAILABLE_DAYS } from '@/components/BookingCalendar';

// One verb for the whole page. Every path starts at the same calendar, so every
// card says the same thing and nothing reads as a gate.
export const BOOK_LABEL = 'Book Now';
export const CLASS_LABEL = 'Book a Class';

export function ctaLabel(svc) {
  return svc?.category === 'lessons' ? CLASS_LABEL : BOOK_LABEL;
}

// Who each service is actually for, in one line. The three bridal options in
// particular are not self-explanatory to a first-time bride, which is the whole
// reason BridalComparison had to exist.
const BEST_FOR = {
  'Luxury Bridal Look': 'Best for the bride on her wedding day',
  // Distance moved out to travelFit below, where it gets its own line on the
  // card. That left room here for the other two triggers that also force a Full
  // Day (see the "When Full Day is required" rows in BridalComparison).
  'Full Day Service':   'Best for early starts, far venues, or one extra look or face',
  'Bridal Trial':       'Best for testing your look 1 to 3 months ahead',
  'Non-Bridal Makeup':  'Best for parties, birthdays, graduations, a night out',
  'Photoshoot Makeup':  'Best for editorial, content days and portraits',
  'Makeup Courses':     'Best for learning to do it yourself, one on one',
};

export function bestFor(svc) {
  return BEST_FOR[svc?.title] || '';
}

// Where the appointment happens, said on the card itself.
//
// Two questions wear the same shape here, so they share one line rather than
// two treatments. For the wedding-day packages it is "how far away are you
// getting ready", because that is the only thing separating Luxury from Full
// Day. For everything else it is "where is this held", because the answer is
// always the studio and the card never said so.
//
// Luxury and Full Day sit side by side on the services grid, and the only
// question that separates them for most brides is how far the venue is. That
// answer used to live one click deep (the comparison table) or one form deep
// (the measured gate in the booking flow), so a bride two hours out picked the
// wrong package on the grid and got corrected at checkout.
//
// Both cards carry a line, not just Full Day: a bride twenty minutes away needs
// to be told she is in the right place just as much as one three hours out.
//
// The trial is studio only and always has been (BridalInquiryForm skips the
// location question for it entirely and stamps the studio), but nothing on the
// card said so, so a bride found out at step 2 of the form. Non-bridal and
// photoshoots already carried a studio note as small print at the bottom of
// their card; putting them all through here is what makes it a stated fact
// rather than a footnote.
//
// The hour and the town are read from the constants that enforce the rule
// rather than retyped, so this copy cannot drift away from what the gate does.
const HOUR_LABEL = TRAVEL_HOUR_MINUTES === 60 ? 'an hour' : `${TRAVEL_HOUR_MINUTES} minutes`;

const PLACE = {
  'Luxury Bridal Look': { label: 'Getting ready', value: `Within ${HOUR_LABEL} of ${STUDIO_TOWN}` },
  'Full Day Service':   { label: 'Getting ready', value: `Over ${HOUR_LABEL} from ${STUDIO_TOWN}` },
  'Bridal Trial':       { label: 'Where',         value: `Studio only, ${STUDIO_TOWN}` },
  'Non-Bridal Makeup':  { label: 'Where',         value: `Studio only, ${STUDIO_TOWN}` },
  'Photoshoot Makeup':  { label: 'Where',         value: `Studio only, ${STUDIO_TOWN}` },
};

/** { label, value } for the card's location line, or null if the service has none. */
export function placeLine(svc) {
  return PLACE[svc?.title] || null;
}

// The two or three facts that actually decide something, shown on the card as
// chips rather than as a shortened ingredient list.
//
// The Luxury card leads with the finished result and personalization rather
// than consultation and travel logistics. Those details still live in the
// inclusions and detail sheet, but they are not the reasons someone wants the
// package in the first place.
// Roko's note (2026-09-09) was that the card should carry what people phone her
// about before booking: whether the bridesmaids can be added, whether travel
// costs extra, whether a second look is included. Those are the differences
// between the packages, so those are what the card says.
//
// Bridal party add-ons became Full Day only on 2026-09-09. On 2026-09-24 Roko
// capped them at ONE person and made that one person an alternative to the
// touch-up and the look change rather than an extra alongside them, so the chip
// says "any one extra" instead of naming the three: a chip that lists them all
// reads as getting them all. They are absent from Luxury rather than negated
// there, because a card is not the place to list what a package can't do.
//
// Short enough to sit on one line as a chip at any width. Anything needing a
// sentence belongs in the detail sheet, which the card body already opens.
const FAR_LABEL = FAR_TRAVEL_MINUTES % 60 === 0
  ? `${FAR_TRAVEL_MINUTES / 60} hrs`
  : `${FAR_TRAVEL_MINUTES} min`;

// ── The full-day rate ────────────────────────────────────────────────────────
//
// The four things that put a bridal booking at the full-day rate, in Roko's own
// words (2026-09-24). She wrote this block herself and asked for it kept as she
// sent it, so the wording below is hers. Three things changed and nothing else:
//
//   1. The em dash after the title is a colon. House style, not her call.
//   2. "one hour or more from my location" names the studio and its town. The
//      gate measures real drive time from a real address, and "my location"
//      tells a bride nothing she can act on.
//   3. The far-travel line at the bottom is added. Her travel item says "one
//      hour or more, the full-day rate applies", which a bride three hours out
//      reads as the flat rate when she actually owes that plus the far-travel
//      charge.
//
// Before this the same rule was stated four ways: the comparison table, two FAQ
// answers and the Full Day description in the services table, each with its own
// phrasing and its own list of triggers, and they had already drifted (the
// table sold a second look and bridesmaid add-ons as two separate triggers,
// which they no longer are: they are one choice). One source now, four readers.
// The FAQ prints the block whole, the comparison table's rows are the `short`
// labels, the Full Day card's chips are drawn from it, and the inquiry form
// offers the two `choice` items as its radio.
export const FULL_DAY_RATE = '$1,700';

// The rate once the far-travel charge lands. Stated rather than computed
// because both halves are display strings; if either moves, move this too.
export const FULL_DAY_RATE_FAR = '$2,450';

export const FULL_DAY_RATE_RULE = [
  {
    // The first two items are the ones a bride CHOOSES between, which is what
    // `choice` marks. The last two have none: an early start and a long drive
    // are facts about her day, not options she picks.
    choice: 'touchup',
    short: 'Touch-up or glam switch',
    title: 'Bride + Touch-Up or Glam Switch',
    detail: 'Includes bridal makeup plus one touch-up session or one makeup look change.',
  },
  {
    choice: 'person',
    short: 'One extra non-bridal face',
    title: 'Bride + One Non-Bridal Glam',
    detail: 'Includes bridal makeup plus makeup for one additional non-bridal client.',
  },
  {
    short: 'Start before 7:00 AM',
    title: 'Bridal Appointments Before 7:00 AM',
    detail: 'Any bridal booking that requires a start time before 7:00 AM is booked at the full-day rate.',
  },
  {
    short: `Venue ${HOUR_LABEL} or more out`,
    title: 'Travel of One Hour or More',
    detail: `If the bridal location is ${HOUR_LABEL} or more from the studio in ${STUDIO_TOWN}, the full-day rate applies.`,
  },
];

/** The two things a bride picks between on a full day. Drives the form's radio. */
export const FULL_DAY_CHOICES = FULL_DAY_RATE_RULE.filter(i => i.choice);

// What each choice is written down as, on the booking record Roko reads and in
// the confirmation. The touch-up wording says "no extra person" outright: Roko
// plans her morning around how many faces she has, so the record has to answer
// that question even when the bride picked something else.
export const FULL_DAY_EXTRA_RECORD = {
  touchup: 'One touch-up or look change (no extra person)',
  person: 'Makeup for one additional non-bridal client',
};

/**
 * Roko's block, printed the way she wrote it.
 *
 * Rendered wherever the surrounding copy keeps line breaks: the FAQ answer and
 * the detail sheet both set `whitespace-pre-line`, so the four titles stay
 * titles and their detail lines stay indented underneath.
 */
export function fullDayRateBlock(price = FULL_DAY_RATE) {
  const items = FULL_DAY_RATE_RULE.map(i => `${i.title}\n    ${i.detail}`).join('\n');
  return [
    `Full-Day Bridal Rate: ${price}`,
    '',
    `The ${price} full-day rate applies when any one of the following applies to your booking:`,
    '',
    items,
    '',
    `Where the venue is ${FAR_LABEL} or more from the studio, a flat ${FAR_TRAVEL_FEE} is added for the hotel the night before and the drive, making the booking ${FULL_DAY_RATE_FAR}.`,
  ].join('\n');
}

const CARD_FACTS = {
  'Luxury Bridal Look': ['Full bridal makeup + lashes', 'Customized to your wedding aesthetic', 'Long-wear finish'],
  'Full Day Service':   ['Bride + any one extra', `Travel included within ${FAR_LABEL}`, 'Covers starts before 7 AM'],
  'Bridal Trial':       ['Full trial look', 'Book 1 to 3 months ahead'],
  'Non-Bridal Makeup':  ['Lashes included', 'Long-wear finish'],
  'Photoshoot Makeup':  ['Built for camera', 'HD foundation'],
};

/** Short decisive facts for the card's chip row. Never empty for a real service. */
export function cardFacts(svc) {
  const facts = CARD_FACTS[svc?.title];
  if (facts?.length) return facts;
  // A service Roko adds later still gets chips rather than a hole in the card.
  return (svc?.includes || []).slice(0, 2).map(s => s.split(/[,(]/)[0].trim()).filter(Boolean);
}


// How far out this service can be booked, and what the calendar will call it.
export function leadDaysFor(svc) {
  return svc?.category === 'bridal' ? BRIDAL_LEAD_DAYS : NON_BRIDAL_LEAD_DAYS;
}

export function leadLabelFor(svc) {
  return LEAD_LABEL[leadDaysFor(svc)] || `${leadDaysFor(svc)} days`;
}

/**
 * The earliest date this service's own calendar will actually let someone pick.
 * Same lead window the picker uses, then skipped forward past Roko's closed
 * weekdays for anything that isn't bridal (a wedding lands on whatever day it
 * lands on, so bridal can pick Mon/Thu — see BookingCalendar's allowClosedDays).
 *
 * Deliberately NOT a promise that the day is free: blocked days and full days
 * live in the database and only the picker knows them. The copy says "earliest
 * date", which is exactly what this is.
 */
export function earliestDate(svc) {
  const d = leadDate(leadDaysFor(svc));
  if (svc?.category !== 'bridal') {
    let guard = 0;
    while (!AVAILABLE_DAYS.includes(d.getDay()) && guard < 14) { d.setDate(d.getDate() + 1); guard += 1; }
  }
  return d;
}

export function earliestDateLabel(svc) {
  return earliestDate(svc).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Classes run on Wednesdays and are priced/scheduled from the class catalog, so
// a lead-time chip would be wrong for them.
export function showsEarliestDate(svc) {
  return svc?.category !== 'lessons';
}
