import { Resend } from 'resend';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
const FROM = `Makeup by Roko <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'makeupbyroko22@gmail.com';
const ADMIN_URL = `${SITE_URL}/admin`;

// ─── Admin email primitives (kept simple & info-dense) ─────────────────────────

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

// ─── Client email design system (Uber-receipt style) ───────────────────────────
// Big branded header + date, large hero, clear amounts, clean itemized rows.
// Table-based & fluid so it renders well on desktop and mobile.

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
}

function clientShell({ preheader, content }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#F1EAED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:#F1EAED;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EAED;"><tr><td align="center" style="padding:24px 12px 32px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 4px 24px rgba(140,90,110,0.10);">
    <tr><td style="padding:20px 28px;border-bottom:1px solid #F0E6EC;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;color:#16110F;letter-spacing:0.01em;">Makeup by <span style="color:#C4849A;font-style:italic;">Roko</span></td>
        <td align="right" style="font-size:12px;color:#A99FA4;white-space:nowrap;">${todayStr()}</td>
      </tr></table>
    </td></tr>
    ${content}
    <tr><td style="padding:26px 28px 30px;background:#FBF5F8;border-top:1px solid #F0E6EC;text-align:center;">
      <p style="font-family:Georgia,serif;font-style:italic;font-size:17px;color:#C4849A;margin:0 0 8px;">With love, Roko</p>
      <p style="font-size:12px;color:#9A8E94;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p>
      <p style="font-size:11px;color:#C3B8BE;margin:10px 0 0;">Makeup by Roko · Mountain House, CA</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function clientHero({ eyebrow, title, titleAccent, subtitle, emoji }) {
  return `<tr><td style="padding:40px 28px 32px;background:#FBF5F8;border-bottom:1px solid #F0E6EC;text-align:center;">
    ${emoji ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;"><tr><td width="54" height="54" align="center" valign="middle" bgcolor="#ffffff" style="border-radius:50%;font-size:24px;box-shadow:0 2px 10px rgba(196,132,154,0.20);">${emoji}</td></tr></table>` : ''}
    ${eyebrow ? `<p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 14px;">${eyebrow}</p>` : ''}
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.16;font-weight:400;color:#16110F;margin:0;">${title}${titleAccent ? `<br><span style="color:#C4849A;font-style:italic;">${titleAccent}</span>` : ''}</h1>
    ${subtitle ? `<p style="font-size:14px;color:#857A80;margin:14px 0 0;line-height:1.55;">${subtitle}</p>` : ''}
  </td></tr>`;
}

function cintro(html) {
  return `<tr><td style="padding:24px 30px 8px;text-align:center;">
    <p style="font-size:15px;color:#5A5258;line-height:1.65;margin:0;">${html}</p>
  </td></tr>`;
}

function cheadline(label, amount, sub) {
  return `<tr><td style="padding:18px 28px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F0E6EC;border-bottom:1px solid #F0E6EC;">
      <tr>
        <td style="padding:18px 0;font-family:Georgia,serif;font-size:22px;color:#16110F;">${label}</td>
        <td align="right" style="padding:18px 0;font-family:Georgia,serif;font-size:30px;color:#16110F;">${amount}</td>
      </tr>
    </table>
    ${sub ? `<p style="font-size:12px;color:#9A8E94;margin:8px 0 0;text-align:right;">${sub}</p>` : ''}
  </td></tr>`;
}

function ctitle(t) {
  return `<p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 12px;">${t}</p>`;
}

function cpanel(inner) {
  return `<tr><td style="padding:14px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #F0E6EC;border-radius:16px;background:#ffffff;">
      <tr><td style="padding:20px 22px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function crows(rowsHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>`;
}

function crow(label, value, color) {
  return `<tr>
    <td style="padding:11px 0;font-size:14px;color:#6B636A;border-bottom:1px solid #F4ECF1;">${label}</td>
    <td align="right" style="padding:11px 0;font-size:14px;font-weight:600;color:${color || '#16110F'};border-bottom:1px solid #F4ECF1;">${value}</td>
  </tr>`;
}

function ctotalRow(label, value) {
  return `<tr>
    <td style="padding:16px 0 2px;font-family:Georgia,serif;font-size:17px;color:#16110F;">${label}</td>
    <td align="right" style="padding:16px 0 2px;font-family:Georgia,serif;font-size:24px;color:#16110F;">${value}</td>
  </tr>`;
}

