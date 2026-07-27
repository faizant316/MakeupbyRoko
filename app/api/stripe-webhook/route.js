import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { finalizeClassRegistration } from '../../../src/lib/finalizeClassRegistration';
import { raiseAlert } from '../../../src/lib/alerts';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // A wrong STRIPE_WEBHOOK_SECRET fails EVERY payment webhook, not just one,
    // and the site keeps taking money the whole time. This is the single most
    // likely thing to break on the switch to live keys.
    await raiseAlert({
      source: 'api/stripe-webhook', kind: 'signature_failed', severity: 'critical',
      message: 'A Stripe webhook failed signature verification. If STRIPE_WEBHOOK_SECRET is wrong, EVERY paid class is now going unfinalized: the client is charged and gets no confirmation, no Zoom link, and no registration.',
      context: { error: err?.message },
    });
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  try {
    const session = event.data.object;
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true });

    const registrationId = session.metadata?.registration_id;
    if (!registrationId) {
      // Paid, but nothing to attach the payment to.
      await raiseAlert({
        source: 'api/stripe-webhook', kind: 'missing_registration_id', severity: 'critical',
        message: 'A Stripe checkout completed with no registration_id in its metadata, so the payment could not be matched to a class sign-up. Someone has paid and has no registration.',
        context: { session_id: session.id, amount_total: session.amount_total },
      });
      return NextResponse.json({ received: true });
    }

    const supabase = createClient();

    // Same shared finalizer the on-site confirm route uses. The atomic claim
    // inside means only one of the two paths sends the client + admin email
    // pair — no more duplicate 🎨 / 💳 messages.
    await finalizeClassRegistration(supabase, { registrationId, sessionId: session.id, sessionMeta: session.metadata || {} });
  } catch (err) {
    // Note this still answers 200 below, so Stripe will NOT retry. That is the
    // existing behaviour and payment retry semantics aren't something to change
    // quietly, but it does mean this alert is the only chance to catch it.
    await raiseAlert({
      source: 'api/stripe-webhook', kind: 'finalize_failed', severity: 'critical',
      message: 'A class payment succeeded but finalizing the registration failed. The client has been charged and may have received no confirmation, no Zoom link, and no scheduled date. Stripe will not retry this.',
      context: { error: err?.message, event_id: event?.id, session_id: event?.data?.object?.id },
    });
  }

  return NextResponse.json({ received: true });
}
