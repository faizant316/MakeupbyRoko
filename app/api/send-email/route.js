import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

export async function POST(req) {
  try {
    const { to, subject, html, text } = await req.json();
    if (!to || !subject) return NextResponse.json({ error: 'to and subject required' }, { status: 400 });
    const { data, error } = await resend.emails.send({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html, text });
    if (error) throw error;
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('send-email:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
