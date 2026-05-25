import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmailPair, classPaymentEmail, adminClassPaymentEmail } from '../../../src/lib/email';

import { CLASS_CATALOG, CLASS_KEYS } from '../../../src/lib/classCatalog';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

export async function POST(req) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();
    const { session_id, registration_id } = await req.json();

    if (!session_id || !registration_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const { data: reg, error: fetchErr } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('id', registration_id)
      .single();

    if (fetchErr || !reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    if (reg.payment_status === 'paid') return NextResponse.json({ success: true });

    await supabase
      .from('class_registrations')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', registration_id);

    const bookedClasses = CLASS_KEYS.filter(k => reg[k]);
    const totalPaid = bookedClasses.reduce((s, k) => s + CLASS_CATALOG[k].price, 0);
    const firstName = (reg.full_name || '').split(' ')[0] || 'there';

    await sendEmailPair([
      {
        to: reg.email,
        subject: "You're officially booked! Your class is confirmed.",
        html: classPaymentEmail({ firstName, bookedClasses, totalPaid, catalog: CLASS_CATALOG }),
      },
      {
        to: ADMIN_EMAIL,
        subject: `New Class Booking — ${reg.full_name} ($${totalPaid.toLocaleString()})`,
        html: adminClassPaymentEmail({ reg, bookedClasses, totalPaid, catalog: CLASS_CATALOG, sessionId: session_id }),
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('confirm-class-checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
