import { Resend } from 'resend';
import { buildContract } from './contract';
import { STUDIO_ADDRESS, STUDIO_DISPLAY, STUDIO_MAPS_URL, STUDIO_TOWN, STUDIO_READY_VALUE } from './studio';
import { formatPhone, phoneHref } from './phone';
import { beginEmail, finishEmail, failEmail } from './emailLog';

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
        <td align="right" style="font-size:12px;color:#A99FA4;white-space:nowrap;">Sent ${todayStr()}</td>
      </tr></table>
    </td></tr>
    ${content}
    <tr><td style="padding:22px 28px 0;background:#FBF5F8;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #F0E6EC;border-radius:12px;"><tr><td style="padding:14px 18px;text-align:center;">
        <p style="font-size:13px;font-weight:700;color:#16110F;line-height:1.6;margin:0 0 5px;">Questions, or need to change your time?</p>
        <p style="font-size:13px;color:#6B636A;line-height:1.6;margin:0;">Use the <strong style="color:#16110F;">Reply</strong> button in your email app, at the bottom of this message in Gmail, up at the top in Outlook and Apple Mail. Your reply comes straight to Roko, right here in this thread.</p>
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

// The top of every client email: a small tracked eyebrow, the line she reads
// first, and one warm sentence under it.
//
// There used to be an emoji in a white circle above all of it — a ✓, a 🎉, a
// 📅 — which is the one thing in these emails that couldn't hold its shape,
// since every mail client renders it in a different font at a different weight,
// and it made a confirmation look like a push notification. The eyebrow already
// says which email this is, in the brand's own type.
// `badge` draws a filled circle with a mark in it above the title. Built from a
// table cell and a text character rather than an SVG or an image, because Gmail
// strips inline SVG and blocks remote images until the reader allows them, and
// a confirmation that renders as a broken box is worse than no badge at all.
function cbadge(mark = '✓') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 18px;"><tr>
    <td width="46" height="46" align="center" valign="middle" bgcolor="#F4DDE7" style="border-radius:23px;font-size:22px;line-height:46px;color:#B9788F;">${mark}</td>
  </tr></table>`;
}

function clientHero({ eyebrow, title, titleAccent, subtitle, badge }) {
  return `<tr><td style="padding:40px 28px 32px;background:#FBF5F8;border-bottom:1px solid #F0E6EC;text-align:center;">
    ${badge ? cbadge(badge) : ''}
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

