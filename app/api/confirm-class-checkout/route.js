import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { finalizeClassRegistration } from '../../../src/lib/finalizeClassRegistration';

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

    // Shared, idempotent finalizer: claims the row and sends the single client +
    // admin email pair only if this call won the claim (the Stripe webhook may
    // race us). Either way the client sees a success screen.
    const result = await finalizeClassRegistration(supabase, {
      registrationId: registration_id,
      sessionId: session_id,
      sessionMeta: session.metadata || {},
    });

    return NextResponse.json({ success: true, already_confirmed: !!result.alreadyDone });
  } catch (err) {
    console.error('confirm-class-checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
