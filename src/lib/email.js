import { Resend } from 'resend';

const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
// Override all recipient addresses during testing. Remove this env var when going live.
const TEST_TO = process.env.RESEND_TEST_EMAIL;

function resolveTo(address) {
  return TEST_TO || address;
}

function base(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
<div style="max-width:500px;margin:0 auto;padding:24px 16px;">
<div style="text-align:center;margin-bottom:16px;">
  <p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0;">Roqia Moshref · Makeup Artistry</p>
</div>
${content}
<div style="text-align:center;padding:20px 0 8px;">
  <p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#A0785A;margin:0 0 4px;">Xoxo, Roko 💋</p>
  <p style="font-size:11px;color:#B8A8A0;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p>
</div>
</div></body></html>`;
}

function card(content) {
  return `<div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #EDE6DF;">${content}</div>`;
}

function row(label, value, color) {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">${label}</td>
    <td style="padding:7px 0;font-size:13px;font-weight:600;color:${color || '#2C1A14'};text-align:right;border-bottom:1px solid #F0EAE5;">${value}</td>
  </tr>`;
}

function step(n, title, sub) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #F5F0EC;">
    <tr>
      <td width="32" valign="top" style="padding:10px 8px 10px 0;">
        <div style="width:22px;height:22px;border-radius:50%;background:#F7EEF2;text-align:center;line-height:22px;font-size:10px;font-weight:700;color:#C4849A;">${n}</div>
      </td>
      <td valign="top" style="padding:10px 0;">
        <p style="font-size:13px;font-weight:600;color:#2C1A14;margin:0 0 2px;">${title}</p>
        <p style="font-size:11px;color:#9E8E84;margin:0;">${sub}</p>
      </td>
    </tr>
  </table>`;
}

