import { Resend } from 'resend';
import { buildContract } from './contract';
import { STUDIO_ADDRESS, STUDIO_DISPLAY, STUDIO_MAPS_URL } from './studio';
import { formatPhone, phoneHref } from './phone';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
const FROM = `Makeup by Roko <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'makeupbyroko22@gmail.com';
const ADMIN_URL = `${SITE_URL}/admin`;

// Site-wide type is the admin dashboard's clean sans. Email clients can't load
// Söhne/Inter reliably, so every email uses the same system-sans stack the admin
// UI falls back to — no more Georgia/serif anywhere. One constant, used for every
// font-family in this file (headings, hero titles, signatures, amounts).
const EMAIL_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ─── Admin email primitives (kept simple & info-dense) ─────────────────────────

function base(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${EMAIL_FONT};">
<div style="max-width:500px;margin:0 auto;padding:24px 16px;">
<div style="text-align:center;margin-bottom:14px;">
  <p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#C4849A;margin:0;">Makeup by Roko</p>
</div>
<div style="background:#16110F;border-radius:12px;padding:13px 18px;margin-bottom:16px;text-align:center;">
  <p style="font-size:16px;font-weight:800;letter-spacing:0.26em;text-transform:uppercase;color:#ffffff;margin:0;">Admin Copy</p>
  <p style="font-size:11px;color:rgba(255,255,255,0.65);margin:5px 0 0;">For your records. This was not sent to the client.</p>
</div>
${content}
<div style="text-align:center;padding:20px 0 8px;">
  <p style="font-family:${EMAIL_FONT};font-style:italic;font-size:16px;color:#C4849A;margin:0 0 5px;">With love, Roko</p>
  <p style="font-size:11px;color:#999999;margin:0;">roko@makeupbyroko.org · @makeupbyroko_</p>
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

// Render a date as "July 31, 2026" (month, day, year) for every email/service.
// An ISO date string (YYYY-MM-DD) is parsed as a plain calendar date so it never
// slips a day across time zones; anything else is passed through unchanged.
function longDate(value) {
  if (!value) return '';
  const s = String(value);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return s;
}

function clientShell({ preheader, content }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#F1EAED;font-family:${EMAIL_FONT};-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:#F1EAED;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EAED;"><tr><td align="center" style="padding:24px 12px 32px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 4px 24px rgba(140,90,110,0.10);">
    <tr><td style="padding:20px 28px;border-bottom:1px solid #F0E6EC;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left" style="font-family:${EMAIL_FONT};font-size:19px;color:#16110F;letter-spacing:0.01em;">Makeup by <span style="color:#C4849A;font-style:italic;">Roko</span></td>
        <td align="right" style="font-size:12px;color:#A99FA4;white-space:nowrap;">${todayStr()}</td>
      </tr></table>
    </td></tr>
    ${content}
    <tr><td style="padding:22px 28px 0;background:#FBF5F8;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #F0E6EC;border-radius:12px;"><tr><td style="padding:14px 18px;text-align:center;">
        <p style="font-size:13px;color:#6B636A;line-height:1.6;margin:0;">Questions, or need to change your time? Just <strong style="color:#16110F;">reply to this email</strong> and it comes straight to Roko.</p>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:20px 28px 30px;background:#FBF5F8;border-top:1px solid #F0E6EC;text-align:center;">
      <p style="font-family:${EMAIL_FONT};font-style:italic;font-size:17px;color:#C4849A;margin:0 0 8px;">With love, Roko</p>
      <p style="font-size:12px;color:#9A8E94;margin:0;">roko@makeupbyroko.org · @makeupbyroko_</p>
      <p style="font-size:11px;color:#C3B8BE;margin:10px 0 0;">Makeup by Roko · Mountain House, CA</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Standalone copy of the signed service agreement, emailed to both the client
// and Roko so each has a record in their inbox. Renders the full agreement text
// plus the signature block. Same builder as the on-site sign step, so the words
// always match exactly what was signed.
export function contractCopyEmail({ clientName, serviceName, dateFormatted, time = '', depositAmount, priceAmount, locationType = 'studio', kind = 'appointment', overrides = {}, signedName, signedAt, photoConsent, forAdmin = false }) {
  const c = buildContract({ clientName, serviceName, dateFormatted, time, depositAmount, priceAmount, locationType, kind, overrides });
  const signedAtLabel = signedAt
    ? new Date(signedAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })
    : '';
  const sectionsHtml = c.sections.map((s, i) => `
    <p style="font-size:13px;font-weight:700;color:#16110F;margin:14px 0 4px;">${i + 1}. ${s.heading}</p>
    <p style="font-size:12px;line-height:1.65;color:#6b6169;margin:0;">${s.body}</p>
  `).join('');
  const content = `
    <tr><td style="padding:26px 28px 6px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">${forAdmin ? 'Signed Agreement — Copy' : 'Your Signed Service Agreement'}</p>
      <p style="font-size:13px;line-height:1.6;color:#4b434a;margin:0;">${c.intro}</p>
    </td></tr>
    <tr><td style="padding:0 28px;">${sectionsHtml}</td></tr>
    <tr><td style="padding:18px 28px 26px;">
      <div style="background:#F7F1F4;border-radius:12px;padding:16px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Signature</p>
        <p style="font-family:${EMAIL_FONT};font-style:italic;font-size:19px;color:#16110F;margin:0 0 6px;">${signedName || clientName || ''}</p>
        <p style="font-size:12px;color:#6b6169;margin:0;">Signed electronically${signedAtLabel ? ` on ${signedAtLabel}` : ''} · Agreement ${c.version}</p>
        <p style="font-size:12px;color:#6b6169;margin:6px 0 0;">Photo permission: <strong style="color:#16110F;">${photoConsent ? 'Yes, may post' : 'No, keep private'}</strong></p>
      </div>
    </td></tr>
  `;
  return clientShell({ preheader: 'Signed service agreement — Makeup by Roko', content });
}

// Full signed agreement rendered as a panel to fold into the client's ONE
// confirmation email (so they get their copy without a second email).
export function contractClientPanel({ clientName, serviceName, dateFormatted, time = '', depositAmount, priceAmount, locationType = 'studio', kind = 'appointment', overrides = {}, signedName, signedAt, photoConsent }) {
  const c = buildContract({ clientName, serviceName, dateFormatted, time, depositAmount, priceAmount, locationType, kind, overrides });
  const signedAtLabel = signedAt
    ? new Date(signedAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })
    : '';
  const sectionsHtml = c.sections.map((s, i) => `<p style="font-size:12px;font-weight:700;color:#16110F;margin:12px 0 3px;">${i + 1}. ${s.heading}</p><p style="font-size:11.5px;line-height:1.6;color:#6b6169;margin:0;">${s.body}</p>`).join('');
  return cpanel(`${ctitle('Your Signed Agreement')}
    <p style="font-size:12px;line-height:1.6;color:#5A5258;margin:0 0 4px;">${c.intro}</p>
    ${sectionsHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF5F8;border-radius:10px;"><tr><td style="padding:12px 14px;">
      <p style="font-family:${EMAIL_FONT};font-style:italic;font-size:16px;color:#16110F;margin:0 0 4px;">${signedName || clientName || ''}</p>
      <p style="font-size:11px;color:#6b6169;margin:0;">Signed electronically${signedAtLabel ? ` on ${signedAtLabel}` : ''} · Photo permission: <strong style="color:#16110F;">${photoConsent ? 'Yes' : 'No'}</strong></p>
    </td></tr></table>
  `);
}

function clientHero({ eyebrow, title, titleAccent, subtitle, emoji }) {
  return `<tr><td style="padding:40px 28px 32px;background:#FBF5F8;border-bottom:1px solid #F0E6EC;text-align:center;">
    ${emoji ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;"><tr><td width="54" height="54" align="center" valign="middle" bgcolor="#ffffff" style="border-radius:50%;font-size:24px;box-shadow:0 2px 10px rgba(196,132,154,0.20);">${emoji}</td></tr></table>` : ''}
    ${eyebrow ? `<p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 14px;">${eyebrow}</p>` : ''}
    <h1 style="font-family:${EMAIL_FONT};font-size:32px;line-height:1.16;font-weight:400;color:#16110F;margin:0;">${title}${titleAccent ? `<br><span style="color:#C4849A;font-style:italic;">${titleAccent}</span>` : ''}</h1>
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
        <td style="padding:18px 0;font-family:${EMAIL_FONT};font-size:22px;color:#16110F;">${label}</td>
        <td align="right" style="padding:18px 0;font-family:${EMAIL_FONT};font-size:30px;color:#16110F;">${amount}</td>
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
    <td style="padding:16px 0 2px;font-family:${EMAIL_FONT};font-size:17px;color:#16110F;">${label}</td>
    <td align="right" style="padding:16px 0 2px;font-family:${EMAIL_FONT};font-size:24px;color:#16110F;">${value}</td>
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

// Studio address block for in-person classes: the address itself plus a
// directions button. Mirrors cZoom so online/in-person emails feel like twins.
function cStudio() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF1F6;border:1px solid #F0D9E6;border-radius:12px;"><tr><td style="padding:16px;text-align:center;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Your Class Location</p>
    <p style="font-size:15px;font-weight:600;color:#16110F;margin:0 0 12px;line-height:1.5;">${STUDIO_DISPLAY}</p>
    ${STUDIO_ADDRESS ? clientButton(STUDIO_MAPS_URL, 'Get Directions', true) : ''}
    <p style="font-size:11px;color:#A99FA4;margin:12px 0 0;">Roko's studio</p>
  </td></tr></table>`;
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
        ${hideAmount ? '' : `<p style="font-family:${EMAIL_FONT};font-size:36px;line-height:1;color:#16110F;margin:0 0 4px;">${amount}</p>`}
        <p style="font-size:13px;color:#8A7F85;margin:0 0 18px;">Send via Zelle to lock in your date</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #F0E0E9;margin:0 0 18px;"><tr><td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px;color:#9A8E94;padding:0 0 6px;">Zelle to</td><td align="right" style="font-size:13px;color:#16110F;font-weight:700;padding:0 0 6px;">Ruqia Moshref</td></tr>
            <tr><td style="font-size:13px;color:#9A8E94;">Email</td><td align="right" style="font-size:13px;color:#16110F;font-weight:700;">makeupbyroko22@gmail.com</td></tr>
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

export function bookingConfirmationEmail({ firstName, serviceName, servicePrice, serviceDeposit, dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal, readyByTime, contractSection = '' }) {
  const basePrice = hasTravelFee ? '$750+' : servicePrice;
  const summaryRows = [
    crow('Service', serviceName),
    crow('Date', dateFormatted),
    readyByTime ? crow('Ready by', readyByTime) : '',
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
        ['1', 'Send your Zelle deposit', 'Ruqia Moshref · makeupbyroko22@gmail.com'],
        ['2', 'Upload your screenshot', 'Use the secure button above'],
        ['3', 'Roko confirms your appointment', 'Within 24–48 hours'],
      ])}
      ${contractSection}
    `,
  });
}

