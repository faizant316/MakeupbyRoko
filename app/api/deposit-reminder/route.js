import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { sendEmail, depositReminderEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { to, name, service, date, uploadUrl } = await req.json();
    await sendEmail({
      to,
      subject: `Reminder: Send Your Deposit to Secure ${date}`,
      html: depositReminderEmail({ name, service, date, uploadUrl }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('deposit-reminder:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
