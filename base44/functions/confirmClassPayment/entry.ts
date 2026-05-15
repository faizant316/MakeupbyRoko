import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_ADDRESS = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
const ADMIN_EMAIL = 'makeupbyroko22@gmail.com';

const CLASS_LABELS = {
  private_basic_lesson: { name: 'Private Basic Makeup Lesson', duration: '1.5 hours', price: 300, deposit: 150 },
  virtual_lesson: { name: 'Virtual Makeup Lesson', duration: '2 hours', price: 400, deposit: 200 },
  intermediate_lesson: { name: 'Intermediate Makeup Lesson', duration: '2.5 hours', price: 500, deposit: 250 },
  glam_class: { name: 'Glam Makeup Class', duration: '3 hours', price: 600, deposit: 300 },
  masterclass: { name: 'Makeup Masterclass', duration: '4 hours · 2 days', price: 1500, deposit: 750 },
};

async function sendEmail(to, subject, html, fromName = 'Roqia Moshref') {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${fromName} <${FROM_ADDRESS}>`, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) console.error('Email send error:', JSON.stringify(data));
  return data;
}

function buildClientEmail({ firstName, selectedClasses, totalDeposit, totalFull, receiptDate, stripeSessionId }) {
  const itemRows = selectedClasses.map(cls =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE5;">
        <p style="font-size:13px;font-weight:600;color:#2C1A14;margin:0 0 2px;">${cls.name}</p>
        <p style="font-size:11px;color:#9E8E84;margin:0;">${cls.duration}</p>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE5;text-align:right;vertical-align:top;">
        <p style="font-size:13px;font-weight:600;color:#2C1A14;margin:0 0 2px;">$${cls.deposit}</p>
        <p style="font-size:11px;color:#9E8E84;margin:0;">of $${cls.price}</p>
      </td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:20px 16px;">

  <!-- Header -->
  <div style="background:#fff;border-radius:16px;padding:28px 24px;text-align:center;margin-bottom:8px;border:1px solid #EDE6DF;">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 14px;">Roqia Moshref · Makeup Artistry</p>
    <div style="width:52px;height:52px;border-radius:50%;background:#F7EEF2;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;line-height:52px;text-align:center;font-size:22px;">✓</div>
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:300;color:#2C1A14;margin:0 0 6px;">Deposit <em style="color:#C4849A;">Confirmed!</em></h1>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#A0785A;margin:0;">Your spot is officially secured ✦</p>
  </div>

  <!-- Greeting -->
  <div style="background:#fff;border-radius:14px;padding:16px 20px;margin-bottom:8px;border:1px solid #EDE6DF;">
    <p style="font-size:14px;color:#2C1A14;margin:0 0 6px;">Hey <strong>${firstName}</strong> 🎉</p>
    <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;">
      Your deposit has been received and your spot is secured! Roko will reach out within <strong>24–48 hours</strong> to confirm your class schedule and all the details. Get ready to level up your makeup game!
    </p>
  </div>

  <!-- Itemized Receipt -->
  <div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:8px;border:1px solid #EDE6DF;">
    <div style="padding:14px 20px;background:#FAF7F4;border-bottom:1px solid #EDE6DF;">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0 0 2px;">Payment Receipt</p>
      <p style="font-size:11px;color:#B8A8A0;margin:0;">${receiptDate}${stripeSessionId ? ` · Ref: ${stripeSessionId.slice(-8).toUpperCase()}` : ''}</p>
    </div>
    <div style="padding:4px 20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        ${itemRows}
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE5;">
            <p style="font-size:12px;color:#9E8E84;margin:0;">Remaining balance (due at class)</p>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE5;text-align:right;">
            <p style="font-size:12px;color:#9E8E84;margin:0;">$${totalFull - totalDeposit}</p>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:14px 20px;background:#FDF7F4;display:flex;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:13px;font-weight:700;color:#2C1A14;">Deposit Paid Today</td>
          <td style="font-size:16px;font-weight:700;color:#2C1A14;text-align:right;">$${totalDeposit}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- What's Next -->
  <div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:8px;border:1px solid #EDE6DF;">
    <div style="padding:14px 20px;border-bottom:1px solid #F0EAE5;">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0;">What Happens Next</p>
    </div>
    <div style="padding:12px 20px;border-bottom:1px solid #F7F2EF;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="28" valign="top"><div style="width:20px;height:20px;border-radius:50%;background:#F7EEF2;text-align:center;line-height:20px;font-size:10px;font-weight:700;color:#C4849A;">1</div></td>
        <td style="padding-left:10px;"><p style="font-size:13px;font-weight:600;color:#2C1A14;margin:0 0 1px;">Roko reaches out within 24–48 hrs</p><p style="font-size:11px;color:#9E8E84;margin:0;">To schedule your class date & time</p></td>
      </tr></table>
    </div>
    <div style="padding:12px 20px;border-bottom:1px solid #F7F2EF;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="28" valign="top"><div style="width:20px;height:20px;border-radius:50%;background:#F7EEF2;text-align:center;line-height:20px;font-size:10px;font-weight:700;color:#C4849A;">2</div></td>
        <td style="padding-left:10px;"><p style="font-size:13px;font-weight:600;color:#2C1A14;margin:0 0 1px;">Prepare any inspiration photos</p><p style="font-size:11px;color:#9E8E84;margin:0;">Optional: share looks you love beforehand</p></td>
      </tr></table>
    </div>
    <div style="padding:12px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="28" valign="top"><div style="width:20px;height:20px;border-radius:50%;background:#F7EEF2;text-align:center;line-height:20px;font-size:10px;font-weight:700;color:#C4849A;">3</div></td>
        <td style="padding-left:10px;"><p style="font-size:13px;font-weight:600;color:#2C1A14;margin:0 0 1px;">Remaining balance due at class</p><p style="font-size:11px;color:#9E8E84;margin:0;">Cash or Zelle · $${totalFull - totalDeposit} remaining</p></td>
      </tr></table>
    </div>
  </div>

  <!-- Sign off -->
  <div style="background:#fff;border-radius:12px;padding:20px;text-align:center;margin-bottom:8px;border:1px solid #EDE6DF;">
    <p style="font-family:Georgia,serif;font-style:italic;font-size:19px;color:#A0785A;margin:0 0 4px;">Xoxo, Roko 💄</p>
    <p style="font-size:11px;color:#B8A8A0;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p>
  </div>
  <p style="text-align:center;font-size:10px;color:#C4BAB0;margin:0;padding-bottom:8px;">© ${new Date().getFullYear()} Roqia Moshref Makeup Artistry</p>

</div></body></html>`;
}

