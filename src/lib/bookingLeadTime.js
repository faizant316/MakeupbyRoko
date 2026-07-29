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

// A bride booking herself. Unchanged at two weeks.
export const BRIDAL_LEAD_DAYS = 14;

// Non-bridal appointments. Inside this window the calendar belongs to brides.
export const NON_BRIDAL_LEAD_DAYS = 30;

// Bridal party add-ons (bridesmaids, mother of the bride). More chairs means
// more hours and more product, which is not something she can absorb on short
// notice even when the bride herself is already on the books.
export const PARTY_LEAD_DAYS = 30;

// What each window is called in client-facing copy, so the calendar note, the
// error the server returns and the form all say the same thing.
export const LEAD_LABEL = {
  [BRIDAL_LEAD_DAYS]: '2 weeks',
  [NON_BRIDAL_LEAD_DAYS]: '1 month',
};

/** Midnight, `days` from `from`. The earliest date that satisfies the window. */
export function leadDate(days, from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
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

/**
 * Is this booking far enough out for the client to add a bridal party?
 * Inside the window the question is not asked at all, so a bride is never
 * shown a choice that would be taken away from her later.
 */
export function canAddParty(dateKey, from = new Date()) {
  return meetsLead(dateKey, PARTY_LEAD_DAYS, from);
}
