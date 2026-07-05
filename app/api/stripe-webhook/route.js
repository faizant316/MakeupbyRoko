import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { finalizeClassRegistration } from '../../../src/lib/finalizeClassRegistration';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  try {
    const session = event.data.object;
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true });

    const registrationId = session.metadata?.registration_id;
    if (!registrationId) return NextResponse.json({ received: true });

    const supabase = createClient();

    // Same shared finalizer the on-site confirm route uses. The atomic claim
    // inside means only one of the two paths sends the client + admin email
    // pair — no more duplicate 🎨 / 💳 messages.
    await finalizeClassRegistration(supabase, { registrationId, sessionId: session.id, sessionMeta: session.metadata || {} });
  } catch (err) {
    console.error('stripe-webhook handler:', err);
  }

  return NextResponse.json({ received: true });
}
