import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
    const { to, name, service, date, uploadUrl } = await req.json();
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `⚡ Reminder: Send Your Deposit to Secure ${date}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;"><h2 style="font-family:Georgia,serif;font-weight:300;color:#2C1A14;">Hey ${name},</h2><p style="color:#6E6058;">Just a friendly reminder to send your Zelle deposit to secure your <strong>${service}</strong> appointment on <strong>${date}</strong>.</p><p style="color:#6E6058;"><strong>Zelle to:</strong> Ruqia Moshref — 510-491-6497</p><p><a href="${uploadUrl}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">📸 Upload Your Screenshot</a></p><p style="color:#9E8E84;font-size:12px;">Questions? Email makeupbyroko22@gmail.com</p><p style="font-family:Georgia,serif;font-style:italic;color:#A0785A;">Xoxo, Roko 💋</p></div>`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('deposit-reminder:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
