import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { Resend } from 'resend';

const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'noreply@makeupbyroko.com'}>`;

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { sessionId } = await req.json();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Update registration payment status
    await supabase
      .from('class_registrations')
      .update({ payment_status: 'deposit_paid', status: 'enrolled' })
      .eq('stripe_session_id', sessionId);

    // Send confirmation email
    if (session.customer_email) {
      await resend.emails.send({
        from: FROM,
        to: [session.customer_email],
        subject: 'Class Registration Confirmed! 💄',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;"><h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">You're enrolled!</h2><p style="color:#6E6058;">Your class registration is confirmed and your deposit has been received. Roko will be in touch with details soon.</p><p style="font-family:Georgia,serif;font-style:italic;color:#A0785A;">Xoxo, Roko 💋</p></div>`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('confirm-class-payment:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
