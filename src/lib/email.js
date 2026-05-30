import { Resend } from 'resend';

const FROM = `Roqia Moshref <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
const ADMIN_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupbyroko.com'}/admin`;
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
  <p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0;">Makeup by Roko</p>
</div>
${content}
<div style="text-align:center;padding:20px 0 8px;">
  <p style="font-family:Georgia,serif;font-style:italic;font-size:16px;color:#C4849A;margin:0 0 5px;">With love, Roko</p>
  <p style="font-size:11px;color:#999999;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p>
</div>
</div></body></html>`;
}

function card(content) {
  return `<div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">${content}</div>`;
}

function row(label, value, color) {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#888888;border-bottom:1px solid #F5E8EF;">${label}</td>
    <td style="padding:7px 0;font-size:13px;font-weight:600;color:${color || '#111111'};text-align:right;border-bottom:1px solid #F5E8EF;">${value}</td>
  </tr>`;
}

function step(n, title, sub) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #F5E8EF;">
    <tr>
      <td width="32" valign="top" style="padding:10px 8px 10px 0;">
        <div style="width:22px;height:22px;border-radius:50%;background:#FDF0F5;text-align:center;line-height:22px;font-size:10px;font-weight:700;color:#C4849A;">${n}</div>
      </td>
      <td valign="top" style="padding:10px 0;">
        <p style="font-size:13px;font-weight:600;color:#111111;margin:0 0 2px;">${title}</p>
        <p style="font-size:11px;color:#888888;margin:0;">${sub}</p>
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
    hasTravelFee ? row('Travel fee', '$750+', '#888888') : '',
    isEarlyArrival ? row('Early Arrival (before 7 AM)', '+$100', '#C4849A') : '',
    estimatedTotal ? row('Estimated Total', estimatedTotal) : '',
    row('Date', dateFormatted),
  ].filter(Boolean).join('');

  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#FDF0F5;margin:0 auto 10px;line-height:40px;text-align:center;font-size:18px;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111111;margin:0 0 4px;">Booking Request <em style="color:#C4849A;">Received!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">Can't wait to glam you up ✦</p>
      </div>
      <p style="font-size:14px;color:#111111;margin:0 0 4px;">Hey <strong>${firstName}</strong> 👋</p>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;">Your booking request is in! I'll reach out to confirm your time within <strong>24–48 hours</strong>.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Booking Summary</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;text-align:center;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Action Required — Send Your Deposit</p>
      <p style="font-family:Georgia,serif;font-size:20px;color:#111111;margin:0 0 4px;">${serviceDeposit || 'Deposit required'}</p>
      <p style="font-size:12px;color:#888888;margin:0 0 12px;">Send via Zelle to lock in your date</p>
      <div style="background:#FDF8FA;border-radius:10px;padding:12px;margin-bottom:12px;text-align:left;border:1px solid #F0E0E9;">
        <p style="font-size:13px;color:#111111;margin:0 0 4px;"><strong>Zelle to:</strong> Ruqia Moshref</p>
        <p style="font-size:13px;color:#111111;margin:0;"><strong>Phone:</strong> 510-491-6497</p>
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
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111111;margin:0 0 4px;">You're on <em style="color:#C4849A;">the list!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">I can't wait to be part of your big day ✦</p>
      </div>
      <p style="font-size:14px;color:#111111;margin:0 0 4px;">Hey <strong>${firstName}</strong> 👰</p>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;">Your bridal inquiry for <strong>${bridalTitle}</strong> on <strong>${bridalDateFormatted}</strong> has been received! I'll be in touch within <strong>24–48 hours</strong>.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;text-align:center;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Action Required — Send Your Deposit</p>
      <p style="font-family:Georgia,serif;font-size:20px;color:#111111;margin:0 0 4px;">${bridalDeposit}</p>
      <div style="background:#FDF8FA;border-radius:10px;padding:12px;margin-bottom:12px;text-align:left;border:1px solid #F0E0E9;">
        <p style="font-size:13px;color:#111111;margin:0 0 4px;"><strong>Zelle to:</strong> Ruqia Moshref</p>
        <p style="font-size:13px;color:#111111;margin:0;"><strong>Phone:</strong> 510-491-6497</p>
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

export function bookingConfirmedEmail({ firstName, serviceName, dateFormatted, time }) {
  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FDF0F5,#F7D8E5);margin:0 auto 12px;line-height:48px;text-align:center;font-size:20px;color:#C4849A;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#111111;margin:0 0 4px;">You're <em style="color:#C4849A;">Confirmed!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">Can't wait to see you ✦</p>
      </div>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! Your <strong>${serviceName}</strong> appointment on <strong>${dateFormatted}</strong>${time ? ` at <strong>${time}</strong>` : ''} is officially confirmed. I'm so excited, see you then!</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Appointment Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Service', serviceName)}
        ${row('Date', dateFormatted)}
        ${time ? row('Time', `<strong>${time}</strong>`) : ''}
        ${row('Status', '<span style="color:#C4849A;font-weight:700;">✓ Confirmed</span>')}
      </table>
      <div style="margin-top:12px;padding:10px 12px;background:#FDF8FA;border-radius:8px;border-left:3px solid #E8C4D0;">
        <p style="font-size:12px;color:#888888;margin:0;">💵 Remaining balance is due in <strong>cash</strong> on the day of your appointment.</p>
      </div>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">What to Expect</p>
      ${step(1, 'Arrive on time', time ? `Roko will be ready for you at ${time}` : 'Roko will be ready for you at your confirmed time')}
      ${step(2, 'Bring your inspiration', 'Photos of your desired look are always welcome')}
      ${step(3, 'Bring cash for remaining balance', 'Exact amount confirmed with Roko beforehand')}
    `)}
  `);
}

export function bookingCancelledEmail({ name, service, date }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 10px;">Booking Cancelled</h2>
      <p style="font-size:13px;color:#444444;margin:0 0 8px;line-height:1.7;">Hey <strong>${name}</strong>, your <strong>${service}</strong> appointment on <strong>${date}</strong> has been cancelled.</p>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">If you'd like to rebook, visit <a href="https://makeupbyroko.com" style="color:#C4849A;">makeupbyroko.com</a> or reach out directly.</p>
    `)}
  `);
}

export function depositReminderEmail({ name, service, date, uploadUrl }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 10px;">Deposit Reminder</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">Hey <strong>${name}</strong>, just a friendly reminder to send your Zelle deposit to secure your <strong>${service}</strong> appointment on <strong>${date}</strong>.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;text-align:center;">
      <p style="font-size:13px;color:#111111;margin:0 0 8px;"><strong>Zelle to:</strong> Ruqia Moshref — 510-491-6497</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${uploadUrl}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Upload Your Screenshot</a>
      </td></tr></table>
    </div>
  `);
}

