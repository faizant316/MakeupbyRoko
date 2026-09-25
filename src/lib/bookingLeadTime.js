// How far ahead each kind of booking has to be made.
//
// The rule comes from Roko directly (2026-07-28): she prioritises brides, so
// the near-term calendar stays open for them. Anything that is *not* a bride
// herself — a non-bridal appointment, or a bridal party added onto a wedding —
// needs a month of notice. A bride booking only herself keeps the short window,
// because turning away a bride is the exact outcome this rule exists to avoid.
//
// Lived in three hardcoded `+ 14`s before this (BookingModal, BridalInquiryForm
// and the class picker), which is how they were free to disagree. One source
// now, shared by the pickers and the API routes that accept the submission.

import { studioToday } from './studio';

// A bride booking herself. Unchanged at two weeks.
export const BRIDAL_LEAD_DAYS = 14;

// Non-bridal appointments. Inside this window the calendar belongs to brides.
export const NON_BRIDAL_LEAD_DAYS = 30;

// Bridal party add-ons had a window of their own here, 30 days, longer than the
// bride's own 14, because "how many need glam" was an uncapped free-text field
// and four extra chairs is a different day's work however far out it is booked.
//
// Roko capped the full day at ONE extra on 2026-09-24, so what is left is a
// single face on a day she has already reserved and already driven to. It rides
// the bride's own window now. PARTY_LEAD_DAYS, canAddParty() and the form's
// "must be booked at least one month in advance" notice are all deleted rather
// than left lying around for someone to re-gate the question with.

// What each window is called in client-facing copy, so the calendar note, the
// error the server returns and the form all say the same thing.
export const LEAD_LABEL = {
  [BRIDAL_LEAD_DAYS]: '2 weeks',
  [NON_BRIDAL_LEAD_DAYS]: '1 month',
};

/**
 * Midnight, `days` from `from`. The earliest date that satisfies the window.
 * Counted from the studio's day, not the runtime's — the browser is on Pacific
 * time and the server is on UTC, and after 5 PM Pacific those are two different
 * dates. See studioToday().
 */
export function leadDate(days, from = new Date()) {
  const d = studioToday(from);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Does `dateKey` ('YYYY-MM-DD') sit far enough out to satisfy `days`?
 * Parsed as local midnight so a date never slips a day across timezones.
 */
export function meetsLead(dateKey, days, from = new Date()) {
  if (!dateKey) return false;
  const picked = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(picked.getTime())) return false;
  return picked >= leadDate(days, from);
}

/** Whole days from today to `dateKey`, or null if there's no date yet. */
export function daysUntil(dateKey, from = new Date()) {
  if (!dateKey) return null;
  const picked = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(picked.getTime())) return null;
  return Math.round((picked - studioToday(from)) / 86400000);
}
