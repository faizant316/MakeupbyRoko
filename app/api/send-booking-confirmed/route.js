import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, bookingConfirmedEmail } from '../../../src/lib/email';
import { amountValue } from '../../../src/lib/contract';

// What the client actually hands over on the day, or nothing at all.
//
// This has to be worked out from the booking ROW, never from the posted
// payload: the edit-modal call site fires this on the same tick as an
// un-awaited row update, so anything it sends about the service may describe a
// booking that does not exist yet.
//
// It refuses far more often than it answers, on purpose. Every refusal below is
// a case where a figure would be confidently wrong:
//
//   travel        priced "$750+", not the service row
//   early arrival a +$100 surcharge that exists only as English in `notes`
//   bridal        Full Day and on-location Luxury carry their own maths
//   no match      a tenth of booking rows name a service that no longer exists
//   odd pricing   "See Classes", "50% deposit via Zelle", "$200+"
//
// The email says "Roko will confirm the exact amount" whenever this returns ''.
// That is the same rule the agreement, the booking email and the site already
// follow, and it is the right answer: an absent number costs a question, a
// wrong one costs a client turning up short.
async function cashOnTheDay(supabase, booking, postedService) {
  const service = booking?.service;
  if (!service) return '';

  // The edit-modal call site fires this on the same tick as an un-awaited row
  // update, so the row can still describe the booking as it was a moment ago.
  // When the caller's idea of the service and the row's disagree, one of them is
  // mid-write and neither can be priced.
  if (postedService && String(postedService).trim() !== String(service).trim()) return '';

  // Surcharges and travel live in the notes as prose. Anything that could add
  // to the total, or that prices the job off the service row entirely, means we
  // cannot answer.
  const notes = booking.notes || '';
  if (/travel|✈/i.test(notes)) return '';
  if (/early arrival|surcharge|⏰/i.test(notes)) return '';
  // An on-location booking is a drive whether or not the note was written, and
  // admin-created bookings set `location` without the travel flag.
  if (booking.location) return '';
  // Bridal totals fold in a travel fee this path cannot see.
  if (/bridal|bride|wedding|full day/i.test(service) && !/non-?\s?bridal/i.test(service)) return '';

  const { data: svc, error } = await supabase
    .from('services')
    .select('price, deposit')
    .eq('title', service)
    .maybeSingle();
  // maybeSingle() errors on a duplicate title (there is no unique constraint on
  // services.title). Either way, no answer.
  if (error || !svc) return '';

  const price = amountValue(svc.price);
  const deposit = amountValue(svc.deposit);
  if (price == null || deposit == null || price <= deposit) return '';

  return `$${(price - deposit).toLocaleString('en-US')}`;
}

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { to, firstName, serviceName, dateFormatted, time, travels, bookingId } = await req.json();

    // Look up the cancel token server-side (never trust a client-passed one) so
    // the confirmation email can carry a "need to cancel?" link.
    let cancelUrl = '';
    let balanceDue = '';
    if (bookingId) {
      const supabase = createClient();
      const { data: booking } = await supabase
        .from('bookings')
        .select('upload_token, service, notes, location')
        .eq('id', bookingId)
        .maybeSingle();
      if (booking?.upload_token) {
        const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
        cancelUrl = `${siteBase}/cancel-booking?token=${booking.upload_token}`;
      }
      // Never let the money lookup take the send down with it. A confirmation
      // that arrives without a figure is a small loss; one that never arrives
      // because a price column was malformed is a client left hanging.
      if (booking) {
        try {
          balanceDue = travels ? '' : await cashOnTheDay(supabase, booking, serviceName);
        } catch (err) {
          console.error('send-booking-confirmed: balance lookup failed', err);
        }
      }
    }

    await sendEmail({
      log: { bookingId, kind: 'booking_confirmed', audience: 'client' },
      to,
      subject: `Your ${serviceName} appointment is confirmed ✦`,
      html: bookingConfirmedEmail({ firstName, serviceName, dateFormatted, time, travels: !!travels, cancelUrl, balanceDue }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-booking-confirmed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
