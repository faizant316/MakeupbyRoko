import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Get all pending bookings
  const bookings = await base44.asServiceRole.entities.Booking.filter({ status: 'pending' });

  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  let sentCount = 0;

  for (const booking of bookings) {
    if (!booking.email) continue;

    // Skip if already sent
    if (booking.deposit_reminder_sent) continue;

    const createdAt = new Date(booking.created_date);
    const hoursSince = (now - createdAt) / oneHourMs;

    // Only send once: 24+ hours after booking was created
    if (hoursSince < 24) continue;

    const firstName = (booking.name || '').split(' ')[0] || 'there';
    const dateFormatted = booking.date
      ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'your requested date';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.email,
      from_name: 'Roqia Moshref',
      subject: `Friendly Reminder — Deposit Needed to Secure Your Date ✦`,
      body: `
        <div style="margin: 0; padding: 0; background-color: #FAF8F6; font-family: Georgia, 'Times New Roman', serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            
            <div style="background: #0C0A09; padding: 48px 40px; text-align: center;">
              <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 300; color: #F5F0EB; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">ROQIA MOSHREF</h1>
              <p style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D4A0B0; margin: 0;">Makeup Artistry</p>
            </div>

            <div style="padding: 48px 40px 32px; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: #FDF6F3; margin: 0 auto 24px; line-height: 56px; text-align: center;">
                <span style="color: #A0785A; font-size: 24px;">⏰</span>
              </div>
              <h2 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #111; margin: 0 0 6px;">Don't Forget Your Deposit!</h2>
              <p style="font-style: italic; color: #A0785A; font-size: 15px; margin: 0 0 28px;">Your spot isn't secured yet ✦</p>
              
              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #888; margin: 0 0 28px; line-height: 1.7; text-align: left;">
                Hi ${firstName}! This is a friendly reminder that your booking request for <strong style="color: #111;">${booking.service}</strong> on <strong style="color: #111;">${dateFormatted}</strong> is still pending.
              </p>

              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #888; margin: 0 0 28px; line-height: 1.7; text-align: left;">
                To confirm your appointment, please send your deposit via Zelle and text or email a screenshot as proof of payment. Your date is <strong style="color: #111;">not secured</strong> until the deposit is received.
              </p>
            </div>

            <!-- BIG ZELLE CTA -->
            <div style="margin: 0 40px 32px; background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 16px; padding: 28px 28px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #D4A0B0; margin: 0 0 10px;">⚡ Send Your Deposit Now</p>
              <p style="font-family: Georgia, serif; font-size: 20px; color: #ffffff; margin: 0 0 20px; font-weight: 400;">Your date is NOT secured yet</p>
              <div style="background: rgba(255,255,255,0.06); border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; text-align: left;">
                <p style="font-family: Arial, sans-serif; font-size: 13px; color: #ddd; margin: 0 0 8px;">📱 <strong style="color: #fff;">Zelle to:</strong> Ruqia Moshref</p>
                <p style="font-family: Arial, sans-serif; font-size: 13px; color: #ddd; margin: 0 0 8px;">📞 <strong style="color: #fff;">Phone:</strong> 510-491-6497</p>
                <p style="font-family: Arial, sans-serif; font-size: 12px; color: #999; margin: 0;">Include your name + appointment date in the note</p>
              </div>
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #D4A0B0; margin: 0;">📸 After sending, text or email your screenshot to <strong>makeupbyroko22@gmail.com</strong> or <strong>510-491-6497</strong></p>
            </div>

            <div style="padding: 0 40px 40px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #999; line-height: 1.7;">
                If you've already sent your deposit — thank you! Please disregard this message. If you have any questions, don't hesitate to reach out.
              </p>
            </div>

            <div style="padding: 32px 40px; text-align: center; border-top: 1px solid #f0ebe6;">
              <p style="font-family: Georgia, serif; font-style: italic; font-size: 18px; color: #A0785A; margin: 0 0 16px;">Xoxo, Roko 💋</p>
            </div>

            <div style="background: #FAF8F6; padding: 24px 40px; text-align: center; border-top: 1px solid #f0ebe6;">
              <p style="font-family: Arial, sans-serif; font-size: 12px; color: #b5a99a; margin: 0 0 4px;">
                📧 makeupbyroko22@gmail.com &nbsp;·&nbsp; 📸 @makeupbyroko_
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 11px; color: #ccc; margin: 8px 0 0;">
                © ${new Date().getFullYear()} Roqia Moshref Makeup Artistry
              </p>
            </div>

          </div>
        </div>
      `
    });

    // Mark as sent so it never fires again for this booking
    await base44.asServiceRole.entities.Booking.update(booking.id, { deposit_reminder_sent: true });
    sentCount++;
    console.log(`Sent deposit reminder to ${booking.email} for booking ${booking.id}`);
  }

  return Response.json({ success: true, reminders_sent: sentCount });
});