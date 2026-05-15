import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data } = await req.json();

  if (!data) {
    return Response.json({ skipped: true, reason: 'No data' });
  }

  const adminEmail = 'faizant316@gmail.com';
  const dateFormatted = data.date
    ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not specified';

  const service = (data.service || '').toLowerCase();
  const isBridal = !service.includes('non-bridal') && (service.includes('bridal') || service.includes('full day'));

  const subject = `${isBridal ? 'New Bridal Inquiry' : 'New Booking Request'} - ${data.name || 'Client'} | ${data.service || ''}`;
  const fromName = 'Roqia Moshref Bookings';
  const fromEmail = 'makeupbyroko22@gmail.com';

  const htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background-color:#FAF7F4;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:540px;margin:0 auto;padding:20px 16px;">
<div style="background:#FFFFFF;border-radius:18px;padding:24px;text-align:center;margin-bottom:10px;border:1px solid #EDE6DF;">
<p style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">${isBridal ? '💍 New Bridal Inquiry' : '✨ New Booking Request'}</p>
<div style="width:44px;height:44px;border-radius:50%;background:#F7EEF2;margin:0 auto 10px;line-height:44px;text-align:center;font-size:18px;">${isBridal ? '💍' : '📅'}</div>
<h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#2C1A14;margin:0 0 4px;">${data.name || 'Client'}</h2>
<p style="font-size:13px;color:#9E8E84;margin:0;">wants to book <strong style="color:#C4849A;">${data.service || 'Unknown'}</strong></p>
</div>
<div style="background:#FFFFFF;border-radius:16px;padding:18px 20px;margin-bottom:10px;border:1px solid #EDE6DF;">
<p style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 12px;">Booking Details</p>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:7px 0;font-size:13px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Service</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${data.service || 'N/A'}</td></tr>
<tr><td style="padding:7px 0;font-size:13px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Date</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${dateFormatted}</td></tr>
${data.email ? `<tr><td style="padding:7px 0;font-size:13px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Email</td><td style="padding:7px 0;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #F0EAE5;"><a href="mailto:${data.email}" style="color:#C4849A;text-decoration:none;">${data.email}</a></td></tr>` : ''}
${data.phone ? `<tr><td style="padding:7px 0;font-size:13px;color:#9E8E84;${data.notes ? 'border-bottom:1px solid #F0EAE5;' : ''}">Phone</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;${data.notes ? 'border-bottom:1px solid #F0EAE5;' : ''}"><a href="tel:${data.phone}" style="color:#2C1A14;text-decoration:none;">${data.phone}</a></td></tr>` : ''}
${data.notes ? `<tr><td colspan="2" style="padding:10px 0 0;"><p style="font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4849A;margin:0 0 4px;">Notes</p><p style="font-size:13px;color:#6E6058;margin:0;line-height:1.6;">${data.notes}</p></td></tr>` : ''}
</table>
</div>
<div style="background:#fff;border-radius:14px;padding:16px 20px;margin-bottom:10px;border:1px solid #EDE6DF;text-align:center;">
<a href="https://makeupbyroko.base44.app/admin" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 22px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">🗂 Open Admin Dashboard →</a>
<p style="font-size:11px;color:#B8A8A0;margin:8px 0 0;">Confirm, update, or manage this booking</p>
</div>
<p style="text-align:center;font-size:10px;color:#C4BAB0;margin:0;padding-bottom:6px;">© ${new Date().getFullYear()} Roqia Moshref Makeup Artistry</p>
</div></body></html>`;

  try {
    // Use Gmail connector so email lands in Primary inbox
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const messageParts = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${adminEmail}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
    ];

    const rawMessage = messageParts.join('\r\n');
    const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!gmailRes.ok) {
      const errBody = await gmailRes.text();
      throw new Error(`Gmail API error ${gmailRes.status}: ${errBody}`);
    }

    console.log(`Admin notified of new booking from ${data.name} (${data.email})`);
  } catch (err) {
    console.error(`Failed to send admin notification:`, err.message || err);
    return Response.json({ error: `Email send failed: ${err.message}` }, { status: 500 });
  }

  return Response.json({ success: true, booking_id: event.entity_id });
});