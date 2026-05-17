import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { sendEmail, feedbackRequestEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { to, name, service } = await req.json();
    await sendEmail({
      to,
      subject: `How did your ${service} go? ✨`,
      html: feedbackRequestEmail({ name, service }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('post-appointment-feedback:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