export function bridalConfirmationEmail({ firstName, bridalTitle, bridalDateFormatted, bridalDeposit, uploadUrl, contractSection = '' }) {
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
        ['1', 'Send your Zelle deposit', 'Ruqia Moshref · makeupbyroko22@gmail.com'],
        ['2', 'Upload your screenshot & photos', 'Use your personal link above'],
        ['3', 'Roko reaches out for your consultation', 'To go over your vision and bridal look'],
      ])}
      ${contractSection}
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

// Personal note Roko types from the admin client card. Optionally shows an
// "updated appointment" panel and a Review & Sign button when she's proposing a
// new time and wants the client to re-sign the agreement.
export function contactClientEmail({ firstName, message, serviceName, dateFormatted, time, resignUrl }) {
  const safeMsg = String(message || '').replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  const detailRows = [
    serviceName ? crow('Service', serviceName) : '',
    dateFormatted ? crow('Date', dateFormatted) : '',
    time ? crow('Time', `<strong style="color:#16110F;">${time}</strong>`, '#C4849A') : '',
  ].filter(Boolean).join('');
  return clientShell({
    preheader: message ? String(message).slice(0, 120) : `A note from Makeup by Roko`,
    content: `
      ${clientHero({ eyebrow: 'A Note from Roko', title: `Hi ${firstName || 'there'},`, subtitle: resignUrl ? 'A quick update on your appointment ✦' : '' })}
      ${cintro(safeMsg)}
      ${detailRows ? cpanel(`${ctitle(resignUrl ? 'Updated Appointment' : 'Appointment Details')}${crows(detailRows)}`) : ''}
      ${resignUrl ? cpanel(`${ctitle('Please Review & Re-Sign')}
        <p style="font-size:13px;color:#5A5258;line-height:1.65;margin:0 0 16px;">Since your appointment time changed, please review and sign the updated service agreement so everything's locked in. It only takes a moment.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">${clientButton(resignUrl, 'Review & Sign Updated Agreement')}</td></tr></table>
      `) : ''}
    `,
  });
}