function buildAdminEmail({ customerName, customerEmail, customerPhone, selectedClasses, totalDeposit, totalFull, additionalNotes, receiptDate, stripeSessionId }) {
  const itemRows = selectedClasses.map(cls =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #F0EAE5;font-size:13px;color:#2C1A14;">${cls.name} <span style="font-size:11px;color:#9E8E84;">(${cls.duration})</span></td>
      <td style="padding:8px 0;border-bottom:1px solid #F0EAE5;text-align:right;font-size:13px;color:#9E8E84;">$${cls.price} total</td>
      <td style="padding:8px 0;border-bottom:1px solid #F0EAE5;text-align:right;font-size:13px;font-weight:600;color:#2C1A14;">$${cls.deposit} paid</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:20px 16px;">

  <!-- Header -->
  <div style="background:#fff;border-radius:16px;padding:22px 24px;text-align:center;margin-bottom:8px;border:1px solid #EDE6DF;">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Admin · Class Registration</p>
    <div style="display:inline-block;background:#F0FDF4;border-radius:50%;width:44px;height:44px;line-height:44px;text-align:center;font-size:18px;margin-bottom:10px;">💰</div>
    <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#2C1A14;margin:0 0 4px;">New Deposit Received!</h1>
    <p style="font-size:13px;color:#9E8E84;margin:0;">${receiptDate}</p>
  </div>

  <!-- Client Info -->
  <div style="background:#fff;border-radius:14px;padding:16px 20px;margin-bottom:8px;border:1px solid #EDE6DF;">
    <p style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:5px 0;font-size:12px;color:#9E8E84;width:100px;">Name</td><td style="padding:5px 0;font-size:13px;font-weight:600;color:#2C1A14;">${customerName}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#9E8E84;">Email</td><td style="padding:5px 0;font-size:13px;color:#2C1A14;"><a href="mailto:${customerEmail}" style="color:#C4849A;">${customerEmail}</a></td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#9E8E84;">Phone</td><td style="padding:5px 0;font-size:13px;color:#2C1A14;"><a href="tel:${customerPhone}" style="color:#C4849A;">${customerPhone}</a></td></tr>
      ${additionalNotes ? `<tr><td style="padding:5px 0;font-size:12px;color:#9E8E84;vertical-align:top;">Notes</td><td style="padding:5px 0;font-size:13px;color:#6E6058;font-style:italic;">${additionalNotes}</td></tr>` : ''}
    </table>
  </div>

  <!-- Itemized Receipt -->
  <div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:8px;border:1px solid #EDE6DF;">
    <div style="padding:14px 20px;background:#FAF7F4;border-bottom:1px solid #EDE6DF;">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0 0 2px;">Order Breakdown</p>
      ${stripeSessionId ? `<p style="font-size:11px;color:#B8A8A0;margin:0;">Stripe Session: ${stripeSessionId}</p>` : ''}
    </div>
    <div style="padding:4px 20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px 0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B8A8A0;text-align:left;border-bottom:1px solid #EDE6DF;">Class</th>
            <th style="padding:8px 0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B8A8A0;text-align:right;border-bottom:1px solid #EDE6DF;">Full Price</th>
            <th style="padding:8px 0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#B8A8A0;text-align:right;border-bottom:1px solid #EDE6DF;">Deposit Paid</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div style="padding:14px 20px;background:#FDF7F4;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:12px;color:#9E8E84;padding:3px 0;">Total class value</td>
          <td style="font-size:12px;color:#9E8E84;text-align:right;padding:3px 0;">$${totalFull}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#9E8E84;padding:3px 0;">Remaining (due at class)</td>
          <td style="font-size:12px;color:#9E8E84;text-align:right;padding:3px 0;">$${totalFull - totalDeposit}</td>
        </tr>
        <tr>
          <td style="font-size:14px;font-weight:700;color:#2C1A14;padding:8px 0 3px;">Deposit Received</td>
          <td style="font-size:16px;font-weight:700;color:#22c55e;text-align:right;padding:8px 0 3px;">+$${totalDeposit}</td>
        </tr>
      </table>
    </div>
  </div>

  <p style="text-align:center;font-size:10px;color:#C4BAB0;margin:0;padding-bottom:8px;">© ${new Date().getFullYear()} Roqia Moshref Makeup Artistry · Admin Notification</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_id, registration_id } = await req.json();

    if (!session_id || !registration_id) {
      return Response.json({ error: 'Missing session_id or registration_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === 'paid';

    // Update registration
    await base44.asServiceRole.entities.ClassRegistration.update(registration_id, {
      payment_status: paid ? 'deposit_paid' : 'pending',
      status: paid ? 'enrolled' : 'new',
    });

    if (paid) {
      // Fetch registration details
      const reg = await base44.asServiceRole.entities.ClassRegistration.get(registration_id);

      const CLASS_KEYS = Object.keys(CLASS_LABELS);
      const selectedClasses = CLASS_KEYS
        .filter(key => reg[key])
        .map(key => CLASS_LABELS[key]);

      const totalDeposit = selectedClasses.reduce((sum, c) => sum + c.deposit, 0);
      const totalFull = selectedClasses.reduce((sum, c) => sum + c.price, 0);
      const firstName = (reg.full_name || '').split(' ')[0] || 'there';
      const receiptDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      // Send client receipt email
      const clientHtml = buildClientEmail({
        firstName,
        selectedClasses,
        totalDeposit,
        totalFull,
        receiptDate,
        stripeSessionId: session_id,
      });
      await sendEmail(reg.email, `Deposit Confirmed — Your Makeup Class Spot is Secured ✦`, clientHtml);
      console.log(`Sent client receipt to ${reg.email}`);

      // Send admin notification email
      const adminHtml = buildAdminEmail({
        customerName: reg.full_name,
        customerEmail: reg.email,
        customerPhone: reg.phone,
        selectedClasses,
        totalDeposit,
        totalFull,
        additionalNotes: reg.additional_notes,
        receiptDate,
        stripeSessionId: session_id,
      });
      await sendEmail(ADMIN_EMAIL, `💰 New Class Deposit — ${reg.full_name} ($${totalDeposit})`, adminHtml, 'MakeupbyRoko');
      console.log(`Sent admin notification for registration ${registration_id}`);
    }

    console.log(`Payment confirmed: session=${session_id}, paid=${paid}, reg=${registration_id}`);
    return Response.json({ paid, payment_status: session.payment_status });
  } catch (error) {
    console.error('Confirm payment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});