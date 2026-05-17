import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '../../../src/lib/supabase/server';

const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Private Basic Makeup Lesson', duration: '1.5 hours', price: 300 },
  virtual_lesson:       { title: 'Virtual Makeup Lesson',        duration: '2 hours',   price: 400 },
  intermediate_lesson:  { title: 'Intermediate Makeup Lesson',   duration: '2.5 hours', price: 500 },
  glam_class:           { title: 'Glam Makeup Class',            duration: '3 hours',   price: 600 },
  masterclass:          { title: 'Makeup Masterclass',           duration: '4 hours · 2 days', price: 1500 },
};

const CLASS_KEYS = Object.keys(CLASS_CATALOG);

export async function POST(req) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();
    const { session_id, registration_id } = await req.json();

    if (!session_id || !registration_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Fetch registration
    const { data: reg, error: fetchErr } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('id', registration_id)
      .single();

    if (fetchErr || !reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    // Idempotency — already confirmed
    if (reg.payment_status === 'paid') return NextResponse.json({ success: true });

    await supabase
      .from('class_registrations')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', registration_id);

    // Build class list for email
    const bookedClasses = CLASS_KEYS.filter(k => reg[k]);
    const classListHtml = bookedClasses.map(k =>
      `<li style="margin:6px 0;color:#6E6058;">${CLASS_CATALOG[k].title} <span style="color:#A0785A;">(${CLASS_CATALOG[k].duration})</span></li>`
    ).join('');
    const totalPaid = bookedClasses.reduce((s, k) => s + CLASS_CATALOG[k].price, 0);
    const firstName = (reg.full_name || '').split(' ')[0] || 'there';

    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

    // Send both emails in parallel — failures are logged independently so one doesn't block the other
    const clientEmail = resend.emails.send({
      from: FROM,
      to: [reg.email],
      subject: "You're officially booked! 🎨",
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
        <h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">Hey ${firstName}! 🎨</h2>
        <p style="color:#6E6058;">Your payment of <strong style="color:#111;">$${totalPaid.toLocaleString()}</strong> has been received. You're officially booked!</p>
        <p style="color:#6E6058;">I'll reach out within <strong>24–48 hours</strong> to confirm your class date, time, and all the details.</p>
        <div style="background:#FAF7F4;border-radius:12px;padding:16px;margin:20px 0;border:1px solid #EDE6DF;">
          <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Your Class${bookedClasses.length > 1 ? 'es' : ''}</p>
          <ul style="margin:0;padding-left:16px;">${classListHtml}</ul>
          <div style="border-top:1px solid #EDE6DF;margin-top:12px;padding-top:12px;">
            <span style="color:#6E6058;font-size:14px;">Total Paid: </span>
            <strong style="color:#111;font-size:14px;">$${totalPaid.toLocaleString()}</strong>
          </div>
        </div>
        <p style="color:#6E6058;font-size:13px;">Questions? Reply to this email or text me directly.</p>
        <p style="font-family:Georgia,serif;font-style:italic;color:#A0785A;">Xoxo, Roko 💄</p>
      </div>`,
    }).catch(e => console.error('client email failed:', e));

    const adminEmail = resend.emails.send({
      from: FROM,
      to: ['makeupbyroko22@gmail.com'],
      subject: `💳 New Class Booking — ${reg.full_name} ($${totalPaid.toLocaleString()})`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
        <h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">New Class Booking 🎨</h2>
        <p style="color:#6E6058;"><strong>${reg.full_name}</strong> just paid <strong style="color:#111;">$${totalPaid.toLocaleString()}</strong> via Stripe.</p>
        <div style="background:#FAF7F4;border-radius:12px;padding:16px;margin:20px 0;border:1px solid #EDE6DF;">
          <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
          <p style="margin:4px 0;color:#6E6058;font-size:14px;"><strong>Name:</strong> ${reg.full_name}</p>
          <p style="margin:4px 0;color:#6E6058;font-size:14px;"><strong>Email:</strong> ${reg.email}</p>
          <p style="margin:4px 0;color:#6E6058;font-size:14px;"><strong>Phone:</strong> ${reg.phone}</p>
          ${reg.additional_notes ? `<p style="margin:4px 0;color:#6E6058;font-size:14px;"><strong>Notes:</strong> ${reg.additional_notes}</p>` : ''}
          <p style="margin:12px 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;">Classes Booked</p>
          <ul style="margin:0;padding-left:16px;">${classListHtml}</ul>
          <p style="margin:12px 0 0;color:#111;font-size:14px;font-weight:700;">Total Paid: $${totalPaid.toLocaleString()}</p>
        </div>
        <p style="color:#6E6058;font-size:13px;">Please reach out to them within 24–48 hours to confirm their class schedule.</p>
        <p style="color:#aaa;font-size:11px;">Stripe Session: ${session_id}</p>
      </div>`,
    }).catch(e => console.error('admin email failed:', e));

    await Promise.allSettled([clientEmail, adminEmail]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('confirm-class-checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
