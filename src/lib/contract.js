// ============================================================
// SERVICE AGREEMENT (client-signed booking contract)
// ------------------------------------------------------------
// Single source of truth for the contract text every client
// signs at the end of booking. Filled per booking, then rendered
// in the sign step, the confirmation emails, and the PDF.
//
// The contract is now fully editable by Roko from the admin
// Services tab. The default wording lives in defaultContractTemplate()
// as {placeholder} templates; her saved edits (title, intro, every
// section, photo-consent question) live in app_settings and override
// the defaults. buildContract() fills the placeholders with the real
// per-booking values so dynamic numbers (deposit, price, date, days,
// travel fee, names) always stay correct no matter how she edits.
//
// Bump CONTRACT_VERSION if the *meaning* changes materially, so old
// signatures stay tied to what was actually agreed.
// ============================================================

export const CONTRACT_VERSION = 'v1';

// app_settings key holding Roko's editable contract (values + full wording).
export const CONTRACT_SETTINGS_KEY = 'contract_settings';

// The legal/business name shown as the artist party on the contract.
// Keep in sync with Stripe + Zelle. (Confirm spelling: Roqia vs Ruqia.)
export const ARTIST_NAME = 'Roqia Moshref';
export const BUSINESS_NAME = 'Makeup by Roko';

// Confirmed policy values, kept as constants so the FAQ/Terms copy
// can reference the same numbers and never drift out of sync again.
export const CONTRACT_POLICIES = {
  cancellationNoticeDays: 14,
  travelFeeStart: '$200',
  studioLocation: 'Mountain House, CA',
};

// Tokens Roko can drop into any heading, the intro, or a section body.
// buildContract() swaps these for the real values of each booking, so she
// only writes the wording once and every client sees their own details.
// `sample` powers the live preview in the admin editor.
export const CONTRACT_PLACEHOLDERS = [
  { token: '{clientName}', label: "Client's name", sample: 'Jane Client' },
  { token: '{serviceName}', label: 'Booked service', sample: 'Luxury Bridal Look' },
  { token: '{date}', label: 'Appointment date', sample: 'Saturday, August 15, 2026' },
  { token: '{time}', label: 'Appointment time', sample: '11:00 AM' },
  { token: '{deposit}', label: 'Deposit amount', sample: '$375' },
  { token: '{price}', label: 'Service price', sample: '$750' },
  { token: '{days}', label: 'Cancellation notice (days)', sample: '14' },
  { token: '{travelFee}', label: 'Travel fee starts at', sample: '$200' },
  { token: '{artistName}', label: 'Your business name', sample: ARTIST_NAME },
  { token: '{businessName}', label: 'Brand name', sample: BUSINESS_NAME },
  { token: '{studioLocation}', label: 'Studio location', sample: CONTRACT_POLICIES.studioLocation },
];

// Parse the stored JSON value into a clean overrides object for buildContract.
// Safe on bad/missing input (returns {}), so the contract always renders.
// Understands both the legacy shape (scalar fields only) and the full-edit
// shape (title / intro / sections / photoConsentQuestion).
export function parseContractSettings(raw) {
  if (!raw) return {};
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const days = o.cancellationNoticeDays;
    const sections = Array.isArray(o.sections)
      ? o.sections
          .map((s, i) => ({
            id: (s && s.id) || `section-${i}`,
            heading: s && typeof s.heading === 'string' ? s.heading : '',
            body: s && typeof s.body === 'string' ? s.body : '',
          }))
          .filter(s => s.heading.trim() || s.body.trim())
      : undefined;
    const str = (v) => (typeof v === 'string' && v.trim() ? v : undefined);
    return {
      artistName: str(o.artistName),
      cancellationNoticeDays: days === 0 || days ? Number(days) || undefined : undefined,
      travelFeeStart: str(o.travelFeeStart),
      extraClause: str(o.extraClause),
      title: str(o.title),
      intro: str(o.intro),
      photoConsentQuestion: str(o.photoConsentQuestion),
      sections: sections && sections.length ? sections : undefined,
    };
  } catch { return {}; }
}

const money = (v) => (v == null || v === '' ? null : String(v).trim());

// Replace {token} occurrences with resolved values. Unknown tokens are left
// as-is so a typo shows up visibly rather than silently vanishing.
function fillTemplate(str, values) {
  if (!str) return '';
  return String(str).replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : m
  );
}