function clientButton(href, label, dark) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
    <td align="center" bgcolor="${dark ? '#16110F' : '#C4849A'}" style="border-radius:12px;">
      <a href="${href}" style="display:inline-block;padding:15px 34px;font-size:14px;font-weight:700;letter-spacing:0.02em;color:#ffffff;text-decoration:none;border-radius:12px;">${label}</a>
    </td>
  </tr></table>`;
}

function cstep(n, title, sub) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="38" valign="top" style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="26" height="26" align="center" valign="middle" bgcolor="#FBF1F6" style="border-radius:50%;font-size:12px;font-weight:700;color:#C4849A;">${n}</td></tr></table>
    </td>
    <td valign="top" style="padding:8px 0 8px 4px;">
      <p style="font-size:14px;font-weight:600;color:#16110F;margin:0 0 2px;">${title}</p>
      <p style="font-size:13px;color:#857A80;margin:0;line-height:1.5;">${sub}</p>
    </td>
  </tr></table>`;
}

function cstepsPanel(title, steps) {
  return cpanel(`${ctitle(title)}${steps.map(s => cstep(s[0], s[1], s[2])).join('')}`);
}

function cinfo(html) {
  return `<tr><td style="padding:6px 24px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF5F8;border-radius:12px;border-left:3px solid #E8C4D0;"><tr><td style="padding:13px 16px;font-size:13px;color:#6B636A;line-height:1.55;">${html}</td></tr></table>
  </td></tr>`;
}

function cZoom(zoomLink) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF1F6;border:1px solid #F0D9E6;border-radius:12px;"><tr><td style="padding:16px;text-align:center;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 12px;">Your Zoom Link</p>
    ${clientButton(zoomLink, 'Join Zoom Call', true)}
    <p style="font-size:11px;color:#A99FA4;margin:12px 0 0;word-break:break-all;">${zoomLink}</p>
  </td></tr></table>`;
}

function cdeposit({ amount, uploadUrl, hideAmount, photos }) {
  return `<tr><td style="padding:16px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF1F6;border:1px solid #F0D9E6;border-radius:18px;">
      <tr><td style="padding:26px 22px;text-align:center;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4849A;margin:0 0 ${hideAmount ? '4px' : '8px'};">${hideAmount ? 'Send Your Deposit' : 'Reserve Your Date'}</p>
        ${hideAmount ? '' : `<p style="font-family:Georgia,serif;font-size:36px;line-height:1;color:#16110F;margin:0 0 4px;">${amount}</p>`}
        <p style="font-size:13px;color:#8A7F85;margin:0 0 18px;">Send via Zelle to lock in your date</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #F0E0E9;margin:0 0 18px;"><tr><td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px;color:#9A8E94;padding:0 0 6px;">Zelle to</td><td align="right" style="font-size:13px;color:#16110F;font-weight:700;padding:0 0 6px;">Ruqia Moshref</td></tr>
            <tr><td style="font-size:13px;color:#9A8E94;">Phone</td><td align="right" style="font-size:13px;color:#16110F;font-weight:700;">510-491-6497</td></tr>
          </table>
        </td></tr></table>
        ${clientButton(uploadUrl, photos ? 'Upload Screenshot & Photos' : 'Upload Zelle Screenshot')}
        ${photos ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;background:#ffffff;border:1px solid #F0E0E9;border-radius:12px;"><tr><td style="padding:13px 16px;text-align:left;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#C4849A;margin:0 0 4px;">Also upload your photos</p>
          <p style="font-size:12px;color:#6B636A;margin:0;line-height:1.55;">Use this same link to add photos of yourself <strong style="color:#16110F;">with makeup</strong> and <strong style="color:#16110F;">without makeup</strong> so Roko can prep for your consultation.</p>
        </td></tr></table>` : ''}
        <p style="font-size:12px;color:#A99FA4;margin:14px 0 0;line-height:1.5;">Include your name + appointment date in the Zelle note. Remaining balance in cash on the day.</p>
      </td></tr>
    </table>
  </td></tr>`;
}

// ─── Client Templates ──────────────────────────────────────────────────────────

