import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'noreply@makeupbyroko.com'}>`;

export async function POST(req) {
  try {
    const { to, name, service } = await req.json();
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `How did your ${service} go? ✨`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;"><h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">Hey ${name}!</h2><p style="color:#6E6058;">I hope you loved your <strong>${service}</strong>! I'd love to hear how it went.</p><p style="color:#6E6058;">Would you mind leaving a quick review? It means so much 🌸</p><p><a href="https://makeupbyroko.com/#reviews" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Leave a Review ✦</a></p><p style="font-family:Georgia,serif;font-style:italic;color:#A0785A;">Xoxo, Roko 💋</p></div>`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('post-appointment-feedback:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