// The built-in default agreement, authored as {placeholder} templates.
// This is exactly what a brand-new booking sees, and what the admin editor
// seeds from / resets to. `kind` selects the appointment vs class wording.
export function defaultContractTemplate({ kind = 'appointment' } = {}) {
  const isClass = kind === 'class';

  const intro = isClass
    ? `This Service Agreement is entered into between {artistName} ("Artist," {businessName}) and {clientName} ("Client") for {serviceName}. By signing below, the Client confirms they have read, understood, and agree to the following terms.`
    : `This Service Agreement is entered into between {artistName} ("Artist," {businessName}) and {clientName} ("Client") for {serviceName} on {date}. By signing below, the Client confirms they have read, understood, and agree to the following terms.`;

  const shared = {
    health: {
      id: 'health',
      heading: 'Health, Skin & Allergies',
      body: `It is the Client's responsibility to disclose any skin conditions, allergies, sensitivities, or medical concerns before the appointment. The Artist will not be held liable for reactions resulting from undisclosed conditions. Service may be refused if the Client presents with a contagious condition (for example, an active cold sore or conjunctivitis).`,
    },
    photography: {
      id: 'photography',
      heading: 'Photography & Portfolio Use',
      body: `The Artist may photograph the completed look. Your photos will only be used for portfolio and promotional purposes (including Instagram, TikTok, and this website) if you consent below. Your consent choice is recorded with this agreement.`,
    },
    signature: {
      id: 'signature',
      heading: 'Electronic Signature',
      body: `By typing your full name and submitting this form, you are signing this agreement electronically. You agree that your electronic signature is the legal equivalent of your handwritten signature and that this agreement is binding.`,
    },
  };

  const sections = isClass
    ? [
        { id: 'booking', heading: 'Booking & Confirmation', body: `Submitting this form and completing checkout reserves your seat in the class. Seats are limited and are confirmed once payment is received. {artistName} reserves the right to reschedule a class if needed, in which case you may attend the new date or receive a refund.` },
        { id: 'payment', heading: 'Payment', body: `Your class fee (total {price}) is paid in full at checkout by card to reserve your seat.` },
        { id: 'cancellation', heading: 'Cancellation & Rescheduling', body: `You must give at least {days} days notice to cancel or reschedule. Class payments are non-refundable, but with at least {days} days notice your payment may be transferred one time to a future class date. Cancellations with less than {days} days notice, and no-shows, forfeit the payment.` },
        shared.health,
        { id: 'punctuality', heading: 'Punctuality', body: `Please arrive on time. Arrivals more than 15 minutes late may result in a shortened class or cancellation at the Artist's discretion, without a refund.` },
        shared.photography,
        shared.signature,
      ]
    : [
        { id: 'booking', heading: 'Booking & Confirmation', body: `Submitting this form is a booking request, not a confirmed appointment. Your date is only confirmed once the deposit has been received and acknowledged by the Artist. Appointments are first come, first serve. The Artist reserves the right to decline any booking at her discretion.` },
        { id: 'payment', heading: 'Deposit & Payment', body: `A non-refundable deposit of {deposit} is required to secure your date. The remaining balance (base service price {price}, plus any travel fee or add-ons) is due in cash on the day of your appointment. No digital payments are accepted for the balance.` },
        { id: 'cancellation', heading: 'Cancellation & Rescheduling', body: `The Client must give at least {days} days notice to cancel or reschedule. Deposits are non-refundable. With at least {days} days notice, your deposit may be transferred one time to a new appointment date. Cancellations or changes made with less than {days} days notice forfeit the deposit in full. Same-day cancellations and no-shows are charged the full service amount. If the Artist must cancel due to illness or emergency, the Client will receive a full refund of the deposit or the option to reschedule at no additional cost.` },
        { id: 'travel', heading: 'Travel Fee', body: `In-studio appointments at {studioLocation} have no travel fee. On-location services (the artist traveling to you) are subject to a travel fee starting at {travelFee}, regardless of distance.` },
        shared.health,
        { id: 'punctuality', heading: 'Punctuality', body: `Please arrive on time. Arrivals more than 15 minutes late may result in a shortened service or cancellation at the Artist's discretion, without a refund.` },
        shared.photography,
        shared.signature,
      ];

  return {
    title: 'Service Agreement',
    intro,
    sections: sections.map(s => ({ ...s })),
    photoConsentQuestion: 'Do you give permission for your photos to be posted online (portfolio, Instagram, TikTok, website)?',
  };
}

