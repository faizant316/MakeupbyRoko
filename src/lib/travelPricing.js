// How a travel appointment is priced, worded once so every surface agrees.
//
// This used to be written as "$750+" in six places, plus "bridal pricing" as
// the explanation. Both confused people, for the same reason: a bare "+" does
// not say what it is adding, and a non-bridal client booking a baby shower has
// no idea why she is being quoted bridal anything. "From $750" says the one
// thing the "+" was trying to: this is where it starts, the final figure
// depends on the drive, and Roko names it.
export const TRAVEL_FROM = 750;

// The price itself, wherever a figure is shown.
export const TRAVEL_PRICE = `From $${TRAVEL_FROM}`;

// What the line is called. Not "bridal pricing" — it is the travel rate, which
// happens to be the same rate as the bridal work.
export const TRAVEL_LABEL = 'Travel appointment';

// The sentence that explains it. One place, so the booking form, the emails and
// the agreement can never drift into saying three different things.
export const TRAVEL_EXPLAINER =
  `On-location appointments start at $${TRAVEL_FROM}, whatever the service, and the final amount depends on how far Roko is driving. She confirms the exact figure once she has your address.`;

// Stamped into a booking's notes so the admin card and the confirmation route
// can tell a travel booking apart. Must keep the word "travel" in it: several
// guards match /travel/i on this string, including the one that stops the
// confirmed email quoting a studio price to someone Roko is driving to.
export const TRAVEL_NOTE = `✈️ ${TRAVEL_LABEL} · from $${TRAVEL_FROM}`;
