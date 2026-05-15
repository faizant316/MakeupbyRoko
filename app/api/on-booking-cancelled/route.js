import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'noreply@makeupbyroko.com'}>`;

export async function POST(req) {
  try {
    const { to, name, service, date } = await req.json();
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `Your booking for ${service} has been cancelled`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;"><h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">Hey ${name},</h2><p style="color:#6E6058;">Your booking for <strong>${service}</strong> on <strong>${date}</strong> has been cancelled.</p><p style="color:#6E6058;">If you'd like to rebook, visit <a href="https://makeupbyroko.com" style="color:#C4849A;">makeupbyroko.com</a> or reach out directly.</p><p style="color:#9E8E84;font-size:12px;">Questions? Email makeupbyroko22@gmail.com</p><p style="font-family:Georgia,serif;font-style:italic;color:#A0785A;">Xoxo, Roko 💋</p></div>`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('on-booking-cancelled:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