export async function sendEmail({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({ from: FROM, to: [to], replyTo: REPLY_TO, subject, html });
  if (result.error) throw new Error(result.error.message);
  return result;
}

export async function sendEmailPair(emails) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = await Promise.allSettled(
    emails.map(({ to, subject, html }) =>
      resend.emails.send({ from: FROM, to: [to], replyTo: REPLY_TO, subject, html })
        .then(r => { if (r.error) throw new Error(r.error.message); return r; })
    )
  );
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Email ${i} failed:`, r.reason);
  });
}

export function bookingConfirmationEmail({ firstName, serviceName, servicePrice, serviceDeposit, dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal }) {
  const basePrice = hasTravelFee ? '$750+' : servicePrice;
  const summaryRows = [
    crow('Service', serviceName),
    crow('Date', dateFormatted),
    crow('Base price', basePrice),
    hasTravelFee ? crow('Travel (bridal pricing)', '$750+', '#C4849A') : '',
    isEarlyArrival ? crow('Early arrival (before 7 AM)', '+$100', '#C4849A') : '',
  ].filter(Boolean).join('');
  const total = estimatedTotal || basePrice;

  return clientShell({
    preheader: `Your ${serviceName} request is in. Send your deposit to lock in ${dateFormatted}.`,
    content: `
      ${clientHero({ eyebrow: 'Booking Request Received', title: 'Thanks for booking,', titleAccent: firstName, subtitle: "Can't wait to glam you up ✦" })}
      ${cintro(`Your request is in! I'll reach out to confirm your time within <strong style="color:#16110F;">24–48 hours</strong>.`)}
      ${cpanel(`${ctitle('Booking Summary')}${crows(summaryRows + ctotalRow('Estimated Total', total))}`)}
      ${cdeposit({ amount: serviceDeposit || 'Deposit', uploadUrl })}
      ${cstepsPanel('What Happens Next', [
        ['1', 'Send your Zelle deposit', 'Ruqia Moshref · 510-491-6497'],
        ['2', 'Upload your screenshot', 'Use the secure button above'],
        ['3', 'Roko confirms your appointment', 'Within 24–48 hours'],
      ])}
    `,
  });
}

export function bridalConfirmationEmail({ firstName, bridalTitle, bridalDateFormatted, bridalDeposit, uploadUrl }) {
  return clientShell({
    preheader: `Your bridal inquiry for ${bridalTitle} has been received ✦`,
    content: `
      ${clientHero({ eyebrow: 'Bridal Inquiry Received', title: "You're on", titleAccent: 'the list!', subtitle: "I can't wait to be part of your big day ✦" })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>, your bridal inquiry is in! I'll be in touch within <strong style="color:#16110F;">24–48 hours</strong> to confirm everything and schedule your consultation.`)}
      ${cpanel(`${ctitle('Inquiry Summary')}${crows(
        crow('Package', `<strong style="color:#C4849A;">${bridalTitle}</strong>`) +
        crow('Preferred Date', bridalDateFormatted)
      )}`)}
      ${cdeposit({ amount: bridalDeposit, uploadUrl, photos: true })}
      ${cstepsPanel('What Happens Next', [
        ['1', 'Send your Zelle deposit', 'Ruqia Moshref · 510-491-6497'],
        ['2', 'Upload your screenshot & photos', 'Use your personal link above'],
        ['3', 'Roko reaches out for your consultation', 'To go over your vision and bridal look'],
      ])}
    `,
  });
}

export function bookingConfirmedEmail({ firstName, serviceName, dateFormatted, time }) {
  return clientShell({
    preheader: `You're confirmed for ${serviceName} on ${dateFormatted}.`,
    content: `
      ${clientHero({ emoji: '✓', eyebrow: 'Appointment Confirmed', title: "You're", titleAccent: 'Confirmed!', subtitle: "Can't wait to see you ✦" })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your appointment is officially confirmed. I'm so excited, see you then!`)}
      ${cpanel(`${ctitle('Appointment Details')}${crows(
        crow('Service', serviceName) +
        crow('Date', dateFormatted) +
        (time ? crow('Time', `<strong>${time}</strong>`) : '') +
        crow('Status', '<span style="color:#C4849A;font-weight:700;">✓ Confirmed</span>')
      )}`)}
      ${cinfo(`💵 Remaining balance is due in <strong style="color:#16110F;">cash</strong> on the day of your appointment.`)}
      ${cstepsPanel('What to Expect', [
        ['1', 'Arrive on time', time ? `Roko will be ready for you at ${time}` : 'Roko will be ready at your confirmed time'],
        ['2', 'Bring your inspiration', 'Photos of your desired look are always welcome'],
        ['3', 'Bring cash for the balance', 'Exact amount confirmed with Roko beforehand'],
      ])}
    `,
  });
}

export function bookingCancelledEmail({ name, service, date }) {
  return clientShell({
    preheader: `Your ${service} appointment has been cancelled.`,
    content: `
      ${clientHero({ eyebrow: 'Booking Update', title: 'Booking', titleAccent: 'Cancelled' })}
      ${cintro(`Hey <strong style="color:#16110F;">${name}</strong>, your <strong style="color:#16110F;">${service}</strong> appointment on <strong style="color:#16110F;">${date}</strong> has been cancelled.`)}
      ${cpanel(`<p style="font-size:14px;color:#5A5258;line-height:1.65;margin:0;text-align:center;">If you'd like to rebook, visit <a href="${SITE_URL}" style="color:#C4849A;text-decoration:none;font-weight:600;">makeupbyroko.org</a> or reach out anytime.</p>`)}
      <tr><td style="padding:4px 24px 18px;text-align:center;">${clientButton(SITE_URL, 'Book Again')}</td></tr>
    `,
  });
}

export function depositReminderEmail({ name, service, date, uploadUrl }) {
  return clientShell({
    preheader: `Friendly reminder: send your deposit to secure ${service}.`,
    content: `
      ${clientHero({ emoji: '⏰', eyebrow: 'Deposit Reminder', title: 'Secure your', titleAccent: 'date' })}
      ${cintro(`Hey <strong style="color:#16110F;">${name}</strong>, just a friendly reminder to send your Zelle deposit to secure your <strong style="color:#16110F;">${service}</strong> appointment on <strong style="color:#16110F;">${date}</strong>.`)}
      ${cdeposit({ uploadUrl, hideAmount: true })}
    `,
  });
}

export function feedbackRequestEmail({ name, service }) {
  return clientShell({
    preheader: `How did your ${service} go? Leave Roko a quick review ✨`,
    content: `
      ${clientHero({ emoji: '✨', eyebrow: "We'd Love Your Feedback", title: 'How did it', titleAccent: 'go?' })}
      ${cintro(`Hey <strong style="color:#16110F;">${name}</strong>! I hope you loved your <strong style="color:#16110F;">${service}</strong>. I'd love to hear how it went. Would you mind leaving a quick review?`)}
      <tr><td style="padding:8px 24px 18px;text-align:center;">${clientButton(`${SITE_URL}/#reviews`, 'Leave a Review ✦')}</td></tr>
    `,
  });
}

export function classPaymentEmail({ firstName, bookedClasses, totalPaid, catalog }) {
  const classRows = bookedClasses.map(k =>
    crow(`${catalog[k].title}<br><span style="font-size:12px;color:#9A8E94;">${catalog[k].duration}</span>`, `$${catalog[k].price.toLocaleString()}`)
  ).join('');

  return clientShell({
    preheader: `Payment received. You're officially booked! 🎨`,
    content: `
      ${clientHero({ emoji: '✓', eyebrow: 'Payment Confirmed', title: 'Your spot is', titleAccent: 'secured!' })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your payment has been received. I'll reach out within <strong style="color:#16110F;">24–48 hours</strong> to confirm your class schedule and all the details.`)}
      ${cheadline('Total Paid', `$${totalPaid.toLocaleString()}`, 'Paid via Stripe')}
      ${cpanel(`${ctitle('Your Classes')}${crows(classRows)}`)}
      ${cstepsPanel('What Happens Next', [
        ['1', 'Roko reaches out within 24–48 hrs', 'To confirm your class date, time & location'],
        ['2', 'Prepare any inspiration photos', 'Optional but helpful'],
        ['3', 'Show up and learn!', 'All supplies provided, just bring yourself'],
      ])}
    `,
  });
}

export function consultationScheduledEmail({ firstName, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes }) {
  const typeLabel = consultationType === 'Phone' ? '📞 ' : consultationType === 'In-Person' ? '📍 ' : '';
  return clientShell({
    preheader: `Your consultation for ${serviceName} is scheduled.`,
    content: `
      ${clientHero({ emoji: '📅', eyebrow: 'Consultation Scheduled', title: "Let's", titleAccent: 'connect!', subtitle: "Can't wait to chat about your look ✦" })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your consultation for <strong style="color:#16110F;">${serviceName}</strong> is set. Here are your details:`)}
      ${cpanel(`${ctitle('Consultation Details')}${crows(
        crow('Date', `<strong>${consultationDate}</strong>`) +
        crow('Time', `<strong>${consultationTime}</strong>`) +
        crow('Type', `${typeLabel}<strong>${consultationType}</strong>`) +
        (consultationNotes ? crow('Notes', consultationNotes) : '')
      )}${zoomLink ? cZoom(zoomLink) : ''}`)}
      ${cstepsPanel('To Prepare', [
        ['1', 'Have your inspiration photos ready', 'Screenshots, Pinterest boards, anything you love'],
        ['2', 'Think about your vibe', 'Natural glam, bold, soft, anything goes!'],
        ['3', 'Write down any questions', 'Roko is here to answer everything'],
      ])}
    `,
  });
}

