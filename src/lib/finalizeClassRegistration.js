import { sendEmailPair, classPaymentEmail, adminClassPaymentEmail } from './email';
import { CLASS_CATALOG, CLASS_KEYS } from './classCatalog';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

// "2026-07-15" → "Wednesday, July 15, 2026"
function formatPreferredDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Single source of truth for confirming a paid class registration.
//
// Both the Stripe webhook and the on-site /payment-success confirm route can
// fire for the same checkout, so this atomically CLAIMS the row (pending →
// paid/confirmed) and only sends the one client + one admin email if THIS
// caller won the claim. The loser's conditional update matches 0 rows and
// no-ops, which is what keeps sign-ups to exactly one email each.
export async function finalizeClassRegistration(supabase, { registrationId, sessionId }) {
  const { data: claimed, error } = await supabase
    .from('class_registrations')
    .update({ payment_status: 'paid', status: 'confirmed' })
    .eq('id', registrationId)
    .eq('payment_status', 'pending') // the lock — only the first caller matches
    .select('*');

  if (error) throw error;
  if (!claimed || claimed.length === 0) return { alreadyDone: true };

  const reg = claimed[0];
  const bookedClasses = CLASS_KEYS.filter(k => reg[k]);
  const totalPaid = reg.amount_paid ?? bookedClasses.reduce((s, k) => s + (CLASS_CATALOG[k]?.price || 0), 0);
  const firstName = (reg.full_name || '').split(' ')[0] || 'there';
  const preferredDate = formatPreferredDate(reg.preferred_date);

  await sendEmailPair([
    {
      to: reg.email,
      subject: "You're officially booked! Your class is confirmed.",
      html: classPaymentEmail({ firstName, bookedClasses, totalPaid, catalog: CLASS_CATALOG, preferredDate }),
    },
    {
      to: ADMIN_EMAIL,
      subject: `New Class Booking — ${reg.full_name} ($${totalPaid.toLocaleString()})`,
      html: adminClassPaymentEmail({ reg, bookedClasses, totalPaid, catalog: CLASS_CATALOG, sessionId, preferredDate }),
    },
  ]);

  return { sent: true, reg };
}