export function feedbackRequestEmail({ name, service }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 10px;">How did it go? ✨</h2>
      <p style="font-size:13px;color:#444444;margin:0 0 12px;line-height:1.7;">Hey <strong>${name}</strong>! I hope you loved your <strong>${service}</strong>. I'd love to hear how it went. Would you mind leaving a quick review?</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="https://makeupbyroko.com/#reviews" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Leave a Review ✦</a>
      </td></tr></table>
    `)}
  `);
}

export function classPaymentEmail({ firstName, bookedClasses, totalPaid, catalog }) {
  const classRows = bookedClasses.map(k =>
    `<tr><td style="padding:7px 0;font-size:13px;color:#444444;border-bottom:1px solid #F5E8EF;">${catalog[k].title}<br><span style="font-size:11px;color:#888888;">${catalog[k].duration}</span></td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#111111;text-align:right;border-bottom:1px solid #F5E8EF;">$${catalog[k].price.toLocaleString()}</td></tr>`
  ).join('');

  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#FDF0F5;margin:0 auto 10px;line-height:40px;text-align:center;font-size:18px;">✓</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111111;margin:0 0 4px;">Payment <em style="color:#C4849A;">Confirmed!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">Your spot is officially secured ✦</p>
      </div>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! Your payment has been received. I'll reach out within <strong>24–48 hours</strong> to confirm your class schedule and all the details.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Payment Receipt</p>
      <table style="width:100%;border-collapse:collapse;">${classRows}</table>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:8px 0;font-size:14px;font-weight:700;color:#111111;">Total Paid</td><td style="padding:8px 0;font-size:14px;font-weight:700;color:#111111;text-align:right;">$${totalPaid.toLocaleString()}</td></tr>
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
    `<tr><td style="padding:7px 0;font-size:13px;color:#444444;border-bottom:1px solid #F5E8EF;">${catalog[k].title}</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#111111;text-align:right;border-bottom:1px solid #F5E8EF;">$${catalog[k].price.toLocaleString()}</td></tr>`
  ).join('');

  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 10px;">New Class Booking</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;"><strong>${reg.full_name}</strong> just paid <strong>$${totalPaid.toLocaleString()}</strong> via Stripe.</p>
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
        <tr><td style="padding:8px 0;font-size:14px;font-weight:700;color:#111111;">Total Paid</td><td style="padding:8px 0;font-size:14px;font-weight:700;color:#111111;text-align:right;">$${totalPaid.toLocaleString()}</td></tr>
      </table>
    `)}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;">Please reach out within 24–48 hours to confirm their class schedule.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBookingEmail({ name, service, date, email, phone, bookingType }) {
  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 10px;">New Booking</h2>
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
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBridalEmail({ firstName, bridalTitle, weddingDate, bridalDateFormatted, email, phone, eventLocation, eventStartTime, venueAccessTime, numPeopleGlam, outOfState }) {
  return base(`
    <div style="background:#C4849A;border-radius:14px;padding:20px;margin-bottom:10px;text-align:center;">
      <p style="font-size:28px;margin:0 0 8px;">💍</p>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#ffffff;margin:0 0 4px;">New Bridal Inquiry</h2>
      <p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;"><strong>${firstName}</strong> just submitted a bridal inquiry for <strong>${bridalTitle}</strong>.</p>
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', firstName)}
        ${row('Email', email)}
        ${row('Phone', phone || 'N/A')}
      </table>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Event Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Service', `<strong style="color:#C4849A;">${bridalTitle}</strong>`)}
        ${weddingDate ? row('Wedding Date', `<strong>${weddingDate}</strong>`) : ''}
        ${bridalDateFormatted ? row('Preferred Appt', bridalDateFormatted) : ''}
        ${eventLocation ? row('Location', eventLocation) : ''}
        ${eventStartTime ? row('Event Starts', eventStartTime) : ''}
        ${venueAccessTime ? row('Venue Access', venueAccessTime) : ''}
        ${numPeopleGlam ? row('People Getting Glam', numPeopleGlam) : ''}
        ${outOfState !== undefined ? row('Out of State', outOfState ? 'Yes' : 'No, local') : ''}
      </table>
    </div>
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;">Reach out within <strong>24–48 hours</strong> to confirm and schedule their consultation.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function consultationScheduledEmail({ firstName, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes }) {
  const typeLabel = consultationType === 'Phone' ? '📞' : consultationType === 'In-Person' ? '📍' : '';

  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FDF0F5,#F7D8E5);margin:0 auto 12px;line-height:48px;text-align:center;font-size:22px;">📅</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111111;margin:0 0 4px;">Consultation <em style="color:#C4849A;">Scheduled!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">Can't wait to connect with you ✦</p>
      </div>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! Your consultation for <strong>${serviceName}</strong> has been scheduled. Here are your details:</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Consultation Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Date', `<strong>${consultationDate}</strong>`)}
        ${row('Time', `<strong>${consultationTime}</strong>`)}
        ${row('Type', `${typeLabel ? typeLabel + ' ' : ''}<strong>${consultationType}</strong>`)}
        ${consultationNotes ? row('Notes', consultationNotes) : ''}
      </table>
      ${zoomLink ? `
      <div style="margin-top:14px;padding:14px;background:#FDF0F5;border-radius:12px;border:1px solid #E8C4D0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Your Zoom Link</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${zoomLink}" style="display:inline-block;background:#111111;color:#ffffff;padding:13px 32px;border-radius:50px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.04em;">Join Zoom Call</a>
        </td></tr></table>
        <p style="font-size:11px;color:#999999;text-align:center;margin:10px 0 0;word-break:break-all;">${zoomLink}</p>
      </div>` : ''}
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">To Prepare</p>
      ${step(1, 'Have your inspiration photos ready', 'Screenshots, Pinterest boards, anything you love')}
      ${step(2, 'Think about your vibe', 'Natural glam, bold, soft, anything goes!')}
      ${step(3, 'Write down any questions', 'Roko is here to answer everything')}
    `)}
  `);
}