export async function sendEmail({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({ from: FROM, to: [resolveTo(to)], subject, html });
  if (result.error) throw new Error(result.error.message);
  return result;
}

export async function sendEmailPair(emails) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = await Promise.allSettled(
    emails.map(({ to, subject, html }) =>
      resend.emails.send({ from: FROM, to: [resolveTo(to)], subject, html })
        .then(r => { if (r.error) throw new Error(r.error.message); return r; })
    )
  );
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Email ${i} failed:`, r.reason);
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function bookingConfirmationEmail({ firstName, serviceName, servicePrice, serviceDeposit, dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal }) {
  const rows = [
    row('Service', serviceName),
    row('Base Price', hasTravelFee ? '$750+' : servicePrice),
    hasTravelFee ? row('Travel fee', '$750+', '#A0785A') : '',
    isEarlyArrival ? row('Early Arrival (before 7 AM)', '+$100', '#C97C2A') : '',
    estimatedTotal ? row('Estimated Total', estimatedTotal) : '',
    row('Date', dateFormatted),
  ].filter(Boolean).join('');

  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#F7EEF2;margin:0 auto 10px;line-height:40px;text-align:center;font-size:18px;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#2C1A14;margin:0 0 4px;">Booking Request <em style="color:#C4849A;">Received!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#A0785A;margin:0;">Can't wait to glam you up ✦</p>
      </div>
      <p style="font-size:14px;color:#2C1A14;margin:0 0 4px;">Hey <strong>${firstName}</strong> 👋</p>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.6;">Your booking request is in! I'll reach out to confirm your time within <strong>24–48 hours</strong>.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Booking Summary</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;text-align:center;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Action Required — Send Your Deposit</p>
      <p style="font-family:Georgia,serif;font-size:20px;color:#2C1A14;margin:0 0 4px;">${serviceDeposit || 'Deposit required'}</p>
      <p style="font-size:12px;color:#9E8E84;margin:0 0 12px;">Send via Zelle to lock in your date</p>
      <div style="background:#F7F3F0;border-radius:10px;padding:12px;margin-bottom:12px;text-align:left;border:1px solid #EDE6DF;">
        <p style="font-size:13px;color:#2C1A14;margin:0 0 4px;"><strong>Zelle to:</strong> Ruqia Moshref</p>
        <p style="font-size:13px;color:#2C1A14;margin:0;"><strong>Phone:</strong> 510-491-6497</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${uploadUrl}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Upload Zelle Screenshot</a>
      </td></tr></table>
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">What Happens Next</p>
      ${step(1, 'Send your Zelle deposit', 'Ruqia Moshref · 510-491-6497')}
      ${step(2, 'Upload your screenshot', 'Use the secure link above')}
      ${step(3, 'Roko confirms your appointment', 'Within 24–48 hours')}
    `)}
  `);
}

export function bridalConfirmationEmail({ firstName, bridalTitle, bridalDateFormatted, bridalDeposit, uploadUrl }) {
  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:28px;margin-bottom:8px;">💍</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#2C1A14;margin:0 0 4px;">You're on <em style="color:#C4849A;">the list!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#A0785A;margin:0;">I can't wait to be part of your big day ✦</p>
      </div>
      <p style="font-size:14px;color:#2C1A14;margin:0 0 4px;">Hey <strong>${firstName}</strong> 👰</p>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.6;">Your bridal inquiry for <strong>${bridalTitle}</strong> on <strong>${bridalDateFormatted}</strong> has been received! I'll be in touch within <strong>24–48 hours</strong>.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;text-align:center;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Action Required — Send Your Deposit</p>
      <p style="font-family:Georgia,serif;font-size:20px;color:#2C1A14;margin:0 0 4px;">${bridalDeposit}</p>
      <div style="background:#F7F3F0;border-radius:10px;padding:12px;margin-bottom:12px;text-align:left;border:1px solid #EDE6DF;">
        <p style="font-size:13px;color:#2C1A14;margin:0 0 4px;"><strong>Zelle to:</strong> Ruqia Moshref</p>
        <p style="font-size:13px;color:#2C1A14;margin:0;"><strong>Phone:</strong> 510-491-6497</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${uploadUrl}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Upload Zelle Screenshot</a>
      </td></tr></table>
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">What Happens Next</p>
      ${step(1, 'Send your Zelle deposit', 'Ruqia Moshref · 510-491-6497')}
      ${step(2, 'Upload your screenshot', 'Use the secure link above')}
      ${step(3, 'Roko reaches out for consultation', 'To go over your vision and bridal look')}
    `)}
  `);
}

export function bookingConfirmedEmail({ firstName, serviceName, dateFormatted }) {
  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#dcfce7;margin:0 auto 10px;line-height:40px;text-align:center;font-size:18px;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#2C1A14;margin:0 0 4px;">You're <em style="color:#C4849A;">Confirmed!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#A0785A;margin:0;">Can't wait to see you ✦</p>
      </div>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! Your <strong>${serviceName}</strong> appointment on <strong>${dateFormatted}</strong> is officially confirmed. See you then!</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Appointment Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Service', serviceName)}
        ${row('Date', dateFormatted)}
        ${row('Status', 'Confirmed')}
      </table>
      <p style="font-size:12px;color:#9E8E84;margin:12px 0 0;">Remaining balance is due in cash on the day of your appointment.</p>
    `)}
  `);
}

export function bookingCancelledEmail({ name, service, date }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#2C1A14;margin:0 0 10px;">Booking Cancelled</h2>
      <p style="font-size:13px;color:#6E6058;margin:0 0 8px;line-height:1.7;">Hey <strong>${name}</strong>, your <strong>${service}</strong> appointment on <strong>${date}</strong> has been cancelled.</p>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;">If you'd like to rebook, visit <a href="https://makeupbyroko.com" style="color:#C4849A;">makeupbyroko.com</a> or reach out directly.</p>
    `)}
  `);
}

export function depositReminderEmail({ name, service, date, uploadUrl }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#2C1A14;margin:0 0 10px;">Deposit Reminder</h2>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;">Hey <strong>${name}</strong>, just a friendly reminder to send your Zelle deposit to secure your <strong>${service}</strong> appointment on <strong>${date}</strong>.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;text-align:center;">
      <p style="font-size:13px;color:#2C1A14;margin:0 0 8px;"><strong>Zelle to:</strong> Ruqia Moshref — 510-491-6497</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${uploadUrl}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Upload Your Screenshot</a>
      </td></tr></table>
    </div>
  `);
}

export function feedbackRequestEmail({ name, service }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#2C1A14;margin:0 0 10px;">How did it go? ✨</h2>
      <p style="font-size:13px;color:#6E6058;margin:0 0 12px;line-height:1.7;">Hey <strong>${name}</strong>! I hope you loved your <strong>${service}</strong>. I'd love to hear how it went — would you mind leaving a quick review?</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="https://makeupbyroko.com/#reviews" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Leave a Review ✦</a>
      </td></tr></table>
    `)}
  `);
}