export function enrolledLessonEmail({ firstName, className, lessonDate, lessonTime, meetingType, zoomLink, clientPhone, notes }) {
  const fmt = meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType;
  let connect = '';
  if (meetingType === 'Zoom' && zoomLink) {
    connect = cZoom(zoomLink);
  } else if (meetingType === 'Phone' && clientPhone) {
    connect = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF1F6;border:1px solid #F0D9E6;border-radius:12px;"><tr><td style="padding:16px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">How We Will Connect</p>
      <p style="font-size:14px;color:#5A5258;margin:0;line-height:1.55;">Roqia will call you at <strong style="color:#16110F;">${clientPhone}</strong> on ${lessonDate} at ${lessonTime}. Make sure your phone is on!</p>
    </td></tr></table>`;
  }
  return clientShell({
    preheader: `You're enrolled in ${className}!`,
    content: `
      ${clientHero({ emoji: '🎉', eyebrow: "You're Enrolled", title: "You're", titleAccent: 'in!', subtitle: 'So excited to work with you ✦' })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! You're officially enrolled in <strong style="color:#16110F;">${className}</strong> and your lesson is all set.`)}
      ${cpanel(`${ctitle('Lesson Details')}${crows(
        crow('Date', `<strong>${lessonDate}</strong>`) +
        crow('Time', `<strong>${lessonTime}</strong>`) +
        crow('Format', `<strong>${fmt}</strong>`) +
        (notes ? crow('Notes', notes) : '')
      )}${connect}`)}
      ${cstepsPanel('To Prepare', [
        ['1', 'Come with a clean face', 'No makeup, or light moisturizer only. We start fresh!'],
        ['2', 'Bring your current makeup bag', "We'll build from what you already have"],
        ['3', 'Have your inspiration ready', 'Save looks you love so we can break them down together'],
        ['4', 'Come with questions', 'No question is too basic. This lesson is all about you!'],
      ])}
    `,
  });
}

export function lessonScheduledEmail({ firstName, className, lessonDate, lessonTime, meetingType, zoomLink, notes }) {
  const fmt = meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType;
  return clientShell({
    preheader: `Your ${className} is scheduled.`,
    content: `
      ${clientHero({ emoji: '💄', eyebrow: 'Lesson Scheduled', title: 'Your lesson is', titleAccent: 'set!', subtitle: 'So excited to teach you ✦' })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your <strong style="color:#16110F;">${className}</strong> has been scheduled. Here are your details:`)}
      ${cpanel(`${ctitle('Lesson Details')}${crows(
        crow('Date', `<strong>${lessonDate}</strong>`) +
        crow('Time', `<strong>${lessonTime}</strong>`) +
        crow('Format', `<strong>${fmt}</strong>`) +
        (notes ? crow('Notes', notes) : '')
      )}${zoomLink ? cZoom(zoomLink) : ''}`)}
      ${cstepsPanel('To Prepare', [
        ['1', 'Come with a clean face', 'No makeup, or light moisturizer only. We start fresh!'],
        ['2', 'Bring your current makeup bag', "We'll build from what you already have"],
        ['3', 'Have your inspiration ready', 'Save looks you love so we can break them down together'],
        ['4', 'Come with questions', 'No question is too basic. This lesson is all about you!'],
      ])}
    `,
  });
}

