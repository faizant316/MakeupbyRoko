import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { event, data, old_data } = body;

  if (!data || !old_data) {
    return Response.json({ skipped: true, reason: 'Missing data' });
  }

  // Only trigger when status changes TO confirmed
  if (data.status !== 'confirmed' || old_data.status === 'confirmed') {
    return Response.json({ skipped: true, reason: 'Not a confirmation event' });
  }

  if (!data.email) {
    return Response.json({ skipped: true, reason: 'No email' });
  }

  const firstName = (data.name || '').split(' ')[0] || 'there';
  const dateFormatted = data.date
    ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'your appointment date';

  const isBridal = (data.service || '').toLowerCase().includes('bridal') || (data.service || '').toLowerCase().includes('full day');

  const timeRow = data.time ? `<tr><td style="padding:7px 0;font-size:12px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Time</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${data.time}</td></tr>` : '';
  const bridalRow = isBridal ? `<div style="display:table;width:100%;margin-bottom:5px;"><div style="display:table-cell;width:20px;font-size:13px;">💍</div><div style="display:table-cell;font-size:12px;color:#2C1A14;line-height:1.5;">Details about your <strong>bridal party</strong> (if applicable)</div></div>` : '';

  const htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#FAF7F4;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;"><div style="max-width:520px;margin:0 auto;padding:20px 16px;"><div style="background:#fff;border-radius:16px;padding:22px;text-align:center;margin-bottom:8px;border:1px solid #EDE6DF;"><p style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Roqia Moshref · Makeup Artistry</p><div style="width:48px;height:48px;border-radius:50%;background:#F0FDF4;margin:0 auto 12px;line-height:48px;text-align:center;font-size:20px;color:#22C55E;">✓</div><h1 style="font-family:Georgia,serif;font-size:26px;font-weight:300;color:#2C1A14;margin:0 0 5px;">You're Officially <em style="color:#C4849A;">Booked!</em></h1><p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#A0785A;margin:0;">Your deposit has been received ✦</p></div><div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:8px;border:1px solid #EDE6DF;"><p style="font-size:14px;color:#2C1A14;margin:0 0 4px;">Hi <strong>${firstName}</strong>! 🎉</p><p style="font-size:13px;color:#6E6058;margin:0;line-height:1.6;">Great news — your <strong style="color:#2C1A14;">${data.service}</strong> appointment on <strong style="color:#2C1A14;">${dateFormatted}</strong> is now confirmed! I'm so excited to work with you.</p></div><div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:8px;border:1px solid #EDE6DF;"><p style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Confirmed Details</p><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:7px 0;font-size:12px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Client</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${data.name}</td></tr><tr><td style="padding:7px 0;font-size:12px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Service</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${data.service}</td></tr><tr><td style="padding:7px 0;font-size:12px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Date</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${dateFormatted}</td></tr>${timeRow}<tr><td style="padding:7px 0;font-size:12px;color:#9E8E84;">Status</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#22C55E;text-align:right;">✓ Confirmed</td></tr></table></div><div style="background:#1A0F14;border-radius:16px;padding:20px 18px;margin-bottom:8px;text-align:center;"><p style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#D4A0B0;margin:0 0 8px;">Next Step</p><p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F5F0EB;margin:0 0 10px;">30-Minute Zoom Consultation</p><p style="font-size:12px;color:#D4C4BB;margin:0 0 12px;line-height:1.7;">I'll reach out shortly to schedule our call. We'll go over your vision and make sure every detail is perfect.</p><div style="background:#2A1820;border-radius:10px;padding:10px 14px;"><p style="font-size:12px;color:#F0C4B0;margin:0;">📧 Keep an eye on your inbox!</p></div></div><div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:8px;border:1px solid #EDE6DF;"><p style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Have Ready for Your Consultation</p><div style="display:table;width:100%;margin-bottom:5px;"><div style="display:table-cell;width:20px;font-size:13px;">📸</div><div style="display:table-cell;font-size:12px;color:#2C1A14;line-height:1.5;">Inspiration photos for your look</div></div><div style="display:table;width:100%;margin-bottom:5px;"><div style="display:table-cell;width:20px;font-size:13px;">👗</div><div style="display:table-cell;font-size:12px;color:#2C1A14;line-height:1.5;">Photos of your outfit(s) / gown(s)</div></div><div style="display:table;width:100%;margin-bottom:5px;"><div style="display:table-cell;width:20px;font-size:13px;">🤳</div><div style="display:table-cell;font-size:12px;color:#2C1A14;line-height:1.5;">A photo <strong>with makeup</strong> and one <strong>without</strong></div></div>${bridalRow}<div style="margin-top:8px;padding-top:8px;border-top:1px solid #F0EAE5;"><p style="font-size:11px;color:#b5a99a;margin:0;">All photos are kept completely confidential.</p></div></div><div style="background:#FDF9F7;border-radius:12px;padding:14px 18px;margin-bottom:8px;border:1px solid #f0ebe6;"><p style="font-size:12px;color:#A0785A;margin:0;line-height:1.6;">💵 Remaining balance is due in <strong>CASH</strong> on the day of your appointment — bring it in an envelope labeled with your name.</p></div><div style="background:#fff;border-radius:12px;padding:16px;text-align:center;margin-bottom:8px;border:1px solid #EDE6DF;"><p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#A0785A;margin:0 0 3px;">Xoxo, Roko 💋</p><p style="font-size:11px;color:#B8A8A0;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p></div><p style="text-align:center;font-size:10px;color:#C4BAB0;margin:0;padding-bottom:6px;">© ${new Date().getFullYear()} Roqia Moshref Makeup Artistry</p></div></body></html>`;

  try {
    // Use Gmail connector to send email
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build RFC 2822 email message
    const subject = `You're Confirmed! — ${data.service} ✦ Let's Schedule Your Consultation`;
    const fromName = 'Roqia Moshref';
    const fromEmail = 'makeupbyroko22@gmail.com';

    const messageParts = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${data.email}`,
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

    console.log(`Confirmation + consultation email sent to ${data.email} for booking ${event.entity_id}`);
  } catch (err) {
    console.error(`Failed to send consultation email to ${data.email}:`, err.message || err);
    return Response.json({ error: `Email send failed: ${err.message}` }, { status: 500 });
  }

  return Response.json({ success: true, booking_id: event.entity_id });
});