// The running order, numbered, matching the What's Next block on the site's own
// confirmation screen. It replaces a paragraph that restated the deposit box and
// the summary above it, so it told the reader nothing they had not just read.
// Table-based rather than <ol>, because Outlook does not lay out list markers.
function csteps(steps) {
  const rows = steps.filter(Boolean).map((st, i) => `
    <tr>
      <td width="26" valign="top" style="padding:${i ? '14px' : '0'} 10px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="22" height="22" align="center" valign="middle" bgcolor="#FDF0F5" style="border-radius:11px;font-size:11px;font-weight:700;color:#B9788F;line-height:22px;">${i + 1}</td>
        </tr></table>
      </td>
      <td valign="top" style="padding:${i ? '14px' : '0'} 0 0;">
        <p style="font-size:14px;font-weight:600;color:#16110F;margin:0;line-height:1.4;">${st.title}</p>
        <p style="font-size:13px;color:#8A7F85;margin:3px 0 0;line-height:1.6;">${st.body}</p>
      </td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function crows(rowsHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>`;
}

// A detail row. The value carries ONE weight — 500 — and the separation from
// the label is done with colour, which is what a printed receipt does. It used
// to be 600 here and then wrapped in <strong> at nearly every call site, so
// every value in the panel came out at 700 and the panel read as a wall of
// bold with no emphasis left over for anything that mattered.
function crow(label, value, color) {
  return `<tr>
    <td style="padding:12px 0;font-size:13.5px;color:#8A7F85;border-bottom:1px solid #F4ECF1;">${label}</td>
    <td align="right" style="padding:12px 0;font-size:14px;font-weight:500;color:${color || '#16110F'};border-bottom:1px solid #F4ECF1;">${value}</td>
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

// Quiet "need to cancel?" line for the bottom of a confirmation email. Small and
// grey so it never competes with the happy content, but easy to find on scroll.
function ccancel(cancelUrl, lead) {
  if (!cancelUrl) return '';
  return `<tr><td style="padding:2px 30px 22px;text-align:center;">
    <p style="font-size:12.5px;color:#A99FA4;line-height:1.55;margin:0;">${lead} <a href="${cancelUrl}" style="color:#C4849A;text-decoration:underline;font-weight:600;">click here</a>.</p>
  </td></tr>`;
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

// Studio address block: the address itself plus a directions button. Mirrors
// cZoom so online/in-person emails feel like twins. One plain label ("Address")
// serves every flow that lands here (class, consultation, non-bridal); the
// surrounding email has already said what the appointment is.
function cStudio() {
  // Street on one line, city/state/ZIP under it. An address reads faster
  // stacked the way it's written on an envelope than run together on one line.
  const comma = STUDIO_ADDRESS.indexOf(',');
  const street = comma > 0 ? STUDIO_ADDRESS.slice(0, comma) : '';
  const region = comma > 0 ? STUDIO_ADDRESS.slice(comma + 1).trim() : '';
  const lines = street
    ? `<p style="font-size:17px;font-weight:600;color:#16110F;margin:0;line-height:1.45;">${street}</p>
       <p style="font-size:14px;color:#8A7F85;margin:4px 0 0;line-height:1.45;">${region}</p>`
    : `<p style="font-size:15px;font-weight:600;color:#16110F;margin:0;line-height:1.5;">${STUDIO_DISPLAY}</p>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF1F6;border:1px solid #F0D9E6;border-radius:12px;"><tr><td style="padding:20px 16px;text-align:center;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Address</p>
    ${lines}
    ${STUDIO_ADDRESS ? `<div style="height:16px;line-height:16px;">&nbsp;</div>${clientButton(STUDIO_MAPS_URL, 'Get Directions', true)}` : ''}
    <p style="font-size:11px;color:#A99FA4;margin:12px 0 0;">Roko's studio</p>
  </td></tr></table>`;
}

// "$500" → 500. Deliberately refuses anything carrying a "+" ("$750+" is an
// estimate, not a price), so a remaining balance is only ever stated when it
// can actually be stood behind.
function moneyToNum(s) {
  if (!s || /\+/.test(String(s))) return null;
  const n = Number(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmtMoney(n) {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function cZoom(zoomLink) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#FBF1F6;border:1px solid #F0D9E6;border-radius:12px;"><tr><td style="padding:16px;text-align:center;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4849A;margin:0 0 12px;">Your Zoom Link</p>
    ${clientButton(zoomLink, 'Join Zoom Call', true)}
    <p style="font-size:11px;color:#A99FA4;margin:12px 0 0;word-break:break-all;">${zoomLink}</p>
  </td></tr></table>`;
}

// ── Reserve-Your-Date money box ────────────────────────────────────────────
// A big focal deposit (what to pay now) over a calm invoice-style receipt, so a
// non-technical client sees both "pay this now" AND the full picture without it
// looking hectic. The payment mechanics (Zelle recipient, copy, upload) live on
// the linked upload page, not here, so the email stays short and drives one
// clear action.
//
// `travelFee` on-location only: adds a flat $200 line that rolls into the total
// and the cash-on-the-day remaining. Studio pickups pass false and never see it.
function cmoneyBox({ amount, dateFormatted, uploadUrl, photos = false }) {
  const depositN = moneyToNum(amount);
  // Strip the trailing word "deposit" only from a real money value ("$375
  // deposit" → "$375"); a text label like "Your deposit" is left whole.
  const depositClean = depositN
    ? String(amount).replace(/\s*deposit\s*$/i, '').trim()
    : (amount || 'Your deposit');
  const heroIsMoney = !!depositN;

  // Keep the date as one unit so "August 25" never orphans the day onto its own
  // line, the whole date wraps together instead.
  const dateNoWrap = `<span style="white-space:nowrap;">${dateFormatted || 'your date'}</span>`;
  const hero = heroIsMoney
    ? `<p style="font-family:${EMAIL_FONT};font-size:46px;line-height:1;color:#16110F;margin:0;">${depositClean}</p>
        <p style="font-size:13px;color:#8A7F85;margin:9px 0 0;">due now to hold ${dateNoWrap}</p>`
    : `<p style="font-family:${EMAIL_FONT};font-size:26px;line-height:1.15;color:#16110F;margin:0;">${depositClean}</p>
        <p style="font-size:13px;color:#8A7F85;margin:9px 0 0;">Send it via Zelle to lock in ${dateNoWrap}</p>`;

  // No receipt table here any more. It listed the package total, the deposit and
  // the balance directly under a hero that had just said the deposit in 46px, so
  // a $400 booking with a $200 deposit printed $200 three times and $400 twice
  // before the reader reached the summary that said them again. Every figure now
  // appears exactly once, in the panel where it means something: the price in
  // Booking Summary, the deposit here, the balance in What's Next. Mirrors the
  // confirmation screen the client just came from.
  return `<tr><td style="padding:16px 24px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF1F6;border:1px solid #F0D9E6;border-radius:18px;">
      <tr><td style="padding:30px 22px;text-align:center;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 16px;">Reserve Your Date</p>
        ${hero}
        ${uploadUrl ? cactionButton(uploadUrl, { photos }) : ''}
      </td></tr>
    </table>
  </td></tr>`;
}

// The one big call to action. Lives INSIDE the money box (right under the
// receipt) so "here's what you owe" and "here's the button to handle it" read
// as a single card, one clear step. A quiet prompt over a large, full-width,
// pill-shaped button. Returns a fragment (no row wrapper) so it can be embedded.
function cactionButton(uploadUrl, { photos = false } = {}) {
  const label = photos ? 'Send Deposit &amp; Upload Photos' : 'Send Deposit &amp; Upload';
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;"><tr>
          <td align="center" bgcolor="#C4849A" style="border-radius:999px;box-shadow:0 8px 20px rgba(196,132,154,0.3);">
            <a href="${uploadUrl}" style="display:block;padding:19px 18px;font-size:16px;font-weight:700;line-height:1.3;letter-spacing:0.01em;color:#ffffff;text-decoration:none;border-radius:999px;text-align:center;">${label}</a>
          </td>
        </tr></table>`;
}

// "Hold onto this" — one quiet line, centred under the hero.
//
// This used to be a gold warning banner with an ALL-CAPS "IMPORTANT · KEEP
// THIS EMAIL" heading, which was the loudest thing in a confirmation email and
// the only element in the whole set painted in a colour the brand doesn't use.
// It was shouting a housekeeping note over the good news. A client who has just
// been told she's confirmed does not need a warning box; she needs to be told
// once, softly, where the details live.
function ckeep(body) {
  return `<tr><td style="padding:18px 34px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
      <td width="20" valign="middle" style="font-size:13px;line-height:1;color:#C4849A;padding-right:7px;">🔖</td>
      <td valign="middle" style="font-size:12.5px;color:#A99FA4;line-height:1.6;">${body}</td>
    </tr></table>
  </td></tr>`;
}

// A numbered "what happens, in order" rail: label on the left, when it happens
// on the right. For a bride with a consultation booked, this is the one glance
// that tells her the call comes first and the makeup comes after.
function corder(items) {
  const rows = items.map(([n, label, when], i) => {
    const edge = i === items.length - 1 ? '' : 'border-bottom:1px solid #F4ECF1;';
    return `<tr>
      <td width="34" valign="top" style="padding:11px 0;${edge}">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="24" height="24" align="center" valign="middle" bgcolor="#FBF1F6" style="border-radius:50%;font-size:11px;font-weight:700;color:#C4849A;">${n}</td></tr></table>
      </td>
      <td valign="top" style="padding:13px 0 11px;font-size:14px;font-weight:600;color:#16110F;${edge}">${label}</td>
      <td align="right" valign="top" style="padding:13px 0 11px;font-size:13px;color:#6B636A;${edge}">${when}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}


// ─── Client Templates ──────────────────────────────────────────────────────────

// Alerting lives in alerts.js, which sends its own email through here. Imported
// lazily at the point of failure so the two modules don't form a static cycle,
// and skipped entirely for the alert's own email (`_internal`) so a broken
// Resend key can't start an infinite send-fail-alert-send loop.
async function reportEmailFailure({ to, subject, reason, _internal }) {
  console.error(`Email to ${to} failed (${subject}):`, reason);
  if (_internal) return;
  try {
    const { raiseAlert } = await import('./alerts');
    await raiseAlert({
      source: 'email', kind: 'send_failed', severity: 'critical',
      message: `An email failed to send: "${subject}". If this was a confirmation, the client is waiting on information she will never receive.`,
      // The recipient's domain is enough to tell a Resend outage from one bad
      // address, without putting a client's address in the alert log.
      context: { subject, recipient_domain: String(to || '').split('@')[1] || 'unknown', error: String(reason?.message || reason).slice(0, 300) },
    });
  } catch (err) { console.error('Could not raise email alert:', err?.message); }
}

// `log` is what makes this send answerable afterwards: { bookingId, kind,
// audience }. A row is opened in email_log BEFORE Resend is called and resolved
// after, so an email that dies mid-flight still leaves a trace, and Resend's
// message id lands on the row for the delivery webhook to find later.
// Alert emails (`_internal`) are skipped: email_log is the record of what
// CLIENTS were sent, and the developer's own alarm mail is not that.
export async function sendEmail({ to, subject, html, _internal = false, log }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const logId = _internal ? null : await beginEmail({ ...(log || {}), recipient: to, subject, html });
  let result;
  try {
    result = await resend.emails.send({ from: FROM, to: [to], replyTo: REPLY_TO, subject, html });
  } catch (err) {
    await failEmail(logId, err);
    await reportEmailFailure({ to, subject, reason: err, _internal });
    throw err;
  }
  if (result.error) {
    await failEmail(logId, result.error);
    await reportEmailFailure({ to, subject, reason: result.error, _internal });
    throw new Error(result.error.message);
  }
  await finishEmail(logId, { resendId: result.data?.id });
  return result;
}

// Used for the client + admin pair on a booking. It deliberately does NOT throw
// (one failed email must not roll back a confirmed booking), which is exactly
// why the failure needs to be reported: before this, a client's confirmation
// could silently never arrive and the only trace was a serverless log line.
export async function sendEmailPair(emails) {
  // Delegates to sendEmail rather than calling Resend again, so there is exactly
  // ONE send path and therefore exactly one place that logs and reports. It used
  // to have its own copy, which meant every future change had to be made twice
  // and the pair quietly missed anything added to sendEmail. allSettled keeps
  // the old contract: sendEmail reports its own failure and throws, and the
  // throw is swallowed here so a failed client email can't roll back a booking.
  await Promise.allSettled(emails.map(e => sendEmail(e)));
}

export function bookingConfirmationEmail({ firstName, serviceName, servicePrice, serviceDeposit, dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal, readyByTime, occasion, contractSection = '' }) {
  const basePrice = hasTravelFee ? '$750+' : servicePrice;
  const summaryRows = [
    crow('Service', serviceName),
    occasion ? crow('Occasion', occasion) : '',
    crow('Date', dateFormatted),
    readyByTime ? crow('Ready by', readyByTime) : '',
    // One row per figure. Travel doesn't get a line of its own: it IS the
    // price, so listing it separately printed $750+ twice under two headings
    // and read like two charges.
    crow(hasTravelFee ? 'On-location rate' : 'Price', basePrice),
    isEarlyArrival ? crow('Early arrival (before 7 AM)', '+$100', '#C4849A') : '',
  ].filter(Boolean).join('');
  const total = estimatedTotal || basePrice;

  // Cash left for the day. Only stated when both figures are firm: a travel
  // booking quotes "$750+", and subtracting a deposit from an estimate would
  // put a number in her inbox that nobody has actually agreed to.
  const totalNum = moneyToNum(total);
  const depositNum = moneyToNum(serviceDeposit);
  const remaining = totalNum && depositNum && totalNum > depositNum
    ? fmtMoney(totalNum - depositNum)
    : '';

  return clientShell({
    preheader: `Your ${serviceName} request is in. Send your deposit to lock in ${dateFormatted}.`,
    content: `
      ${clientHero({ eyebrow: 'Booking Request Received', title: 'Thanks for booking,', titleAccent: firstName, subtitle: "Can't wait to glam you up" })}
      ${cintro(`Your request is in! I'll reach out to confirm your time within <strong style="color:#16110F;">24–48 hours</strong>.`)}
      ${cmoneyBox({ amount: serviceDeposit || 'Deposit', dateFormatted, uploadUrl })}
      ${cpanel(`${ctitle('Booking Summary')}${crows(
        summaryRows + (estimatedTotal && estimatedTotal !== basePrice ? ctotalRow('Estimated Total', total) : '')
      )}`)}
      ${cpanel(`${ctitle("What's Next")}${csteps([
        { title: 'Send the deposit', body: 'Your date opens back up if it doesn’t arrive.' },
        { title: 'Roko confirms your time', body: 'By email, within 24–48 hours. Nothing needed from you until then.' },
        {
          title: 'On the day',
          body: `Come with clean, moisturized skin. Bring the remaining ${
            remaining
              ? `<strong style="color:#16110F;">${remaining} in cash</strong>.`
              : '<strong style="color:#16110F;">balance in cash</strong>. Roko confirms the exact amount.'
          }`,
        },
      ])}`)}
      ${contractSection}
    `,
  });
}

// The bride's confirmation. She gets her name first, then the money (what's due
// now vs. cash on the day), then the steps, then a full read-back of everything
// she typed into the inquiry form. The read-back mirrors the sections in
// adminBridalEmail so her copy and Roko's copy never disagree; every field is
// optional so a sparse admin-entered booking degrades to the short version.
export function bridalConfirmationEmail({
  firstName, bridalTitle, bridalDateFormatted, bridalDeposit, bridalPrice, bridalRemaining,
  uploadUrl, eventLocation, numPeopleGlam, outOfState, destinationLocation, eventStartTime, venueAccessTime,
  hairstylistArriveBy, makeupReadyByTime, photographerArrival, photographer, hairstylist,
  additionalDetails, contractSection = '',
}) {
  // A trial is a studio appointment, so its one time field is her preferred
  // time, not an "event start". Same rule adminBridalEmail uses.
  const isTrialPkg = /trial/i.test(bridalTitle || '');
  // Full Day is priced with travel already in it, so it must never get the
  // travel line even though it's always on-location. Only Luxury (and any other
  // per-service bridal booking) that leaves the studio pays it.
  const isFullDayPkg = /full.?day/i.test(bridalTitle || '');

  // Travel fee applies only when she's getting ready ON-LOCATION. Studio pickups
  // store the shared studio label as their location, so that (and trials, which
  // are always at the studio) means no travel fee. An empty location is treated
  // as studio so we never guess a fee onto an under-filled admin booking.
  const onLocation = !!eventLocation && eventLocation !== STUDIO_READY_VALUE && !isTrialPkg && !isFullDayPkg;

  // The money used to live in a receipt table inside the pink deposit box,
  // directly under a hero that had just stated the deposit. Each figure now
  // appears once: the price here, the deposit in the box, the balance in the
  // last step. The travel fee is a real line item, so it keeps its own row.
  const LOCAL_TRAVEL_FEE = 200;
  const bPriceN = moneyToNum(bridalPrice);
  const bDepositN = moneyToNum(bridalDeposit);
  const bTotalN = bPriceN ? bPriceN + (onLocation ? LOCAL_TRAVEL_FEE : 0) : null;
  const bRemaining = (bTotalN && bDepositN && bTotalN > bDepositN)
    ? fmtMoney(bTotalN - bDepositN)
    : (bridalRemaining || '');

  const inquiryRows = [
    crow('Package', bridalTitle, '#C4849A'),
    crow(isTrialPkg ? 'Preferred Date' : 'Wedding Date', bridalDateFormatted),
    bridalPrice ? crow('Package price', bridalPrice) : '',
    onLocation && bPriceN ? crow('Local travel fee', `+${fmtMoney(LOCAL_TRAVEL_FEE)}`) : '',
    onLocation && bTotalN ? crow('Total', `<strong>${fmtMoney(bTotalN)}</strong>`) : '',
    eventLocation ? crow('Location', eventLocation) : '',
    numPeopleGlam ? crow('Getting Glam', numPeopleGlam) : '',
    outOfState !== undefined && outOfState !== null
      ? crow('Travel', outOfState ? 'Yes, out of state' : 'No, local (CA)')
      : '',
    // Only ever set on an out-of-state inquiry, so it reads as a qualifier on the
    // Travel row above it rather than a second location.
    destinationLocation ? crow('Destination', destinationLocation) : '',
  ].filter(Boolean).join('');

  const timingRows = [
    makeupReadyByTime ? crow('Ready by', makeupReadyByTime) : '',
    eventStartTime ? crow(isTrialPkg ? 'Preferred time' : 'Event starts', eventStartTime) : '',
    venueAccessTime ? crow('Venue access', venueAccessTime) : '',
    hairstylistArriveBy ? crow('Hairstylist arrives', hairstylistArriveBy) : '',
    photographerArrival ? crow('Photographer arrives', photographerArrival) : '',
    photographer ? crow('Photographer', photographer) : '',
    hairstylist ? crow('Hairstylist', hairstylist) : '',
  ].filter(Boolean).join('');

  return clientShell({
    preheader: `Your bridal inquiry for ${bridalTitle} is in. ${bridalDeposit || 'Your deposit'} locks in ${bridalDateFormatted}.`,
    content: `
      ${clientHero({ title: `Hey ${firstName},`, titleAccent: "you're on the list!", subtitle: "I can't wait to be part of your big day" })}
      ${cintro(`Your bridal inquiry is in! Here's everything you sent over, and exactly what happens next. I'll be in touch within <strong style="color:#16110F;">24–48 hours</strong> to confirm and schedule your consultation.`)}
      ${cmoneyBox({ amount: bridalDeposit, dateFormatted: bridalDateFormatted, uploadUrl, photos: true })}
      ${cpanel(`${ctitle('Your Inquiry')}${crows(inquiryRows)}`)}
      ${cpanel(`${ctitle("What's Next")}${csteps([
        { title: 'Send the deposit', body: 'Your date opens back up if it doesn’t arrive.' },
        { title: 'Roko confirms and schedules your consultation', body: 'By email, within 24–48 hours. Nothing needed from you until then.' },
        {
          title: isTrialPkg ? 'On the day' : 'On the wedding day',
          body: bRemaining
            ? `Bring the remaining <strong style="color:#16110F;">${bRemaining} in cash</strong>.`
            : 'Bring the remaining <strong style="color:#16110F;">balance in cash</strong>. Roko confirms the exact amount.',
        },
      ])}`)}
      ${timingRows ? cpanel(`${ctitle('Timing &amp; Vendors')}${crows(timingRows)}`) : ''}
      ${additionalDetails ? cpanel(`${ctitle('Your Vision')}<p style="font-size:14px;color:#5A5258;margin:0;line-height:1.7;white-space:pre-wrap;">${additionalDetails}</p>`) : ''}
      ${onLocation ? `<tr><td style="padding:2px 30px 10px;"><p style="font-size:11px;color:#B3A6AC;line-height:1.5;margin:0;">Travel fee applies to locations within approximately one hour of ${STUDIO_TOWN}.</p></td></tr>` : ''}
      ${contractSection}
    `,
  });
}

// `travels` = the client asked Roko to come to them, so the studio address must
// not appear (it would send them to the wrong place). Everyone else is coming to
// Mountain House, and this is the email they'll dig up the morning of, so the
// address belongs here rather than in a follow-up.
// `balanceDue` is the cash owed on the day, and it is OPTIONAL on purpose. The
// route that sends this can only work it out for a plain studio booking whose
// service still matches a priced service row; travel is quoted as "$750+", an
// early-arrival surcharge exists only as prose in the notes, and a tenth of the
// booking rows name a service that no longer exists. Every one of those cases
// leaves this blank and the email keeps saying that Roko confirms the amount,
// which is the same rule the contract, the booking email and the site already
// follow. An absent figure is correct; a guessed one is a client turning up
// with the wrong cash.
export function bookingConfirmedEmail({ firstName, serviceName, dateFormatted, time, travels = false, cancelUrl = '', balanceDue = '', clientAddress = '' }) {
  // Where she is going, not a description of the fact that she is going. This
  // said "Roko travels to you" and then, in a separate bar underneath, promised
  // to confirm the address later — while the address the client typed on the
  // form was sitting in the booking row the whole time. Both the client and
  // Roko were left without the one fact the row already had.
  const locationValue = travels
    ? (clientAddress || 'Roko travels to you')
    : STUDIO_TOWN;

  return clientShell({
    // The visible save-this line says "keep this email", so the preheader must
    // not: the two render back to back in an inbox snippet. It carries the time
    // instead, which is the one thing worth seeing before opening.
    preheader: `You're confirmed for ${serviceName} on ${dateFormatted}${time ? ` at ${time}` : ''}.`,
    content: `
      ${clientHero({ badge: '✓', title: "You're", titleAccent: 'Confirmed!' })}
      ${ckeep('Save this email. Your appointment details are in it.')}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>, you're all set.`)}
      ${cpanel(`${ctitle('Appointment Details')}${crows(
        crow('Service', serviceName) +
        crow('Date', dateFormatted) +
        (time ? crow('Time', time) : '') +
        crow('Location', locationValue) +
        (balanceDue ? crow('Cash on the day', `<strong>${balanceDue}</strong>`, '#C4849A') : '')
      )}${travels ? '' : cStudio()}`)}
      ${balanceDue ? '' : cinfo(`Your remaining balance is due in cash on the day.`)}
      ${cstepsPanel('What to Expect', [
        ['1', travels ? 'Be ready for me' : 'Arrive on time', time ? `We start at ${time}` : 'At your confirmed time'],
        ['2', 'Bring your inspiration', 'Photos of the look you want are always welcome'],
        // Never a hard figure above and "Roko will confirm the exact amount"
        // below. Whichever of the two is true has to be the only one said.
        // The amount itself is stated ONCE, up in the details panel with the
        // date and the address, which is the block someone reopens on the
        // morning. This step points at it rather than printing it again.
        balanceDue
          ? ['3', 'Bring cash for the balance', 'The amount is in your appointment details above']
          : ['3', 'Bring cash for the balance', 'Roko will confirm the exact amount beforehand'],
      ])}
      ${ccancel(cancelUrl, 'Need to cancel? You can do that here,')}
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
    time ? crow('Time', time, '#C4849A') : '',
  ].filter(Boolean).join('');
  return clientShell({
    preheader: message ? String(message).slice(0, 120) : `A note from Makeup by Roko`,
    content: `
      ${clientHero({ eyebrow: 'A Note from Roko', title: `Hi ${firstName || 'there'},`, subtitle: resignUrl ? 'A quick update on your appointment' : '' })}
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
      <p style="font-size:15px;font-weight:700;color:#16110F;margin:0;">Updated agreement re-signed</p>
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

export function bookingCancelledEmail({ name, service, date, reason }) {
  // The reason is optional (Roko can toggle it off in the admin cancel dialog).
  // When present, escape it so a stray < & > can't break the email markup and
  // keep any line breaks she added; when absent, the reason panel is dropped and
  // the surrounding copy still keeps the email warm.
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hasReason = reason && String(reason).trim();
  const reasonBlock = hasReason
    ? cpanel(`<p style="font-size:14px;color:#5A5258;line-height:1.65;margin:0;text-align:center;">${esc(reason.trim()).replace(/\n/g, '<br>')}</p>`)
    : '';
  return clientShell({
    preheader: `An update about your ${service} appointment.`,
    content: `
      ${clientHero({ eyebrow: 'Booking Update', title: 'Booking', titleAccent: 'Cancelled' })}
      ${cintro(`Hi <strong style="color:#16110F;">${name}</strong>, I'm so sorry, but your ${service} appointment on ${date} has to be cancelled.`)}
      ${reasonBlock}
      ${cintro(`I'd genuinely love to still make it work another time. You can rebook anytime below, or just hit the Reply button in your email app.`)}
      <tr><td style="padding:4px 24px 18px;text-align:center;">${clientButton(SITE_URL, 'Book Again')}</td></tr>
    `,
  });
}

// Client's own confirmation after THEY cancel (non-bridal or class) from the
// /cancel-booking page. Different from bookingCancelledEmail (Roko's apology when
// she cancels) — here the client did it, so we confirm the action and say what
// happens with money. `kind`: 'class' mentions a possible refund; 'appointment'
// notes the deposit is non-refundable per the agreement.
export function clientCancelledEmail({ name, service, date, kind = 'appointment' }) {
  const isClass = kind === 'class';
  const moneyLine = isClass
    ? `If you're due a refund, Roko will take care of it and email you the details. Nothing else is needed from you.`
    : `As a reminder, your deposit is non-refundable, but there's nothing else you need to do.`;
  return clientShell({
    preheader: `Your ${service} ${isClass ? 'class' : 'appointment'} has been cancelled.`,
    content: `
      ${clientHero({ eyebrow: isClass ? 'Class Cancelled' : 'Appointment Cancelled', title: 'All', titleAccent: 'done' })}
      ${cintro(`Hi <strong style="color:#16110F;">${name}</strong>, your ${service}${date ? ` on ${date}` : ''} has been cancelled.`)}
      ${cpanel(`<p style="font-size:14px;color:#5A5258;line-height:1.65;margin:0;text-align:center;">${moneyLine}</p>`)}
      ${cintro(`I'd genuinely love to work with you another time. You can rebook whenever you're ready, or just hit the Reply button in your email app.`)}
      <tr><td style="padding:4px 24px 18px;text-align:center;">${clientButton(SITE_URL, 'Book Again')}</td></tr>
    `,
  });
}

// Bride's confirmation after she submits a cancel REQUEST (nothing is cancelled
// yet, her date is still held). Sets the expectation of a personal call.
export function bridalCancelRequestEmail({ name, service, date }) {
  return clientShell({
    preheader: `We've received your request. Roko will reach out personally.`,
    content: `
      ${clientHero({ eyebrow: 'Request Received', title: 'We got your', titleAccent: 'request' })}
      ${cintro(`Hi <strong style="color:#16110F;">${name}</strong>, I've received your request to cancel your <strong style="color:#16110F;">${service}</strong>${date ? ` on <strong style="color:#16110F;">${date}</strong>` : ''}.`)}
      ${cpanel(`<p style="font-size:14px;color:#5A5258;line-height:1.65;margin:0;text-align:center;">Because this is a wedding booking, I handle every cancellation personally. <strong style="color:#16110F;">Your date is still held for now.</strong> I'll reach out within 24 hours so we can talk it through together.</p>`)}
      ${cintro(`If anything is urgent, just hit the Reply button in your email app and it comes straight to me.`)}
    `,
  });
}

// Admin: a client cancelled (non-bridal or class). Simple, shows every field.
export function adminClientCancelledEmail({ name, service, date, reason, kind = 'appointment', email, phone }) {
  const isClass = kind === 'class';
  return base(`
    ${card(`
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#DC2626;margin:0 0 6px;">Client Cancelled</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;"><strong>${name || 'A client'}</strong> cancelled their ${isClass ? 'class' : 'appointment'} from the cancellation page.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Client', name || '—')}
        ${email ? row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`) : ''}
        ${phone ? row('Phone', `<a href="tel:${phoneHref(phone)}" style="color:#C4849A;text-decoration:none;">${formatPhone(phone)}</a>`) : ''}
        ${row(isClass ? 'Class' : 'Service', `<strong style="color:#C4849A;">${service || '—'}</strong>`)}
        ${date ? row('Date', date) : ''}
        ${row('Cancelled by', '<strong>Client</strong>')}
        ${row('Reason', reason ? reason : '<em style="color:#999;">None given</em>')}
      </table>
    `)}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;line-height:1.6;">${isClass
        ? 'The Wednesday is freed automatically. Refund only if you choose, from the class card.'
        : 'The date is freed automatically. No money moves on its own.'}</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#C4849A;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View in Admin Dashboard →</a>
      </td></tr></table>
    `)}
  `);
}

// Admin: HIGH priority — a bride submitted a cancel REQUEST. Nothing cancelled,
// date still held. Roko needs to call.
export function adminBridalCancelRequestEmail({ name, service, date, reason, email, phone }) {
  return base(`
    ${card(`
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#D97706;margin:0 0 6px;">Bridal Cancellation Requested</h2>
      <p style="font-size:13px;color:#444444;margin:0;line-height:1.6;"><strong>${name || 'A bride'}</strong> has requested to cancel. Nothing has changed and her date is still held. Please call her.</p>
    `)}
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Details</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Bride', name || '—')}
        ${email ? row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`) : ''}
        ${phone ? row('Phone', `<a href="tel:${phoneHref(phone)}" style="color:#C4849A;text-decoration:none;">${formatPhone(phone)}</a>`) : ''}
        ${row('Service', `<strong style="color:#C4849A;">${service || '—'}</strong>`)}
        ${date ? row('Date', date) : ''}
        ${row('Reason', reason ? reason : '<em style="color:#999;">None given</em>')}
      </table>
    `)}
    ${card(`
      <p style="font-size:13px;color:#444444;margin:0 0 14px;line-height:1.6;">Call the bride, then cancel from her card if it goes ahead. The deposit is your call, nothing moves automatically.</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${ADMIN_URL}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Open Her Card →</a>
      </td></tr></table>
    `)}
  `);
}


export function classPaymentEmail({ firstName, classes = [], totalPaid, format, formatLabel, dateFormatted, classTime, zoomLink, cancelUrl = '' }) {
  const isOnline = format === 'online';
  const isInPerson = format === 'in_person';

  const classRows = classes.map(c =>
    crow(`${c.title}<br><span style="font-size:12px;color:#9A8E94;">${c.dayNote || c.duration}</span>`, `$${c.price.toLocaleString()}`)
  ).join('');

  const scheduleRows = [
    dateFormatted ? crow('Date', dateFormatted) : '',
    classTime ? crow('Time', classTime) : '',
    formatLabel ? crow('Format', isInPerson ? 'In person · Mountain House' : isOnline ? 'Online · Zoom' : formatLabel) : '',
  ].filter(Boolean).join('');

  const connect = isOnline && zoomLink ? cZoom(zoomLink) : isInPerson ? cStudio() : '';

  const receiptRows = [
    crow('Payment method', 'Card · Stripe'),
    crow('Status', 'Paid in full', '#15803d'),
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
    preheader: dateFormatted ? `You're booked for ${dateFormatted}${classTime ? `, ${classTime}` : ''}.` : `Payment received. You're officially booked!`,
    content: `
      ${clientHero({ eyebrow: 'Payment Confirmed', title: "You're officially", titleAccent: 'booked!' })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your payment has been received and your class is scheduled${dateFormatted ? ` for ${dateFormatted}` : ''}${classTime ? `, ${classTime}` : ''}. Everything you need is below.`)}
      ${cheadline('Total Paid', `$${totalPaid.toLocaleString()}`, 'Paid in full via Stripe')}
      ${cpanel(`${ctitle('Your Class')}${crows(classRows + scheduleRows)}${connect}`)}
      ${cpanel(`${ctitle('Payment Receipt')}${crows(receiptRows)}`)}
      ${cstepsPanel('To Prepare', steps)}
      ${ccancel(cancelUrl, 'If you need to cancel your class, you can do that here,')}
    `,
  });
}

