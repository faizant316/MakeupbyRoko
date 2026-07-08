import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

// Real Stripe refund for a class registration, driven from the admin card.
// Stripe keeps its processing fee on refunds, so:
//   'minus_fee' — refund the charge minus the card fee. The client absorbs the
//                 fee (used when the CLIENT cancels 14+ days out); Roko stays
//                 roughly whole.
//   'full'      — refund the entire charge. The client is made 100% whole and
//                 Roko eats the fee (used when the ARTIST has to cancel).
const FEE_PCT = 0.029;
const FEE_FIXED_CENTS = 30;

export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const { registrationId, mode } = await req.json();
    if (!registrationId) return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });

    const supabase = createClient();
    const { data: reg, error } = await supabase
      .from('class_registrations')
      .select('id, stripe_session_id, payment_status')
      .eq('id', registrationId)
      .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    if (!reg.stripe_session_id) return NextResponse.json({ error: 'No Stripe payment on file for this registration.' }, { status: 400 });
    if (reg.payment_status === 'refunded') return NextResponse.json({ error: 'This registration is already refunded.' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(reg.stripe_session_id);
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (session.payment_status !== 'paid' || !paymentIntent) {
      return NextResponse.json({ error: 'This session was never paid, so there is nothing to refund.' }, { status: 400 });
    }

    const total = session.amount_total; // cents actually charged
    const feeCents = Math.round(total * FEE_PCT) + FEE_FIXED_CENTS;
    const amount = mode === 'minus_fee' ? Math.max(0, total - feeCents) : total;

    const refund = await stripe.refunds.create({ payment_intent: paymentIntent, amount });

    await supabase.from('class_registrations').update({ payment_status: 'refunded' }).eq('id', registrationId);

    return NextResponse.json({
      success: true,
      mode: mode === 'minus_fee' ? 'minus_fee' : 'full',
      amount: amount / 100,
      refundId: refund.id,
    });
  } catch (err) {
    console.error('refund-class:', err);
    return NextResponse.json({ error: err.message || 'Refund failed' }, { status: 500 });
  }
}
