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