// Admin heads-up when a client re-signs the updated agreement (after a time change).
export function adminContractResignedEmail({ name, service, date, time, signedName, photoConsent }) {
  return base(`
    <div style="text-align:center;margin-bottom:14px;">
      <p style="font-size:15px;font-weight:700;color:#16110F;margin:0;">Updated agreement re-signed ✍️</p>
      <p style="font-size:12px;color:#888;margin:4px 0 0;">${name || 'A client'} signed the new time.</p>
    </div>
    ${card(`<table width="100%" cellpadding="0" cellspacing="0">
      ${row('Client', name || '—')}
      ${row('Service', service || '—')}
      ${row('Date', date || '—')}
      ${time ? row('New time', time, '#C4849A') : ''}
      ${row('Signed by', signedName || name || '—')}
      ${row('Photo permission', photoConsent ? 'Yes, may post' : 'No, keep private')}
    </table>`)}
    <div style="text-align:center;margin-top:8px;">
      <a href="${ADMIN_URL}" style="display:inline-block;padding:11px 26px;font-size:13px;font-weight:700;color:#fff;text-decoration:none;background:#16110F;border-radius:10px;">Open Admin</a>
    </div>
  `);
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

// The single class confirmation email. Since the client picks their Wednesday
// and time window at checkout, this is the full booking confirmation:
// online classes get their Zoom link right here, in-person classes get the
// Mountain House studio address.
export function classPaymentEmail({ firstName, classes = [], totalPaid, format, formatLabel, dateFormatted, classTime, zoomLink }) {
  const isOnline = format === 'online';
  const isInPerson = format === 'in_person';

  const classRows = classes.map(c =>
    crow(`${c.title}<br><span style="font-size:12px;color:#9A8E94;">${c.dayNote || c.duration}</span>`, `$${c.price.toLocaleString()}`)
  ).join('');

  const scheduleRows = [
    dateFormatted ? crow('Date', `<strong style="color:#16110F;">${dateFormatted}</strong>`) : '',
    classTime ? crow('Time', `<strong style="color:#16110F;">${classTime}</strong>`) : '',
    formatLabel ? crow('Format', `<strong style="color:#16110F;">${isInPerson ? '📍 In Person · Mountain House' : isOnline ? '💻 Online · Zoom' : formatLabel}</strong>`) : '',
  ].filter(Boolean).join('');

  const connect = isOnline && zoomLink ? cZoom(zoomLink) : isInPerson ? cStudio() : '';

  const receiptRows = [
    crow('Payment method', 'Card · Stripe'),
    crow('Status', '<span style="color:#15803d;font-weight:700;">Paid in full ✓</span>'),
  ].join('');

  const steps = isInPerson
    ? [
        ['1', 'Save the address', 'The directions button above takes you right to the studio'],
        ['2', 'Come with a clean face', 'No makeup, or light moisturizer only. We start fresh!'],
        ['3', 'Just bring yourself', 'All products and tools are provided at the studio'],
      ]
    : isOnline
    ? [
        ['1', zoomLink ? 'Save your Zoom link' : 'Watch for your Zoom link', zoomLink ? 'It lives right here in this email whenever you need it' : 'It will arrive in a separate email before your class'],
        ['2', 'Set up your space', 'Good lighting, a mirror, and your makeup within reach'],
        ['3', 'Come with a clean face', 'We start fresh with skin prep, then build the look together'],
      ]
    : [
        ['1', 'Roko confirms your details within 24–48 hrs', 'Your class is on the Wednesday you chose above'],
        ['2', 'Prepare any inspiration photos', 'Optional but helpful'],
        ['3', 'Show up and learn!', 'All supplies provided, just bring yourself'],
      ];

  return clientShell({
    preheader: dateFormatted ? `You're booked for ${dateFormatted}${classTime ? `, ${classTime}` : ''}.` : `Payment received — you're officially booked!`,
    content: `
      ${clientHero({ emoji: '✓', eyebrow: 'Payment Confirmed', title: "You're officially", titleAccent: 'booked!' })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your payment has been received and your class is scheduled${dateFormatted ? ` for <strong style="color:#16110F;">${dateFormatted}</strong>` : ''}${classTime ? `, <strong style="color:#16110F;">${classTime}</strong>` : ''}. Everything you need is below.`)}
      ${cheadline('Total Paid', `$${totalPaid.toLocaleString()}`, 'Paid in full via Stripe')}
      ${cpanel(`${ctitle('Your Class')}${crows(classRows + scheduleRows)}${connect}`)}
      ${cpanel(`${ctitle('Payment Receipt')}${crows(receiptRows)}`)}
      ${cstepsPanel('To Prepare', steps)}
    `,
  });
}

export function consultationScheduledEmail({ firstName, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, updated, migrated }) {
  const typeLabel = consultationType === 'Phone' ? '📞 ' : consultationType === 'In-Person' ? '📍 ' : '';
  // `migrated` = a client brought over from the old booking system. It's their
  // first email from the new site, so it welcomes them instead of announcing an
  // "updated time" (nothing changed on their end). Takes precedence over `updated`.
  const isUpdate = updated && !migrated;
  return clientShell({
    preheader: migrated
      ? `Makeup by Roko has a new home ✦ your consultation is all set.`
      : (isUpdate ? `Your consultation time for ${serviceName} has been updated.` : `Your consultation for ${serviceName} is scheduled.`),
    content: `
      ${migrated
        ? clientHero({ emoji: '✨', eyebrow: 'New Booking Home', title: "We've", titleAccent: 'moved!', subtitle: 'Your consultation is all set ✦' })
        : isUpdate
        ? clientHero({ emoji: '📅', eyebrow: 'Consultation Updated', title: 'New', titleAccent: 'time!', subtitle: 'Your consultation has been rescheduled ✦' })
        : clientHero({ emoji: '📅', eyebrow: 'Consultation Scheduled', title: "Let's", titleAccent: 'connect!', subtitle: "Can't wait to chat about your look ✦" })}
      ${migrated ? cinfo(`✨ <strong style="color:#16110F;">Welcome to my new booking home!</strong> I've moved Makeup by Roko to a brand-new site and brought your consultation right along with me. Nothing has changed on your end, the details below are exactly as we planned.`) : ''}
      ${migrated
        ? cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Here's everything for your consultation for <strong style="color:#16110F;">${serviceName}</strong>, all in one place:`)
        : isUpdate
        ? cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your consultation for <strong style="color:#16110F;">${serviceName}</strong> has a <strong style="color:#16110F;">new time</strong>. Here are the updated details, please use these going forward:`)
        : cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your consultation for <strong style="color:#16110F;">${serviceName}</strong> is set. Here are your details:`)}
      ${cpanel(`${ctitle(isUpdate ? 'Updated Consultation Details' : 'Consultation Details')}${crows(
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

// Bridal: one concise email that merges the appointment confirmation, the
// scheduled consultation, and (when the deposit isn't in yet) the Zelle + photo
// upload link — so a bride gets a single email instead of three.
export function bridalConfirmedEmail({ firstName, serviceName, dateFormatted, time, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, uploadUrl, depositReceived, updated, migrated }) {
  const typeLabel = consultationType === 'Phone' ? '📞 ' : consultationType === 'In-Person' ? '📍 ' : '';
  const showDeposit = !depositReceived && uploadUrl;
  // `migrated` = a bride carried over from the old booking system. Her first
  // email from the new site: welcome her, don't announce a "changed time"
  // (nothing changed for her). Takes precedence over `updated`.
  const isUpdate = updated && !migrated;
  return clientShell({
    preheader: migrated
      ? `Makeup by Roko has a new home ✦ your ${serviceName}${dateFormatted ? ` on ${dateFormatted}` : ''} and consultation are all here.`
      : isUpdate
      ? `Your consultation time has been updated. Your ${serviceName} is still confirmed${dateFormatted ? ` for ${dateFormatted}` : ''}.`
      : `You're confirmed for ${serviceName}${dateFormatted ? ` on ${dateFormatted}` : ''}. Keep this email for your appointment and consultation details.`,
    content: `
      ${clientHero({ emoji: migrated ? '✨' : '✓', eyebrow: migrated ? 'New Booking Home' : 'Confirmed & Scheduled', title: "You're", titleAccent: 'Confirmed!', subtitle: "I can't wait to be part of your big day ✦" })}
      ${migrated ? cinfo(`✨ <strong style="color:#16110F;">Welcome to my new booking home!</strong> I've moved Makeup by Roko to a brand-new site and brought your booking right along with me. Nothing has changed on your end, your appointment and consultation are exactly as we planned. Everything now lives in this one email.`) : ''}
      ${isUpdate ? cinfo(`🔄 <strong style="color:#16110F;">Heads up, your consultation time has changed.</strong> Your appointment${dateFormatted ? ` on <strong style="color:#16110F;">${dateFormatted}</strong>` : ''} is still confirmed, only the consultation call has a new time. The updated details are below.`) : ''}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! You're officially confirmed for <strong style="color:#16110F;">${serviceName}</strong>${dateFormatted ? ` on <strong style="color:#16110F;">${dateFormatted}</strong>` : ''}. I've also set up a quick consultation call beforehand so we can plan your look together. Both are laid out below.`)}
      ${cinfo(`📌 <strong style="color:#16110F;">This is your booking confirmation.</strong> It has everything for your appointment <em>and</em> your consultation call in one place, so please keep this email safe and don't delete it.`)}
      ${cpanel(`${ctitle('Your Appointment')}
        <p style="font-size:13px;color:#857A80;margin:0 0 14px;line-height:1.55;">The day I do your makeup. This is your main booking.</p>
        ${crows(
        crow('Service', serviceName) +
        (dateFormatted ? crow('Date', `<strong>${dateFormatted}</strong>`) : '') +
        (time ? crow('Time', `<strong>${time}</strong>`) : '') +
        crow('Status', '<span style="color:#C4849A;font-weight:700;">✓ Confirmed</span>')
      )}`)}
      ${cpanel(`${ctitle(isUpdate ? 'Your Consultation Call · Updated Time' : 'Your Consultation Call')}
        <p style="font-size:13px;color:#857A80;margin:0 0 14px;line-height:1.55;">A quick chat <em>before</em> your big day so we can go over your vision. This is separate from the appointment above, no extra booking needed.</p>
        ${crows(
        crow('Date', `<strong>${consultationDate}</strong>`) +
        crow('Time', `<strong>${consultationTime}</strong>`) +
        crow('Type', `${typeLabel}<strong>${consultationType}</strong>`) +
        (consultationNotes ? crow('Notes', consultationNotes) : '')
      )}${zoomLink ? cZoom(zoomLink) : ''}`)}
      ${showDeposit ? cdeposit({ amount: 'Deposit', uploadUrl, photos: true }) : ''}
      ${!showDeposit && uploadUrl ? cinfo(`📸 You can still add or update your photos (with &amp; without makeup) anytime using <a href="${uploadUrl}" style="color:#C4849A;text-decoration:none;font-weight:600;">your personal link</a> so I can prep for your consultation.`) : ''}
      ${cstepsPanel('To Prepare', [
        ['1', 'Save your inspiration', 'Screenshots, Pinterest boards, anything you love'],
        ['2', 'Think about your vibe', 'Soft glam, bold, natural, anything goes!'],
        ['3', 'Write down any questions', "I'm here to answer everything on our call"],
      ])}
    `,
  });
}

export function enrolledLessonEmail({ firstName, className, lessonDate, lessonTime, meetingType, zoomLink, clientPhone, notes }) {
  const fmt = meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType === 'In-Person' ? 'In Person · Mountain House' : meetingType;
  let connect = '';
  if (meetingType === 'Zoom' && zoomLink) {
    connect = cZoom(zoomLink);
  } else if (meetingType === 'In-Person') {
    connect = cStudio();
  } else if (meetingType === 'Phone' && clientPhone) {
    connect = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF1F6;border:1px solid #F0D9E6;border-radius:12px;"><tr><td style="padding:16px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">How We Will Connect</p>
      <p style="font-size:14px;color:#5A5258;margin:0;line-height:1.55;">Roqia will call you at <strong style="color:#16110F;">${formatPhone(clientPhone)}</strong> on ${lessonDate} at ${lessonTime}. Make sure your phone is on!</p>
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

export function adminClassPaymentEmail({ reg, classes = [], totalPaid, formatLabel, dateFormatted, classTime, zoomLink, sessionId }) {
  const classRows = classes.map(c =>
    `<tr><td style="padding:7px 0;font-size:13px;color:#444444;border-bottom:1px solid #F5E8EF;">${c.title}${formatLabel ? ` <span style="color:#C4849A;">(${formatLabel})</span>` : ''}</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#111111;text-align:right;border-bottom:1px solid #F5E8EF;">$${c.price.toLocaleString()}</td></tr>`
  ).join('');

  // Real client notes only — the signed-agreement summary now lives in its own
  // block below (and in the dedicated contract columns), not stuffed in notes.
  const cleanNotes = (reg.additional_notes || '').replace(/\s*\|\s*✍️[^]*$/u, '').trim();

  return base(`
    ${card(`
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 10px;">New Class Booking</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.7;"><strong>${reg.full_name}</strong> just paid <strong>$${totalPaid.toLocaleString()}</strong> in full via Stripe.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', reg.full_name)}
        ${row('Email', reg.email)}
        ${row('Phone', formatPhone(reg.phone))}
        ${cleanNotes ? row('Notes', cleanNotes) : ''}
      </table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Schedule</p>
      <table style="width:100%;border-collapse:collapse;">
        ${formatLabel ? row('Format', `<strong>${formatLabel}</strong>`, '#C4849A') : ''}
        ${dateFormatted ? row('Date', `<strong>${dateFormatted}</strong>`) : row('Date', 'Not chosen', '#C4849A')}
        ${classTime ? row('Time', `<strong>${classTime}</strong>`) : ''}
        ${formatLabel === 'In Person' ? row('Location', STUDIO_DISPLAY) : ''}
        ${zoomLink ? row('Zoom', `<a href="${zoomLink}" style="color:#2D8CFF;text-decoration:none;">Join link ↗</a>`) : ''}
      </table>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Class Booked</p>
      <table style="width:100%;border-collapse:collapse;">${classRows}</table>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:8px 0;font-size:14px;font-weight:700;color:#111111;">Total Paid</td><td style="padding:8px 0;font-size:14px;font-weight:700;color:#111111;text-align:right;">$${totalPaid.toLocaleString()}</td></tr>
      </table>
    `)}
    ${reg.contract_signed ? card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Service Agreement</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Status', '<strong style="color:#16a34a;">✓ Signed</strong>')}
        ${row('Signed by', reg.contract_signed_name || reg.full_name)}
        ${row('Photo permission', reg.contract_photo_consent ? 'Yes — may post' : 'No — keep private', reg.contract_photo_consent ? '#111111' : '#C4849A')}
      </table>
    `) : ''}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;">${dateFormatted
        ? `This class is booked and the client already has their ${formatLabel === 'In Person' ? 'studio address' : zoomLink ? 'Zoom link' : 'confirmation'}. Reschedule or manage it in the dashboard.`
        : 'Please reach out within 24–48 hours to confirm their class time.'}</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBookingEmail({ name, service, date, email, phone, servicePrice, deposit, readyByTime, isEarlyArrival, hasTravelFee, estimatedTotal, notes, contractSignedName, contractSignedAt, contractPhotoConsent }) {
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
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">New Booking</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;">New booking request from <strong>${name}</strong>. Here's everything they submitted:</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Client Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', name)}
        ${row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`)}
        ${row('Phone', phone ? `<a href="tel:${phoneHref(phone)}" style="color:#C4849A;text-decoration:none;">${formatPhone(phone)}</a>` : 'Not provided')}
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
    ${contractSignedName ? card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Service Agreement</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Status', '<strong style="color:#16a34a;">✓ Signed</strong>')}
        ${row('Signed by', contractSignedName)}
        ${row('Photo permission', contractPhotoConsent ? 'Yes — may post' : 'No — keep private', contractPhotoConsent ? '#111111' : '#C4849A')}
      </table>
      <p style="font-size:12px;color:#888888;margin:10px 0 0;">Full signed agreement is on the booking in your dashboard.</p>
    `) : ''}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;">Reach out within <strong>24–48 hours</strong> to confirm their appointment time.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

