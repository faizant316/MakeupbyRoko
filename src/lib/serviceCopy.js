// One place for the words and dates the service cards, the detail sheet and the
// "help me choose" flow all need to agree on.
//
// Before this, each card invented its own button verb ("Inquire About Bridal",
// "Select & Book", "View Available Classes") and the earliest bookable date was
// only ever shown INSIDE step 1 of the booking sheet. A visitor who needed
// makeup this weekend had to tap through two screens to find out the answer was
// no. Both now come from here.

import { BRIDAL_LEAD_DAYS, NON_BRIDAL_LEAD_DAYS, LEAD_LABEL, leadDate } from './bookingLeadTime';
import { TRAVEL_HOUR_MINUTES } from './travel';
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
  'Full Day Service':   'Best for early starts, long days, or a second look',
  'Bridal Trial':       'Best for testing your look 1 to 3 months ahead',
  'Non-Bridal Makeup':  'Best for parties, birthdays, graduations, a night out',
  'Photoshoot Makeup':  'Best for editorial, content days and portraits',
  'Makeup Courses':     'Best for learning to do it yourself, one on one',
};

export function bestFor(svc) {
  return BEST_FOR[svc?.title] || '';
}

// Which package your drive time puts you in, said on the card itself.
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
// The hour and the town are read from the constants that enforce the rule
// rather than retyped, so this copy cannot drift away from what the gate does.
const HOUR_LABEL = TRAVEL_HOUR_MINUTES === 60 ? 'an hour' : `${TRAVEL_HOUR_MINUTES} minutes`;

const TRAVEL_FIT = {
  'Luxury Bridal Look': `Within ${HOUR_LABEL} of ${STUDIO_TOWN}`,
  'Full Day Service':   `Over ${HOUR_LABEL} from ${STUDIO_TOWN}`,
};

export function travelFit(svc) {
  return TRAVEL_FIT[svc?.title] || '';
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
