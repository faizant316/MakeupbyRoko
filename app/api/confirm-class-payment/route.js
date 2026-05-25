import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();
    const { sessionId } = await req.json();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Update registration payment status only — email is handled by confirm-class-checkout
    await supabase
      .from('class_registrations')
      .update({ payment_status: 'deposit_paid', status: 'enrolled' })
      .eq('stripe_session_id', sessionId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('confirm-class-payment:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