// ─── Admin Templates (kept simple & info-dense) ────────────────────────────────

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

export function adminBookingEmail({ name, service, date, email, phone, servicePrice, deposit, readyByTime, isEarlyArrival, hasTravelFee, estimatedTotal, notes }) {
  const bookingRows = [
    row('Service', `<strong style="color:#C4849A;">${service}</strong>`),
    row('Requested Date', `<strong>${date}</strong>`),
    readyByTime ? row('Ready by (preference)', readyByTime) : '',
    row('Location', hasTravelFee ? '✈️ Travel to client' : "Roko's studio", hasTravelFee ? '#C4849A' : '#111111'),
    row('Done before 7 AM?', isEarlyArrival ? 'Yes — early arrival' : 'No', isEarlyArrival ? '#C4849A' : '#111111'),
  ].filter(Boolean).join('');

  const pricingRows = [
    row('Base Price', hasTravelFee ? '$750+ (travel · bridal pricing)' : (servicePrice || '—')),
    isEarlyArrival ? row('Early Arrival (before 7 AM)', '+$100', '#C4849A') : '',
    deposit ? row('Deposit to Book', deposit) : '',
    estimatedTotal ? row('Estimated Total', `<strong>${estimatedTotal}</strong>`) : '',
  ].filter(Boolean).join('');

  return base(`
    ${card(`
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">New Booking</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;">New booking request from <strong>${name}</strong>. Here's everything they submitted:</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', name)}
        ${row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`)}
        ${row('Phone', phone ? `<a href="tel:${phone}" style="color:#C4849A;text-decoration:none;">${phone}</a>` : 'Not provided')}
      </table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Booking Details</p>
      <table style="width:100%;border-collapse:collapse;">${bookingRows}</table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Pricing</p>
      <table style="width:100%;border-collapse:collapse;">${pricingRows}</table>
    `)}
    ${notes ? card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Client Notes</p>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;white-space:pre-wrap;">${notes}</p>
    `) : ''}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;">Reach out within <strong>24–48 hours</strong> to confirm their appointment time.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBridalEmail({ firstName, lastName, bridalTitle, weddingDate, bridalDateFormatted, email, phone, instagram, eventLocation, eventStartTime, venueAccessTime, artistArriveBy, photographerArrival, photographer, hairstylist, numPeopleGlam, outOfState, additionalDetails, howHeard }) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || firstName;

  const clientRows = [
    row('Name', fullName),
    row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`),
    row('Phone', phone ? `<a href="tel:${phone}" style="color:#C4849A;text-decoration:none;">${phone}</a>` : 'Not provided'),
    instagram ? row('Instagram / TikTok', instagram) : '',
    howHeard ? row('How they heard', howHeard) : '',
  ].filter(Boolean).join('');

  const eventRows = [
    row('Package', `<strong style="color:#C4849A;">${bridalTitle}</strong>`),
    weddingDate ? row('Wedding Date', `<strong>${weddingDate}</strong>`) : '',
    bridalDateFormatted ? row('Preferred Appt', bridalDateFormatted) : '',
    eventLocation ? row('Location', eventLocation) : '',
    outOfState !== undefined ? row('Out of State', outOfState ? 'Yes — out of state' : 'No, local (CA)', outOfState ? '#C4849A' : '#111111') : '',
    numPeopleGlam ? row('People Getting Glam', numPeopleGlam) : '',
  ].filter(Boolean).join('');

  const timingRows = [
    eventStartTime ? row('Event Starts', eventStartTime) : '',
    venueAccessTime ? row('Venue Access', venueAccessTime) : '',
    artistArriveBy ? row('Artist Arrive By', artistArriveBy) : '',
    photographerArrival ? row('Photographer Arrives', photographerArrival) : '',
    photographer ? row('Photographer', photographer) : '',
    hairstylist ? row('Hairstylist', hairstylist) : '',
  ].filter(Boolean).join('');

  return base(`
    <div style="background:#C4849A;border-radius:14px;padding:20px;margin-bottom:10px;text-align:center;">
      <p style="font-size:28px;margin:0 0 8px;">💍</p>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#ffffff;margin:0 0 4px;">New Bridal Inquiry</h2>
      <p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;"><strong>${fullName}</strong> just submitted a bridal inquiry for <strong>${bridalTitle}</strong>.</p>
    </div>
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">${clientRows}</table>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Event Details</p>
      <table style="width:100%;border-collapse:collapse;">${eventRows}</table>
    </div>
    ${timingRows ? `
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Timing &amp; Vendors</p>
      <table style="width:100%;border-collapse:collapse;">${timingRows}</table>
    </div>` : ''}
    ${additionalDetails ? card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Makeup Vision &amp; Details</p>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;white-space:pre-wrap;">${additionalDetails}</p>
    `) : ''}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;">Reach out within <strong>24–48 hours</strong> to confirm and schedule their consultation.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
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