// Build the filled contract for a specific booking.
//   clientName    - who is signing (full name)
//   serviceName   - the booked service
//   dateFormatted - human date string, e.g. "Saturday, August 15, 2026"
//   time          - appointment time / window, e.g. "11:00 AM – 1:00 PM" (optional)
//   depositAmount - e.g. "$375" (optional; falls back to generic wording)
//   priceAmount   - e.g. "$750" (optional)
//   locationType  - 'studio' | 'onlocation' (kept for compatibility; the
//                   default Travel Fee wording now covers both cases)
//   kind          - 'appointment' | 'class'
//   overrides     - Roko's edits from the admin Services tab:
//                   { artistName, cancellationNoticeDays, travelFeeStart,
//                     extraClause, title, intro, photoConsentQuestion, sections }
export function buildContract({
  clientName = '',
  serviceName = 'your service',
  dateFormatted = 'your selected date',
  time = '',
  depositAmount,
  priceAmount,
  locationType = 'studio', // eslint-disable-line no-unused-vars
  kind = 'appointment',
  overrides = {},
} = {}) {
  const isClass = kind === 'class';
  const artistName = (overrides.artistName || '').trim() || ARTIST_NAME;
  const days = overrides.cancellationNoticeDays ?? CONTRACT_POLICIES.cancellationNoticeDays;
  const travelStart = (overrides.travelFeeStart || '').toString().trim() || CONTRACT_POLICIES.travelFeeStart;

  // Every {token} the templates can reference, resolved for this booking.
  const timeText = (time || '').toString().trim();
  const dateText = dateFormatted || 'your selected date';
  const values = {
    artistName,
    businessName: BUSINESS_NAME,
    clientName: clientName || 'the client named below',
    serviceName: serviceName || 'your service',
    // Fold the time window into {date} when set, so the default template (which
    // only references {date}) still shows the agreed window. When no time is set
    // yet (booking request), it stays a plain date with no dangling "at".
    date: timeText ? `${dateText} at ${timeText}` : dateText,
    time: timeText,
    deposit: money(depositAmount) || 'the required amount',
    price: money(priceAmount) || 'the quoted amount',
    days: String(days),
    travelFee: travelStart,
    studioLocation: CONTRACT_POLICIES.studioLocation,
  };

  const base = defaultContractTemplate({ kind });

  // Roko edits the appointment agreement; class bookings keep the built-in
  // class wording (its structure differs), but still honor her scalar values.
  const custom = isClass ? {} : overrides;

  // Section list: her custom list wins; otherwise the defaults, with any legacy
  // "extra clause" folded in before the signature block for backward compat.
  let sectionTemplates;
  if (Array.isArray(custom.sections) && custom.sections.length) {
    sectionTemplates = custom.sections;
  } else {
    sectionTemplates = base.sections.slice();
    const extra = (custom.extraClause || '').trim();
    if (extra) {
      const sigIdx = sectionTemplates.findIndex(s => s.id === 'signature');
      const addl = { id: 'additional', heading: 'Additional Terms', body: extra };
      if (sigIdx >= 0) sectionTemplates.splice(sigIdx, 0, addl);
      else sectionTemplates.push(addl);
    }
  }

  const sections = sectionTemplates
    .map(s => ({
      heading: fillTemplate(s.heading, values).trim(),
      body: fillTemplate(s.body, values).trim(),
    }))
    .filter(s => s.heading || s.body);

  return {
    version: CONTRACT_VERSION,
    title: fillTemplate(custom.title || base.title, values).trim() || base.title,
    intro: fillTemplate(custom.intro || base.intro, values).trim(),
    sections,
    // The explicit yes/no the Client must choose for photo use.
    photoConsentQuestion: fillTemplate(custom.photoConsentQuestion || base.photoConsentQuestion, values).trim(),
  };
}

// Plain-text render, used for email bodies and the PDF.
export function contractToPlainText(contract, { signedName, signedAt, photoConsent } = {}) {
  const lines = [];
  lines.push(contract.title.toUpperCase());
  lines.push('');
  lines.push(contract.intro);
  lines.push('');
  contract.sections.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.heading}`);
    lines.push(s.body);
    lines.push('');
  });
  if (photoConsent !== undefined && photoConsent !== null) {
    lines.push(`Photo consent: ${photoConsent ? 'YES — permission granted to post photos online.' : 'NO — do not post photos online.'}`);
    lines.push('');
  }
  if (signedName) {
    lines.push('---');
    lines.push(`Signed by: ${signedName}`);
    if (signedAt) lines.push(`Date: ${signedAt}`);
    lines.push(`Agreement version: ${contract.version}`);
  }
  return lines.join('\n');
}
