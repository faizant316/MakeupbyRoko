import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '../../../src/lib/supabase/server';

import { CLASS_CATALOG, CLASS_KEYS } from '../../../src/lib/classCatalog';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

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

    const { data: reg } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (!reg || reg.payment_status === 'paid') return NextResponse.json({ received: true });

    await supabase
      .from('class_registrations')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', registrationId);

    const bookedClasses = CLASS_KEYS.filter(k => reg[k]);
    const totalPaid = bookedClasses.reduce((s, k) => s + CLASS_CATALOG[k].price, 0);
    const firstName = (reg.full_name || '').split(' ')[0] || 'there';
    const classListHtml = bookedClasses.map(k =>
      `<li style="margin:6px 0;color:#6E6058;">${CLASS_CATALOG[k].title}</li>`
    ).join('');

    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM = `Makeup by Roko <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
    const REPLY_TO = process.env.REPLY_TO_EMAIL || 'makeupbyroko22@gmail.com';

    await resend.emails.send({
      from: FROM,
      to: [reg.email],
      replyTo: REPLY_TO,
      subject: "You're officially booked! 🎨",
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
        <h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">Hey ${firstName}! 🎨</h2>
        <p style="color:#6E6058;">Your payment of <strong style="color:#111;">$${totalPaid.toLocaleString()}</strong> has been received. You're officially booked!</p>
        <p style="color:#6E6058;">I'll reach out within <strong>24–48 hours</strong> to confirm your class date, time, and all the details.</p>
        <div style="background:#FAF7F4;border-radius:12px;padding:16px;margin:20px 0;border:1px solid #EDE6DF;">
          <ul style="margin:0;padding-left:16px;">${classListHtml}</ul>
        </div>
        <p style="font-family:Georgia,serif;font-style:italic;color:#A0785A;">Xoxo, Roko 💄</p>
      </div>`,
    });

    await resend.emails.send({
      from: FROM,
      to: [ADMIN_EMAIL],
      replyTo: reg.email,
      subject: `💳 New Class Payment — ${reg.full_name} ($${totalPaid.toLocaleString()})`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
        <p><strong>${reg.full_name}</strong> paid <strong>$${totalPaid.toLocaleString()}</strong> for: ${bookedClasses.map(k => CLASS_CATALOG[k].title).join(', ')}</p>
        <p>Email: ${reg.email} · Phone: ${reg.phone}</p>
      </div>`,
    });
  } catch (err) {
    console.error('stripe-webhook handler:', err);
  }

  return NextResponse.json({ received: true });
}
