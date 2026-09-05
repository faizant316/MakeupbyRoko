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
  'Full Day Service':   'Best for early starts, long days, or travel over an hour',
  'Bridal Trial':       'Best for testing your look 1 to 3 months ahead',
  'Non-Bridal Makeup':  'Best for parties, birthdays, graduations, a night out',
  'Photoshoot Makeup':  'Best for editorial, content days and portraits',
  'Makeup Courses':     'Best for learning to do it yourself, one on one',
};

export function bestFor(svc) {
  return BEST_FOR[svc?.title] || '';
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