export function adminBridalEmail({ firstName, lastName, bridalTitle, weddingDate, bridalDateFormatted, email, phone, instagram, eventLocation, eventStartTime, venueAccessTime, hairstylistArriveBy, makeupReadyByTime, photographerArrival, photographer, hairstylist, numPeopleGlam, outOfState, additionalDetails, howHeard, contractSignedName, contractSignedAt, contractPhotoConsent }) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || firstName;

  const clientRows = [
    row('Name', fullName),
    row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`),
    row('Phone', phone ? `<a href="tel:${phoneHref(phone)}" style="color:#C4849A;text-decoration:none;">${formatPhone(phone)}</a>` : 'Not provided'),
    instagram ? row('Instagram / TikTok', instagram) : '',
    howHeard ? row('How they heard', howHeard) : '',
  ].filter(Boolean).join('');

  const eventRows = [
    row('Package', `<strong style="color:#C4849A;">${bridalTitle}</strong>`),
    weddingDate ? row('Wedding Date', `<strong>${longDate(weddingDate)}</strong>`) : '',
    eventLocation ? row('Location', eventLocation) : '',
    outOfState !== undefined ? row('Out of State', outOfState ? 'Yes — out of state' : 'No, local (CA)', outOfState ? '#C4849A' : '#111111') : '',
    numPeopleGlam ? row('People Getting Glam', numPeopleGlam) : '',
  ].filter(Boolean).join('');

  const timingRows = [
    eventStartTime ? row('Event Starts', eventStartTime) : '',
    makeupReadyByTime ? row('Ready By (Requested)', makeupReadyByTime) : '',
    venueAccessTime ? row('Venue Access', venueAccessTime) : '',
    hairstylistArriveBy ? row('Hairstylist Arrive By', hairstylistArriveBy) : '',
    photographerArrival ? row('Photographer Arrives', photographerArrival) : '',
    photographer ? row('Photographer', photographer) : '',
    hairstylist ? row('Hairstylist', hairstylist) : '',
  ].filter(Boolean).join('');

  return base(`
    <div style="background:#C4849A;border-radius:14px;padding:20px;margin-bottom:10px;text-align:center;">
      <p style="font-size:28px;margin:0 0 8px;">💍</p>
      <h2 style="font-family:${EMAIL_FONT};font-size:22px;font-weight:300;color:#ffffff;margin:0 0 4px;">New Bridal Inquiry</h2>
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
    ${contractSignedName ? card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Service Agreement</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Status', '<strong style="color:#16a34a;">✓ Signed</strong>')}
        ${row('Signed by', contractSignedName)}
        ${row('Photo permission', contractPhotoConsent ? 'Yes — may post' : 'No — keep private', contractPhotoConsent ? '#111111' : '#C4849A')}
      </table>
      <p style="font-size:12px;color:#888888;margin:10px 0 0;">Full signed agreement is on the booking in your dashboard.</p>
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
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Consultation Sent</p>
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">📅 Consultation Scheduled</h2>
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
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Lesson Scheduled</p>
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">💄 Makeup Lesson Scheduled</h2>
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
        ${row('Format', meetingType === 'Phone' ? 'Phone / FaceTime' : meetingType === 'In-Person' ? 'In Person · Mountain House' : meetingType)}
        ${meetingType === 'In-Person' ? row('Location', STUDIO_DISPLAY) : ''}
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
