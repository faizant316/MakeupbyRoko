import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let remindersSent = 0;

  // Get confirmed bookings for 24h-before reminders
  const confirmedBookings = await base44.asServiceRole.entities.Booking.filter({ status: 'confirmed' });

  for (const booking of confirmedBookings) {
    if (!booking.email || !booking.date) continue;

    // Skip if already sent
    if (booking.appointment_reminder_sent) continue;

    const appointmentDate = new Date(booking.date + 'T12:00:00');
    const hoursUntil = (appointmentDate - now) / (1000 * 60 * 60);

    // Send reminder when appointment is within 30 hours away
    if (hoursUntil < 0 || hoursUntil > 30) continue;

    const firstName = (booking.name || '').split(' ')[0] || 'there';
    const dateFormatted = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.email,
      from_name: 'Roqia Moshref',
      subject: `Tomorrow's the Day! — Your ${booking.service} Appointment ✦`,
      body: `
        <div style="margin: 0; padding: 0; background-color: #FAF8F6; font-family: Georgia, 'Times New Roman', serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            
            <div style="background: #0C0A09; padding: 48px 40px; text-align: center;">
              <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 300; color: #F5F0EB; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">ROQIA MOSHREF</h1>
              <p style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D4A0B0; margin: 0;">Makeup Artistry</p>
            </div>

            <div style="padding: 48px 40px 32px; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: #FDF6F3; margin: 0 auto 24px; line-height: 56px; text-align: center;">
                <span style="color: #A0785A; font-size: 24px;">🌟</span>
              </div>
              <h2 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #111; margin: 0 0 6px;">See You Tomorrow!</h2>
              <p style="font-style: italic; color: #A0785A; font-size: 15px; margin: 0 0 28px;">Get ready to glow ✦</p>
              
              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #888; margin: 0 0 28px; line-height: 1.7; text-align: left;">
                Hi ${firstName}! Just a friendly reminder that your <strong style="color: #111;">${booking.service}</strong> appointment is tomorrow, <strong style="color: #111;">${dateFormatted}</strong>.
              </p>
            </div>

            <div style="margin: 0 40px 32px; background: #FAF8F6; border-radius: 12px; padding: 24px 28px;">
              <p style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #b5a99a; margin: 0 0 16px;">Appointment Details</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Service:</td>
                  <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${booking.service}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Date:</td>
                  <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${dateFormatted}</td>
                </tr>
                ${booking.time ? `<tr>
                  <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Time:</td>
                  <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${booking.time}</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="margin: 0 40px 32px; background: #FDF9F7; border: 1px solid #f0ebe6; border-radius: 8px; padding: 20px 24px;">
              <p style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #b5a99a; margin: 0 0 12px;">Prep Checklist</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666; line-height: 1.6;">✔ Arrive with clean, moisturized skin</td></tr>
                <tr><td style="padding: 4px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666; line-height: 1.6;">✔ Avoid heavy skincare treatments tonight</td></tr>
                <tr><td style="padding: 4px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666; line-height: 1.6;">✔ Come with dry, styled hair</td></tr>
                <tr><td style="padding: 4px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666; line-height: 1.6;">✔ Bring any inspiration photos</td></tr>
                <tr><td style="padding: 4px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666; line-height: 1.6;">✔ Bring remaining balance in a labeled cash envelope</td></tr>
              </table>
            </div>

            <div style="padding: 0 40px 40px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #999; line-height: 1.7;">
                If you need to make any changes, please reach out as soon as possible. See you soon!
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
    await base44.asServiceRole.entities.Booking.update(booking.id, { appointment_reminder_sent: true });
    remindersSent++;
    console.log(`Sent 24hr reminder to ${booking.email} for booking ${booking.id}`);
  }

  return Response.json({ success: true, reminders_sent: remindersSent });
});