export function adminConsultationEmail({ clientName, clientEmail, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes }) {
  const typeLabel = consultationType === 'Phone' ? '📞' : consultationType === 'In-Person' ? '📍' : '';
  return base(`
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Admin Copy — Consultation Sent</p>
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">📅 Consultation Scheduled</h2>
      <p style="font-size:13px;color:#444444;margin:0;">Consultation confirmed with <strong>${clientName || clientEmail}</strong> for <strong>${serviceName}</strong>.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', clientName || 'N/A')}
        ${row('Email', clientEmail || 'N/A')}
        ${row('Service', serviceName || 'N/A')}
      </table>
    </div>
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Consultation Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Date', `<strong>${consultationDate}</strong>`)}
        ${row('Time', `<strong>${consultationTime}</strong>`)}
        ${row('Type', `${typeLabel ? typeLabel + ' ' : ''}${consultationType}`)}
        ${zoomLink ? row('Zoom Link', `<a href="${zoomLink}" style="color:#C4849A;word-break:break-all;">${zoomLink}</a>`) : ''}
        ${consultationNotes ? row('Notes', consultationNotes) : ''}
      </table>
    </div>
    ${card(`
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function enrolledLessonEmail({ firstName, className, lessonDate, lessonTime, meetingType, zoomLink, clientPhone, notes }) {
  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FDF0F5,#F7D8E5);margin:0 auto 12px;line-height:48px;text-align:center;font-size:22px;">🎉</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111111;margin:0 0 4px;">You're <em style="color:#C4849A;">Enrolled!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">So excited to work with you ✦</p>
      </div>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! You are officially enrolled in <strong>${className}</strong> and your lesson is all set. Here are your details:</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Lesson Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Date', `<strong>${lessonDate}</strong>`)}
        ${row('Time', `<strong>${lessonTime}</strong>`)}
        ${row('Format', `<strong>${meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType}</strong>`)}
        ${notes ? row('Notes', notes) : ''}
      </table>
      ${meetingType === 'Zoom' && zoomLink ? `
      <div style="margin-top:14px;padding:14px;background:#FDF0F5;border-radius:12px;border:1px solid #E8C4D0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Your Zoom Link</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${zoomLink}" style="display:inline-block;background:#111111;color:#ffffff;padding:13px 32px;border-radius:50px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.04em;">Join Zoom Call</a>
        </td></tr></table>
        <p style="font-size:11px;color:#999999;text-align:center;margin:10px 0 0;word-break:break-all;">${zoomLink}</p>
      </div>` : ''}
      ${meetingType === 'Phone' && clientPhone ? `
      <div style="margin-top:14px;padding:14px;background:#FDF0F5;border-radius:12px;border:1px solid #E8C4D0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">How We Will Connect</p>
        <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;">Roqia will call you at <strong>${clientPhone}</strong> on ${lessonDate} at ${lessonTime}. Make sure your phone is on!</p>
      </div>` : ''}
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">To Prepare</p>
      ${step(1, 'Come with a clean face', 'No makeup or light moisturizer only. We are starting fresh!')}
      ${step(2, 'Bring your current makeup bag', 'We will go through your products and build from what you have')}
      ${step(3, 'Have your inspiration ready', 'Save looks you love so we can break down the techniques together')}
      ${step(4, 'Come with questions', 'No question is too basic. This lesson is all about you!')}
    `)}
  `);
}

export function lessonScheduledEmail({ firstName, className, lessonDate, lessonTime, meetingType, zoomLink, notes }) {
  return base(`
    ${card(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FDF0F5,#F7D8E5);margin:0 auto 12px;line-height:48px;text-align:center;font-size:22px;">💄</div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111111;margin:0 0 4px;">Makeup Lesson <em style="color:#C4849A;">Scheduled!</em></h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#888888;margin:0;">So excited to teach you ✦</p>
      </div>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;">Hey <strong>${firstName}</strong>! Your <strong>${className}</strong> has been scheduled. Here are your details:</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:2px solid #E8C4D0;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Lesson Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Date', `<strong>${lessonDate}</strong>`)}
        ${row('Time', `<strong>${lessonTime}</strong>`)}
        ${row('Format', `<strong>${meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType}</strong>`)}
        ${notes ? row('Notes', notes) : ''}
      </table>
      ${zoomLink ? `
      <div style="margin-top:14px;padding:14px;background:#FDF0F5;border-radius:12px;border:1px solid #E8C4D0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Your Zoom Link</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${zoomLink}" style="display:inline-block;background:#111111;color:#ffffff;padding:13px 32px;border-radius:50px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.04em;">Join Zoom Call</a>
        </td></tr></table>
        <p style="font-size:11px;color:#999999;text-align:center;margin:10px 0 0;word-break:break-all;">${zoomLink}</p>
      </div>` : ''}
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">To Prepare</p>
      ${step(1, 'Come with a clean face', 'No makeup or light moisturizer only. We are starting fresh!')}
      ${step(2, 'Bring your current makeup bag', 'We will go through your products and build from what you have')}
      ${step(3, 'Have your inspiration ready', 'Save looks you love so we can break down the techniques together')}
      ${step(4, 'Come with questions', 'No question is too basic. This lesson is all about you!')}
    `)}
  `);
}

export function adminLessonEmail({ clientName, clientEmail, className, lessonDate, lessonTime, meetingType, zoomLink, notes }) {
  return base(`
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Admin Copy — Lesson Scheduled</p>
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">💄 Makeup Lesson Scheduled</h2>
      <p style="font-size:13px;color:#444444;margin:0;">Lesson confirmed with <strong>${clientName || clientEmail}</strong> for <strong>${className}</strong>.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', clientName || 'N/A')}
        ${row('Email', clientEmail || 'N/A')}
        ${row('Class', className || 'N/A')}
      </table>
    </div>
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Lesson Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Date', `<strong>${lessonDate}</strong>`)}
        ${row('Time', `<strong>${lessonTime}</strong>`)}
        ${row('Format', meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType)}
        ${zoomLink ? row('Zoom Link', `<a href="${zoomLink}" style="color:#C4849A;word-break:break-all;">${zoomLink}</a>`) : ''}
        ${notes ? row('Notes', notes) : ''}
      </table>
    </div>
    ${card(`
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}
