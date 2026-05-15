import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all pending bookings without a zelle screenshot
    const bookings = await base44.asServiceRole.entities.Booking.filter({
      status: 'pending',
    });

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

    let sent = 0;
    let skipped = 0;

    for (const booking of bookings) {
      // Skip if already has screenshot or no email/token
      if (booking.zelle_screenshot || !booking.email || !booking.upload_token) {
        skipped++;
        continue;
      }

      // Skip if already sent reminder
      if (booking.deposit_reminder_sent) {
        skipped++;
        continue;
      }

      const createdAt = new Date(booking.created_date).getTime();
      const age = now - createdAt;

      // Only send if 24–48 hours have passed since booking
      if (age < TWENTY_FOUR_HOURS || age > FORTY_EIGHT_HOURS) {
        skipped++;
        continue;
      }

      const uploadUrl = `https://makeupbyroko.base44.app/upload-zelle?id=${booking.id}&token=${booking.upload_token}`;
      const firstName = (booking.name || '').split(' ')[0] || 'there';
      const dateFormatted = booking.date
        ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : 'your appointment date';

      const emailBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin: 0; padding: 0; background-color: #FAF8F6; font-family: Georgia, 'Times New Roman', serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

            <!-- Header -->
            <div style="background-color: #0C0A09; padding: 36px 32px; text-align: center;">
              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: 300; color: #F5F0EB; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 6px;">ROQIA MOSHREF</h1>
              <p style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D4A0B0; margin: 0;">Makeup Artistry</p>
            </div>

            <!-- Body -->
            <div style="padding: 36px 32px 28px; text-align: center;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background-color: #FDF6F3; margin: 0 auto 16px; line-height: 48px;">
                <span style="font-size: 22px;">⏰</span>
              </div>
              <h2 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #111; margin: 0 0 8px;">Friendly Reminder, ${firstName}!</h2>
              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 24px; text-align: left;">
                Your booking for <strong>${booking.service}</strong> on <strong>${dateFormatted}</strong> is pending your Zelle deposit. To lock in your date, please send your deposit and upload the screenshot using the link below.
              </p>
            </div>

            <!-- Deposit info -->
            <div style="margin: 0 24px 24px; background-color: #1A0F14; border-radius: 16px; padding: 28px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #D4A0B0; margin: 0 0 12px;">Send Your Zelle Deposit</p>
              <div style="background-color: #2A1820; border-radius: 10px; padding: 16px 20px; text-align: left; margin-bottom: 18px;">
                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #F0E8EA; margin: 0 0 10px;">📱 <strong style="color: #FFFFFF;">Zelle to:</strong> Ruqia Moshref</p>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #F0E8EA; margin: 0 0 10px;">📞 <strong style="color: #FFFFFF;">Phone:</strong> 510-491-6497</p>
                <p style="font-family: Arial, sans-serif; font-size: 12px; color: #B8A8AC; margin: 0;">Include your name + appointment date in the note</p>
              </div>
            </div>

            <!-- Upload CTA -->
            <div style="margin: 0 24px 24px; background-color: #F7F3F0; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #555; margin: 0 0 16px; line-height: 1.6;">
                After sending your deposit, upload your screenshot here to confirm your booking:
              </p>
              <a href="${uploadUrl}" style="display: inline-block; background-color: #D4A0B0; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 0.03em;">
                Upload Zelle Screenshot &rarr;
              </a>
              <p style="font-family: Arial, sans-serif; font-size: 11px; color: #aaa; margin: 10px 0 0;">Or copy: <a href="${uploadUrl}" style="color: #D4A0B0;">${uploadUrl}</a></p>
            </div>

            <!-- Cash note -->
            <div style="margin: 0 24px 28px; background-color: #F7F3F0; border-radius: 8px; padding: 14px 18px;">
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #555; margin: 0; line-height: 1.6;">
                💵 Remaining balance is due in <strong>CASH</strong> on the day of your appointment.
              </p>
            </div>

            <!-- Sign off -->
            <div style="padding: 20px 32px; text-align: center; border-top: 1px solid #EDE8E3;">
              <p style="font-family: Georgia, serif; font-style: italic; font-size: 18px; color: #A0785A; margin: 0;">Xoxo, Roko 💋</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #F7F3F0; padding: 18px 32px; text-align: center; border-top: 1px solid #EDE8E3;">
              <p style="font-family: Arial, sans-serif; font-size: 12px; color: #A09080; margin: 0 0 4px;">📧 makeupbyroko22@gmail.com &nbsp;·&nbsp; 📸 @makeupbyroko_</p>
              <p style="font-family: Arial, sans-serif; font-size: 11px; color: #BBADA0; margin: 6px 0 0;">© ${new Date().getFullYear()} Roqia Moshref Makeup Artistry</p>
            </div>

          </div>
        </body>
        </html>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.email,
        from_name: 'Roqia Moshref',
        subject: `Reminder: Upload Your Zelle Screenshot to Confirm Your Booking`,
        body: emailBody,
      });

      // Mark reminder as sent
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        deposit_reminder_sent: true,
      });

      sent++;
      console.log(`Zelle reminder sent to ${booking.email} (booking ${booking.id})`);
    }

    return Response.json({ success: true, sent, skipped });
  } catch (error) {
    console.error('zelleScreenshotReminder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});