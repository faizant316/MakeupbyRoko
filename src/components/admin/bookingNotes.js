// Small readers over the packed `notes` string, shared by the client card and
// the list rows. Its own module so a row doesn't have to pull in the whole
// BookingDetail bundle (confetti and all) just to read one field.

// What the appointment is for: "Engagement", "Baby shower", "Henna / Mehndi".
// Written by the public booking form as a "| Event: X" segment. Empty for
// bridal (a wedding is its own answer) and for everything booked before this
// question existed.
export function bookingOccasion(notes) {
  const m = String(notes || '').match(/(?:^|\|)\s*Event:\s*([^|]+)/i);
  return m ? m[1].trim() : '';
}

// A row that came in through a bulk Booksy migration rather than being added by
// hand. Both import scripts stamp their notes with a "Booksy appointment (...)"
// or "Booksy history:" first line, which a note Roko types never starts with.
// Bookings she adds herself from Booksy are real new bookings and belong in
// Recent bookings; a hundred rows backfilled in one afternoon do not.
export function isBooksyImport(b) {
  return b?.source === 'booksy' && /^Booksy (appointment \(|history:)/.test(String(b.notes || ''));
}
