// Class scheduling rules: classes run on Wednesdays. A client can book ANY
// upcoming Wednesday as long as it's at least two weeks out (Roko needs the
// lead time to prep), and that Wednesday isn't already taken — one client per
// Wednesday. Shared by the public picker and the server-side validation in
// create-class-checkout.

import { studioToday } from './studio';

// Minimum lead time: the earliest bookable Wednesday is the first one that is
// at least this many days from today. (Two weeks.)
export const MIN_LEAD_DAYS = 14;

// How far ahead booking stays open (generous, keeps the calendar sane).
export const MAX_HORIZON_DAYS = 365;

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEDNESDAY = 3;

// 'YYYY-MM-DD' of the earliest bookable Wednesday: the first Wednesday that is
// at least MIN_LEAD_DAYS out. Everything from here forward is open (unless a
// specific date is booked/blocked). Counted from the studio's day so the
// picker and the server agree (see studioToday()).
export function firstBookableWednesday(from = new Date()) {
  const d = studioToday(from);
  d.setDate(d.getDate() + MIN_LEAD_DAYS); // earliest allowed calendar day
  // step forward to the first Wednesday on/after that day
  d.setDate(d.getDate() + ((WEDNESDAY - d.getDay() + 7) % 7));
  return toKey(d);
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
// Wednesday, at least two weeks out, within the booking horizon. (Whether the
// specific date is already taken is checked separately in create-class-checkout.)
export function isBookableWednesday(dateStr, from = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime()) || d.getDay() !== WEDNESDAY) return false;
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const diffDays = (d - today) / 86400000;
  return diffDays >= MIN_LEAD_DAYS && diffDays <= MAX_HORIZON_DAYS;
}