export function consultationScheduledEmail({ firstName, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, updated, migrated }) {
  // `migrated` = a client brought over from the old booking system. It's their
  // first email from the new site, so it welcomes them instead of announcing an
  // "updated time" (nothing changed on their end). Takes precedence over `updated`.
  const isUpdate = updated && !migrated;
  return clientShell({
    preheader: migrated
      ? `Makeup by Roko has a new home. Your consultation is all set.`
      : (isUpdate ? `Your consultation time for ${serviceName} has been updated.` : `Your consultation for ${serviceName} is scheduled.`),
    content: `
      ${migrated
        ? clientHero({ eyebrow: 'New Booking Home', title: `Hey ${firstName},`, titleAccent: "we've moved!", subtitle: 'Your consultation is all set' })
        : isUpdate
        ? clientHero({ eyebrow: 'Consultation Updated', title: 'New', titleAccent: 'time!', subtitle: 'Your consultation has been rescheduled' })
        : clientHero({ eyebrow: 'Consultation Scheduled', title: "Let's", titleAccent: 'connect!', subtitle: "Can't wait to chat about your look" })}
      ${migrated ? cinfo(`<strong style="color:#16110F;">Welcome to my new booking home!</strong> I've moved Makeup by Roko to a brand-new site and brought your consultation right along with me. Nothing has changed on your end, the details below are exactly as we planned.`) : ''}
      ${migrated
        ? cintro(`Here's everything for your consultation for ${serviceName}, all in one place:`)
        : isUpdate
        ? cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your consultation for ${serviceName} has a <strong style="color:#16110F;">new time</strong>. Here are the updated details, please use these going forward:`)
        : cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! Your consultation for ${serviceName} is set. Here are your details:`)}
      ${cpanel(`${ctitle(isUpdate ? 'Updated Consultation Details' : 'Consultation Details')}${crows(
        crow('Date', consultationDate) +
        crow('Time', consultationTime) +
        crow('Type', consultationType) +
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
export function bridalConfirmedEmail({ firstName, serviceName, dateFormatted, time, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, uploadUrl, depositReceived, updated, migrated, cancelUrl = '' }) {
  const showDeposit = !depositReceived && uploadUrl;
  // No consultation yet = the "confirm now, schedule the consultation later"
  // path: same confirmation email, minus the consultation panel.
  const hasConsult = !!(consultationDate && consultationTime);
  // `migrated` = a bride carried over from the old booking system. Her first
  // email from the new site: welcome her, don't announce a "changed time"
  // (nothing changed for her). Takes precedence over `updated`.
  const isUpdate = updated && !migrated;
  return clientShell({
    preheader: migrated
      ? `Makeup by Roko has a new home. Your ${serviceName}${dateFormatted ? ` on ${dateFormatted}` : ''} and consultation are all here.`
      : isUpdate
      ? `Your consultation time has been updated. Your ${serviceName} is still confirmed${dateFormatted ? ` for ${dateFormatted}` : ''}.`
      : `You're confirmed for ${serviceName}${dateFormatted ? ` on ${dateFormatted}` : ''}. Keep this email for your appointment${hasConsult ? ' and consultation' : ''} details.`,
    content: `
      ${migrated
        ? clientHero({ eyebrow: 'New Booking Home', title: `Hey ${firstName},`, titleAccent: "we've moved!", subtitle: 'Your appointment and consultation are all set' })
        : clientHero({ eyebrow: 'Confirmed & Scheduled', title: "You're", titleAccent: 'Confirmed!', subtitle: "I can't wait to be part of your big day" })}
      ${ckeep(hasConsult
        ? `Keep this one. Everything for your big day lives here: your consultation call first, then your appointment.`
        : `Keep this one. It holds your confirmed appointment time. Your consultation details follow in their own email once we set a time.`)}
      ${migrated ? cinfo(`<strong style="color:#16110F;">Welcome to my new booking home!</strong> I've moved Makeup by Roko to a brand-new site and brought your booking right along with me. Nothing has changed on your end, your appointment and consultation are exactly as we planned. Everything now lives in this one email.`) : ''}
      ${isUpdate ? cinfo(`<strong style="color:#16110F;">Heads up, your consultation time has changed.</strong> Your appointment${dateFormatted ? ` on <strong style="color:#16110F;">${dateFormatted}</strong>` : ''} is still confirmed, only the consultation call has a new time. The updated details are below.`) : ''}
      ${cintro(`${migrated ? '' : `Hey <strong style="color:#16110F;">${firstName}</strong>! `}You're officially confirmed for ${serviceName}${dateFormatted ? ` on ${dateFormatted}` : ''}. ${hasConsult
        ? `I've also set up a quick consultation call beforehand so we can plan your look together. Here's how it goes.`
        : `I'll reach out soon to set up a quick consultation call so we can plan your look together. Your appointment details are below.`}`)}
      ${hasConsult ? cpanel(`${ctitle('How It Goes')}${corder([
        ['1', 'Consultation call', `${consultationDate} · ${consultationTime}`],
        ['2', 'Your appointment', `${dateFormatted || 'Date confirmed'}${time ? ` · ${time}` : ''}`],
      ])}`) : ''}
      ${hasConsult ? cpanel(`${ctitle(isUpdate ? 'First · Your Consultation Call (Updated Time)' : 'First · Your Consultation Call')}
        <p style="font-size:13px;color:#857A80;margin:0 0 14px;line-height:1.55;">A quick chat <em>before</em> your big day so we can go over your vision. This is separate from the appointment below, no extra booking needed.</p>
        ${crows(
        crow('Date', `<strong>${consultationDate}</strong>`) +
        crow('Time', `<strong>${consultationTime}</strong>`) +
        crow('Type', consultationType) +
        (consultationNotes ? crow('Notes', consultationNotes) : '')
      )}${zoomLink ? cZoom(zoomLink) : ''}`) : ''}
      ${cpanel(`${ctitle(hasConsult ? 'Then · Your Appointment' : 'Your Appointment')}
        <p style="font-size:13px;color:#857A80;margin:0 0 14px;line-height:1.55;">The day I do your makeup. This is your main booking.</p>
        ${crows(
        crow('Service', serviceName) +
        (dateFormatted ? crow('Date', dateFormatted) : '') +
        (time ? crow('Time', time) : '')
      )}`)}
      ${!migrated && showDeposit ? cmoneyBox({ amount: 'Your deposit', dateFormatted, uploadUrl, photos: true }) : ''}
      ${!migrated && !showDeposit && uploadUrl ? cinfo(`You can still add or update your photos (with &amp; without makeup) anytime using <a href="${uploadUrl}" style="color:#C4849A;text-decoration:none;font-weight:600;">your personal link</a> so I can prep for your consultation.`) : ''}
      ${cstepsPanel('To Prepare', [
        ['1', 'Save your inspiration', 'Screenshots, Pinterest boards, anything you love'],
        ['2', 'Think about your vibe', 'Soft glam, bold, natural, anything goes!'],
        ['3', 'Write down any questions', "I'm here to answer everything on our call"],
      ])}
      ${ccancel(cancelUrl, 'Need to cancel for any reason? I handle bridal cancellations personally,')}
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
      ${clientHero({ eyebrow: "You're Enrolled", title: "You're", titleAccent: 'in!', subtitle: 'So excited to work with you' })}
      ${cintro(`Hey <strong style="color:#16110F;">${firstName}</strong>! You're officially enrolled in ${className}, and your lesson is all set.`)}
      ${cpanel(`${ctitle('Lesson Details')}${crows(
        crow('Date', lessonDate) +
        crow('Time', lessonTime) +
        crow('Format', fmt) +
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
        ${row('Status', 'Signed', '#16a34a')}
        ${row('Signed by', reg.contract_signed_name || reg.full_name)}
        ${row('Photo permission', reg.contract_photo_consent ? 'Yes, may post' : 'No, keep private', reg.contract_photo_consent ? '#111111' : '#C4849A')}
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

export function adminBookingEmail({ name, service, date, email, phone, servicePrice, deposit, readyByTime, occasion, isEarlyArrival, hasTravelFee, estimatedTotal, notes, contractSignedName, contractSignedAt, contractPhotoConsent }) {
  const bookingRows = [
    row('Service', `<strong style="color:#C4849A;">${service}</strong>`),
    // What the appointment is for, right under the service. Two bookings from
    // one client are only tellable apart by this line.
    occasion ? row('Occasion', `<strong style="color:#C4849A;">${occasion}</strong>`) : '',
    row('Requested Date', `<strong>${date}</strong>`),
    readyByTime ? row('Ready by (preference)', readyByTime) : '',
    row('Location', hasTravelFee ? '✈️ Travel to client' : "Roko's studio", hasTravelFee ? '#C4849A' : '#111111'),
    row('Done before 7 AM?', isEarlyArrival ? 'Yes, early arrival' : 'No', isEarlyArrival ? '#C4849A' : '#111111'),
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
        ${row('Status', 'Signed', '#16a34a')}
        ${row('Signed by', contractSignedName)}
        ${row('Photo permission', contractPhotoConsent ? 'Yes, may post' : 'No, keep private', contractPhotoConsent ? '#111111' : '#C4849A')}
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

export function adminBridalEmail({ firstName, lastName, bridalTitle, weddingDate, bridalDateFormatted, email, phone, instagram, eventLocation, eventStartTime, venueAccessTime, hairstylistArriveBy, makeupReadyByTime, photographerArrival, photographer, hairstylist, numPeopleGlam, outOfState, destinationLocation, additionalDetails, howHeard, contractSignedName, contractSignedAt, contractPhotoConsent }) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || firstName;
  // A trial is a studio appointment, so its one time field is the bride's
  // preferred time, not an "event start" — label it accordingly for Roko.
  const isTrialPkg = /trial/i.test(bridalTitle || '');

  const clientRows = [
    row('Name', fullName),
    row('Email', `<a href="mailto:${email}" style="color:#C4849A;text-decoration:none;">${email}</a>`),
    row('Phone', phone ? `<a href="tel:${phoneHref(phone)}" style="color:#C4849A;text-decoration:none;">${formatPhone(phone)}</a>` : 'Not provided'),
    instagram ? row('Instagram / TikTok', instagram) : '',
    howHeard ? row('How they heard', howHeard) : '',
  ].filter(Boolean).join('');

  const eventRows = [
    row('Package', `<strong style="color:#C4849A;">${bridalTitle}</strong>`),
    // `weddingDate` is whatever the client picked on the calendar, which for a
    // trial is the TRIAL date, not the wedding — so label it honestly.
    weddingDate ? row(isTrialPkg ? 'Trial Date' : 'Wedding Date', `<strong>${longDate(weddingDate)}</strong>`) : '',
    eventLocation ? row('Location', eventLocation) : '',
    outOfState !== undefined ? row('Out of State', outOfState ? 'Yes, out of state' : 'No, local (CA)', outOfState ? '#C4849A' : '#111111') : '',
    // The city she'd be flying to. Accented like the flag above it because for a
    // destination inquiry this is the line she acts on: nothing about the trip can
    // be quoted without it.
    destinationLocation ? row('Destination', destinationLocation, '#C4849A') : '',
    numPeopleGlam ? row('People Getting Glam', numPeopleGlam) : '',
  ].filter(Boolean).join('');

  const timingRows = [
    eventStartTime ? row(isTrialPkg ? 'Preferred Time' : 'Event Starts', eventStartTime) : '',
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
        ${row('Status', 'Signed', '#16a34a')}
        ${row('Signed by', contractSignedName)}
        ${row('Photo permission', contractPhotoConsent ? 'Yes, may post' : 'No, keep private', contractPhotoConsent ? '#111111' : '#C4849A')}
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
  return base(`
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Consultation Sent</p>
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">Consultation Scheduled</h2>
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
        ${row('Type', consultationType)}
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

// Bridal confirmed WITHOUT a consultation yet (the "confirm now, schedule the
// consultation later" path) — reminds Roko the consultation is still open.
export function adminBridalConfirmedEmail({ clientName, clientEmail, serviceName, dateFormatted, time }) {
  return base(`
    ${card(`
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 6px;">Bridal Confirmed</p>
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">✅ Booking Confirmed</h2>
      <p style="font-size:13px;color:#444444;margin:0;">You confirmed <strong>${clientName || clientEmail}</strong> for <strong>${serviceName}</strong>. The consultation still needs to be scheduled from the admin card.</p>
    `)}
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:10px;border:1px solid #F0E0E9;">
      <p style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Booking</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', clientName || 'N/A')}
        ${row('Email', clientEmail || 'N/A')}
        ${row('Service', serviceName || 'N/A')}
        ${dateFormatted ? row('Date', `<strong>${dateFormatted}</strong>`) : ''}
        ${time ? row('Time', `<strong>${time}</strong>`) : ''}
        ${row('Consultation', 'Not scheduled yet')}
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
      <h2 style="font-family:${EMAIL_FONT};font-size:20px;font-weight:300;color:#111111;margin:0 0 6px;">Makeup Lesson Scheduled</h2>
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
