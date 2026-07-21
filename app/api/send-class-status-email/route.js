import { NextResponse } from 'next/server';
import { sendEmail } from '../../../src/lib/email';
import { requireAdmin } from '../../../src/lib/requireAdmin';

const footer = `
  <div style="text-align:center;padding:20px 0 8px;">
    <p style="font-family:Georgia,serif;font-style:italic;font-size:16px;color:#C4849A;margin:0 0 5px;">With love, Roko</p>
    <p style="font-size:11px;color:#999999;margin:0;">roko@makeupbyroko.org · @makeupbyroko_</p>
  </div>`;

function base(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
<div style="max-width:500px;margin:0 auto;padding:24px 16px;">
  <div style="text-align:center;margin-bottom:16px;">
    <p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0;">Makeup by Roko</p>
  </div>
  ${content}
  ${footer}
</div></body></html>`;
}

function enrolledEmail({ name }) {
  const firstName = name?.split(' ')[0] || 'there';
  return base(`
    <div style="background:#fff;border-radius:14px;padding:20px;border:1px solid #F0E0E9;margin-bottom:10px;">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="width:44px;height:44px;border-radius:50%;background:#FDF0F5;margin:0 auto 10px;line-height:44px;text-align:center;font-size:20px;">🎉</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#111111;margin:0 0 4px;">You're <em style="color:#C4849A;">Enrolled!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">Welcome to the class ✦</p>
      </div>
      <p style="font-size:14px;color:#111111;margin:0 0 10px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:13px;color:#444444;line-height:1.7;margin:0 0 10px;">Your enrollment has been confirmed by Roqia — welcome to the class! 💄</p>
      <p style="font-size:13px;color:#444444;line-height:1.7;margin:0;">Roqia will be in touch within <strong>24–48 hours</strong> to coordinate scheduling and share any preparation details.</p>
    </div>
  `);
}

function depositPaidEmail({ name, amount }) {
  const firstName = name?.split(' ')[0] || 'there';
  return base(`
    <div style="background:#fff;border-radius:14px;padding:20px;border:1px solid #F0E0E9;margin-bottom:10px;">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="width:44px;height:44px;border-radius:50%;background:#FDF0F5;margin:0 auto 10px;line-height:44px;text-align:center;font-size:20px;color:#C4849A;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#111111;margin:0 0 4px;">Deposit <em style="color:#C4849A;">Received!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">Your spot is officially secured ✦</p>
      </div>
      <p style="font-size:14px;color:#111111;margin:0 0 10px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:13px;color:#444444;line-height:1.7;margin:0 0 10px;">We've received your deposit${amount ? ` of <strong>$${amount}</strong>` : ''} — your spot is officially secured! 🎊</p>
      <p style="font-size:13px;color:#444444;line-height:1.7;margin:0;">The remaining balance will be collected at your appointment. Roqia will follow up with scheduling details soon.</p>
    </div>
  `);
}

function paidInFullEmail({ name, amount }) {
  const firstName = name?.split(' ')[0] || 'there';
  return base(`
    <div style="background:#fff;border-radius:14px;padding:20px;border:1px solid #F0E0E9;margin-bottom:10px;">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="width:44px;height:44px;border-radius:50%;background:#FDF0F5;margin:0 auto 10px;line-height:44px;text-align:center;font-size:20px;color:#C4849A;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#111111;margin:0 0 4px;">Payment <em style="color:#C4849A;">Complete!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">You're all set ✦</p>
      </div>
      <p style="font-size:14px;color:#111111;margin:0 0 10px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:13px;color:#444444;line-height:1.7;margin:0 0 10px;">Your full payment${amount ? ` of <strong>$${amount}</strong>` : ''} has been received — you're all set! 🎊</p>
      <p style="font-size:13px;color:#444444;line-height:1.7;margin:0;">Roqia will be in touch soon with any final class details. We can't wait to see you!</p>
    </div>
  `);
}

// Admin-only, for the same reason as on-booking-cancelled: the recipient comes
// from the request body, so an open version of this is a free email relay on
// Roko's sending domain. Nothing in the app currently calls it, which makes an
// auth gate strictly safer than leaving it reachable.
export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const { type, to, name, amount } = await req.json();
    if (!to) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    if (type === 'enrolled') {
      await sendEmail({
        to,
        subject: "You're enrolled in Roqia's makeup class! 🎉",
        html: enrolledEmail({ name }),
      });
    } else if (type === 'deposit_paid') {
      await sendEmail({
        to,
        subject: 'Deposit received — your spot is secured ✓',
        html: depositPaidEmail({ name, amount }),
      });
    } else if (type === 'paid_in_full') {
      await sendEmail({
        to,
        subject: 'Payment complete — see you in class! ✓',
        html: paidInFullEmail({ name, amount }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-class-status-email:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
