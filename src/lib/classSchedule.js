// Class scheduling rules: classes run on Wednesdays, and clients can only book
// the next 2 open Wednesdays (Roko's rule, so her calendar never fills months
// out). Shared by the public checkout picker and the server-side validation in
// create-class-checkout.

export const MAX_BOOKABLE_WEDNESDAYS = 2;

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEDNESDAY = 3;

// The next `count` Wednesdays strictly after today, skipping any Roko blocked
// via blocked_dates (so she always leaves clients `count` real options).
// Returns 'YYYY-MM-DD' keys.
export function upcomingWednesdays({ count = MAX_BOOKABLE_WEDNESDAYS, blockedSet = new Set(), from = new Date() } = {}) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const out = [];
  // Jump to the next Wednesday strictly after `from`, then step by weeks.
  d.setDate(d.getDate() + (((WEDNESDAY - d.getDay() + 7) % 7) || 7));
  let guard = 0;
  while (out.length < count && guard < 26) {
    const key = toKey(d);
    if (!blockedSet.has(key)) out.push(key);
    d.setDate(d.getDate() + 7);
    guard++;
  }
  return out;
}

// One client per Wednesday. A registration "holds" its date when it's paid or
// confirmed; an unpaid pending row only soft-holds it for 45 minutes (long
// enough to finish Stripe checkout, short enough that an abandoned checkout
// never blocks the Wednesday for real clients).
export function regHoldsDate(reg, now = Date.now()) {
  if (!reg) return false;
  if (reg.status === 'cancelled' || reg.status === 'declined') return false;
  if (reg.payment_status === 'refunded') return false;
  if (['paid', 'deposit_paid', 'paid_in_full'].includes(reg.payment_status)) return true;
  if (['confirmed', 'enrolled'].includes(reg.status)) return true;
  const created = new Date(reg.created_at || reg.created_date || 0).getTime();
  return now - created < 45 * 60 * 1000;
}

// The date a registration occupies (admin-confirmed date wins over the
// client-requested one).
export function regDateOf(reg) {
  return reg?.appointment_date || reg?.preferred_date || null;
}

// Server-side sanity check for a client-submitted class date: must be a real
// upcoming Wednesday within the bookable horizon. Kept slightly generous
// (blocked dates can push the 2 open Wednesdays further out).
export function isBookableWednesday(dateStr, from = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime()) || d.getDay() !== WEDNESDAY) return false;
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const diffDays = (d - today) / 86400000;
  return diffDays > 0 && diffDays <= 8 * 7;
}
