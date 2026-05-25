import { NextResponse } from 'next/server';
import { sendEmail } from '../../../src/lib/email';

function enrolledEmail({ name }) {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
<div style="max-width:500px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Roqia Moshref · Makeup Artistry</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#111;margin:0;">You're Enrolled! 🎉</h1>
  </div>
  <div style="background:#FAFAF9;border-radius:14px;padding:20px;border:1px solid #EDE6DF;margin-bottom:16px;">
    <p style="font-size:15px;color:#333;margin:0 0 12px;">Hi ${firstName},</p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      Your enrollment has been confirmed by Roqia — welcome to the class! 💄
    </p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0;">
      Roqia will be in touch within 24–48 hours to coordinate scheduling and share any preparation details.
    </p>
  </div>
  <div style="text-align:center;padding:16px 0 8px;">
    <p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#A0785A;margin:0 0 4px;">Xoxo, Roko 💋</p>
    <p style="font-size:11px;color:#B8A8A0;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p>
  </div>
</div></body></html>`;
}

function depositPaidEmail({ name, amount }) {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
<div style="max-width:500px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Roqia Moshref · Makeup Artistry</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#111;margin:0;">Deposit Received ✓</h1>
  </div>
  <div style="background:#FAFAF9;border-radius:14px;padding:20px;border:1px solid #EDE6DF;margin-bottom:16px;">
    <p style="font-size:15px;color:#333;margin:0 0 12px;">Hi ${firstName},</p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
      We've received your deposit${amount ? ` of <strong>$${amount}</strong>` : ''} — your spot is officially secured! 🎊
    </p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0;">
      The remaining balance will be collected at your appointment. Roqia will follow up with scheduling details soon.
    </p>
  </div>
  <div style="text-align:center;padding:16px 0 8px;">
    <p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#A0785A;margin:0 0 4px;">Xoxo, Roko 💋</p>
    <p style="font-size:11px;color:#B8A8A0;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p>
  </div>
</div></body></html>`;
}

export async function POST(req) {
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
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-class-status-email:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
