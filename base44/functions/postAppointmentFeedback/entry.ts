import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const now = new Date();
  let feedbacksSent = 0;

  // Get completed bookings
  const completedBookings = await base44.asServiceRole.entities.Booking.filter({ status: 'completed' });

  for (const booking of completedBookings) {
    if (!booking.email || !booking.date) continue;

    // Skip if already sent
    if (booking.feedback_request_sent) continue;

    // Send feedback request ~24 hours after appointment date
    const appointmentDate = new Date(booking.date + 'T18:00:00');
    const hoursSince = (now - appointmentDate) / (1000 * 60 * 60);

    // Only send once: after 18 hours post-appointment
    if (hoursSince < 18) continue;

    const firstName = (booking.name || '').split(' ')[0] || 'there';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.email,
      from_name: 'Roqia Moshref',
      subject: `How Was Your Experience? ✦ I'd Love Your Feedback`,
      body: `
        <div style="margin: 0; padding: 0; background-color: #FAF8F6; font-family: Georgia, 'Times New Roman', serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            
            <div style="background: #0C0A09; padding: 48px 40px; text-align: center;">
              <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 300; color: #F5F0EB; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">ROQIA MOSHREF</h1>
              <p style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D4A0B0; margin: 0;">Makeup Artistry</p>
            </div>

            <div style="padding: 48px 40px 32px; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: #FDF6F3; margin: 0 auto 24px; line-height: 56px; text-align: center;">
                <span style="color: #A0785A; font-size: 24px;">💕</span>
              </div>
              <h2 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #111; margin: 0 0 6px;">Thank You, ${firstName}!</h2>
              <p style="font-style: italic; color: #A0785A; font-size: 15px; margin: 0 0 28px;">It was such a pleasure working with you ✦</p>
              
              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #888; margin: 0 0 28px; line-height: 1.7;">
                I hope you absolutely loved your <strong style="color: #111;">${booking.service}</strong> look! Your feedback means the world to me and helps other clients find the right service.
              </p>
            </div>

            <div style="margin: 0 40px 32px; background: linear-gradient(135deg, #FDF9F7 0%, #FAF5F2 100%); border: 1px solid #f0ebe6; border-radius: 12px; padding: 28px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #D4A0B0; margin: 0 0 12px;">Share Your Experience</p>
              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; margin: 0 0 8px; line-height: 1.6;">
                Would you mind leaving a quick review? It only takes a minute and helps so much!
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #999; margin: 0;">
                Simply reply to this email with:
              </p>
              <div style="margin-top: 16px; text-align: left; max-width: 300px; margin-left: auto; margin-right: auto;">
                <p style="font-family: Arial, sans-serif; font-size: 13px; color: #666; margin: 4px 0; line-height: 1.6;">⭐ Your rating (1–5 stars)</p>
                <p style="font-family: Arial, sans-serif; font-size: 13px; color: #666; margin: 4px 0; line-height: 1.6;">💬 A few words about your experience</p>
                <p style="font-family: Arial, sans-serif; font-size: 13px; color: #666; margin: 4px 0; line-height: 1.6;">📸 A photo of your look (optional)</p>
              </div>
            </div>

            <div style="margin: 0 40px 32px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #b5a99a; margin: 0 0 12px;">Or Leave a Review On</p>
              <table style="margin: 0 auto; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 12px;">
                    <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" style="font-family: Arial, sans-serif; font-size: 13px; color: #A0785A; text-decoration: none;">📸 Instagram</a>
                  </td>
                  <td style="padding: 0 12px; border-left: 1px solid #e8e2dc;">
                    <a href="https://g.page/r/review" target="_blank" style="font-family: Arial, sans-serif; font-size: 13px; color: #A0785A; text-decoration: none;">⭐ Google</a>
                  </td>
                </tr>
              </table>
            </div>

            <div style="margin: 0 40px 32px; background: #FAF8F6; border-radius: 8px; padding: 16px 20px; text-align: center;">
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #A0785A; margin: 0;">
                🔄 Want to rebook? Simply reply or email <strong>makeupbyroko22@gmail.com</strong>
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
    await base44.asServiceRole.entities.Booking.update(booking.id, { feedback_request_sent: true });
    feedbacksSent++;
    console.log(`Sent feedback request to ${booking.email} for booking ${booking.id}`);
  }

  return Response.json({ success: true, feedbacks_sent: feedbacksSent });
});