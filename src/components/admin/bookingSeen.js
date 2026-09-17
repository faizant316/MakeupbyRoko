// Has Roko opened this booking yet? (migration 0023)
//
// One rule, shared by the rail that shouts about it and the client card that
// quiets it, so the two can never disagree about what counts as new.
//
// Opening the card is the acknowledgment, exactly like deposit_seen_at. There
// is no "mark as read" button to forget, and no timer, so a booking that lands
// while she is away for a week is still waiting for her when she comes back.

export function isBookingUnseen(b) {
  if (!b) return false;
  // Before 0023 lands the column is simply absent, and treating a missing field
  // as "never seen" would light up every booking on file at once.
  if (!('admin_seen_at' in b)) return false;
  if (b.admin_seen_at) return false;
  // Booksy imports were never news, and a cancelled booking is one she handled.
  return b.source !== 'booksy' && b.status !== 'cancelled';
}
