import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'noreply@makeupbyroko.com'}>`;
const ADMIN_EMAIL = 'roqiamoshref@gmail.com';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, service, date, email, phone } = body;
    await resend.emails.send({
      from: FROM,
      to: [ADMIN_EMAIL],
      subject: `📅 New Booking — ${name} for ${service} on ${date}`,
      html: `<p>New booking received:</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Service:</strong> ${service}</li><li><strong>Date:</strong> ${date}</li><li><strong>Email:</strong> ${email}</li><li><strong>Phone:</strong> ${phone || 'N/A'}</li></ul><p><a href="https://makeupbyroko.com/admin">View in Admin Dashboard →</a></p>`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('notify-new-booking:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
