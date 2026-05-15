import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data, old_data } = await req.json();

  if (!data || !old_data) {
    return Response.json({ skipped: true, reason: 'Missing data' });
  }

  // Only process if status just changed to cancelled
  if (data.status !== 'cancelled' || old_data.status === 'cancelled') {
    return Response.json({ skipped: true, reason: 'Not a cancellation event' });
  }

  const cancelledDate = data.date;
  const cancelledService = data.service || 'Unknown Service';
  const adminEmail = 'faizant316@gmail.com';

  // Notify admin about the cancellation
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: adminEmail,
    from_name: 'Roqia Moshref Bookings',
    subject: `❌ Booking Cancelled — ${data.name || 'Client'} (${cancelledService})`,
    body: `
      <div style="margin: 0; padding: 0; background-color: #FAF8F6; font-family: Georgia, 'Times New Roman', serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          
          <div style="background: #0C0A09; padding: 36px 40px; text-align: center;">
            <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: 300; color: #F5F0EB; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 6px;">Booking Cancelled</h1>
            <p style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #D4A0B0; margin: 0;">Date may now be available</p>
          </div>

          <div style="padding: 36px 40px 24px; text-align: center;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #FEF2F2; margin: 0 auto 16px; line-height: 48px; text-align: center;">
              <span style="color: #EF4444; font-size: 20px;">✕</span>
            </div>
            <h2 style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #111; margin: 0 0 4px;">${data.name || 'Client'}</h2>
            <p style="font-size: 13px; color: #EF4444; margin: 0;">cancelled their <strong>${cancelledService}</strong> appointment</p>
          </div>

          <div style="margin: 0 40px 28px; background: #FAF8F6; border-radius: 12px; padding: 24px 28px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Service:</td>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${cancelledService}</td>
              </tr>
              ${cancelledDate ? `<tr>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Date:</td>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${new Date(cancelledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</td>
              </tr>` : ''}
              ${data.email ? `<tr>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Email:</td>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${data.email}</td>
              </tr>` : ''}
              ${data.phone ? `<tr>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Phone:</td>
                <td style="padding: 6px 0; font-family: Arial, sans-serif; font-size: 13px; color: #111; font-weight: 600; text-align: right;">${data.phone}</td>
              </tr>` : ''}
            </table>
          </div>

          ${cancelledDate ? `
          <div style="margin: 0 40px 28px; background: #FDF9F7; border: 1px solid #f0ebe6; border-radius: 8px; padding: 16px 20px; text-align: center;">
            <p style="font-family: Arial, sans-serif; font-size: 13px; color: #A0785A; margin: 0;">
              📅 <strong>${new Date(cancelledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong> is now open — check if any waitlisted clients need this date.
            </p>
          </div>
          ` : ''}

          <div style="background: #FAF8F6; padding: 20px 40px; text-align: center; border-top: 1px solid #f0ebe6;">
            <p style="font-family: Arial, sans-serif; font-size: 11px; color: #ccc; margin: 0;">
              © ${new Date().getFullYear()} Roqia Moshref Makeup Artistry
            </p>
          </div>

        </div>
      </div>
    `
  });

  // Send cancellation confirmation to client
  if (data.email) {
    const firstName = (data.name || '').split(' ')[0] || 'there';
    const dateFormatted = cancelledDate
      ? new Date(cancelledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'your requested date';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: data.email,
      from_name: 'Roqia Moshref',
      subject: `Booking Cancellation Confirmation — ${cancelledService}`,
      body: `
        <div style="margin: 0; padding: 0; background-color: #FAF8F6; font-family: Georgia, 'Times New Roman', serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            
            <div style="background: #0C0A09; padding: 48px 40px; text-align: center;">
              <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 300; color: #F5F0EB; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">ROQIA MOSHREF</h1>
              <p style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #D4A0B0; margin: 0;">Makeup Artistry</p>
            </div>

            <div style="padding: 48px 40px 32px; text-align: center;">
              <h2 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #111; margin: 0 0 6px;">Cancellation Confirmed</h2>
              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #888; margin: 0 0 28px; line-height: 1.7;">
                Hi ${firstName}, your <strong style="color: #111;">${cancelledService}</strong> appointment on <strong style="color: #111;">${dateFormatted}</strong> has been cancelled.
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 13px; color: #999; line-height: 1.7;">
                Please note that deposits are non-refundable and non-transferable per our booking policy. If you'd like to rebook in the future, I'd love to work with you!
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
  }

  console.log(`Cancellation processed for booking ${event.entity_id} — ${data.name}`);
  return Response.json({ success: true, booking_id: event.entity_id });
});