export function classPaymentEmail({ firstName, bookedClasses, totalPaid, catalog }) {
  const classRows = bookedClasses.map(k =>
    `<tr><td style="padding:7px 0;font-size:13px;color:#6E6058;border-bottom:1px solid #F0EAE5;">${catalog[k].title}<br><span style="font-size:11px;color:#A0785A;">${catalog[k].duration}</span></td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">$${catalog[k].price.toLocaleString()}</td></tr>`
  ).join('');

  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#F7EEF2;margin:0 auto 10px;line-height:40px;text-align:center;font-size:18px;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#2C1A14;margin:0 0 4px;">Payment <em style="color:#C4849A;">Confirmed!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#A0785A;margin:0;">Your spot is officially secured ✦</p>
      </div>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! Your payment has been received. I'll reach out within <strong>24–48 hours</strong> to confirm your class schedule and all the details.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Payment Receipt</p>
      <table style="width:100%;border-collapse:collapse;">${classRows}</table>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:8px 0;font-size:14px;font-weight:700;color:#2C1A14;">Total Paid</td><td style="padding:8px 0;font-size:14px;font-weight:700;color:#2C1A14;text-align:right;">$${totalPaid.toLocaleString()}</td></tr>
      </table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">What Happens Next</p>
      ${step(1, 'Roko reaches out within 24–48 hrs', 'To confirm your class date, time & location')}
      ${step(2, 'Prepare any inspiration photos', 'Optional but helpful')}
      ${step(3, 'Show up and learn!', 'All supplies provided — just bring yourself')}
    `)}
  `);
}

export function adminClassPaymentEmail({ reg, bookedClasses, totalPaid, catalog, sessionId }) {
  const classRows = bookedClasses.map(k =>
    `<tr><td style="padding:7px 0;font-size:13px;color:#6E6058;border-bottom:1px solid #F0EAE5;">${catalog[k].title}</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">$${catalog[k].price.toLocaleString()}</td></tr>`
  ).join('');

  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#2C1A14;margin:0 0 10px;">New Class Booking</h2>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;"><strong>${reg.full_name}</strong> just paid <strong>$${totalPaid.toLocaleString()}</strong> via Stripe.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', reg.full_name)}
        ${row('Email', reg.email)}
        ${row('Phone', reg.phone)}
        ${reg.additional_notes ? row('Notes', reg.additional_notes) : ''}
      </table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Classes Booked</p>
      <table style="width:100%;border-collapse:collapse;">${classRows}</table>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:8px 0;font-size:14px;font-weight:700;color:#2C1A14;">Total Paid</td><td style="padding:8px 0;font-size:14px;font-weight:700;color:#2C1A14;text-align:right;">$${totalPaid.toLocaleString()}</td></tr>
      </table>
    `)}
    ${card(`
      <p style="font-size:13px;color:#6E6058;margin:0 0 14px;">Please reach out within 24–48 hours to confirm their class schedule.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="https://makeupby-roko.vercel.app/admin" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBookingEmail({ name, service, date, email, phone, bookingType }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#2C1A14;margin:0 0 10px;">New Booking</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', name)}
        ${row('Service', service)}
        ${row('Date', date)}
        ${row('Email', email)}
        ${row('Phone', phone || 'N/A')}
      </table>
    `)}
    ${card(`
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="https://makeupby-roko.vercel.app/admin" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBridalEmail({ firstName, bridalTitle, weddingDate, bridalDateFormatted, email, phone, eventLocation, eventStartTime, venueAccessTime, numPeopleGlam, outOfState }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#2C1A14;margin:0 0 10px;">New Bridal Inquiry 💍</h2>
      <p style="font-size:13px;color:#6E6058;margin:0;line-height:1.7;"><strong>${firstName}</strong> just submitted a bridal inquiry for <strong>${bridalTitle}</strong>.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', firstName)}
        ${row('Email', email)}
        ${row('Phone', phone || 'N/A')}
      </table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Event Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Service', bridalTitle)}
        ${weddingDate ? row('Wedding Date', weddingDate) : ''}
        ${bridalDateFormatted ? row('Preferred Appt Date', bridalDateFormatted) : ''}
        ${eventLocation ? row('Location', eventLocation) : ''}
        ${eventStartTime ? row('Event Start Time', eventStartTime) : ''}
        ${venueAccessTime ? row('Venue Access Time', venueAccessTime) : ''}
        ${numPeopleGlam ? row('People Getting Glam', numPeopleGlam) : ''}
        ${outOfState !== undefined ? row('Out of State', outOfState ? 'Yes ✈️' : 'No') : ''}
      </table>
    `)}
    ${card(`
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="https://makeupby-roko.vercel.app/admin" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}
