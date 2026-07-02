// ============================================================
// SERVICE AGREEMENT (client-signed booking contract)
// ------------------------------------------------------------
// Single source of truth for the contract text every client
// signs at the end of booking. Filled per booking, then rendered
// in the sign step, the confirmation emails, and the PDF.
//
// Policies below are Roko's confirmed answers. To change wording
// later, edit CONTRACT_POLICIES / buildContract and bump
// CONTRACT_VERSION so old signatures stay tied to what was agreed.
// ============================================================

export const CONTRACT_VERSION = 'v1';

// app_settings key holding Roko's editable contract values (guided fields).
export const CONTRACT_SETTINGS_KEY = 'contract_settings';

// Parse the stored JSON value into a clean overrides object for buildContract.
// Safe on bad/missing input (returns {}), so the contract always renders.
export function parseContractSettings(raw) {
  if (!raw) return {};
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const days = o.cancellationNoticeDays;
    return {
      artistName: o.artistName || undefined,
      cancellationNoticeDays: days === 0 || days ? Number(days) || undefined : undefined,
      travelFeeStart: o.travelFeeStart || undefined,
      extraClause: o.extraClause || undefined,
    };
  } catch { return {}; }
}

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

const money = (v) => (v == null || v === '' ? null : String(v).trim());

// Build the filled contract for a specific booking.
//   clientName    - who is signing (full name)
//   serviceName   - the booked service
//   dateFormatted - human date string, e.g. "Saturday, August 15, 2026"
//   depositAmount - e.g. "$375" (optional; falls back to generic wording)
//   priceAmount   - e.g. "$750" (optional)
//   locationType  - 'studio' | 'onlocation'
export function buildContract({
  clientName = '',
  serviceName = 'your service',
  dateFormatted = 'your selected date',
  depositAmount,
  priceAmount,
  locationType = 'studio',
  kind = 'appointment', // 'appointment' | 'class'
  overrides = {}, // Roko-editable values from admin: { artistName, cancellationNoticeDays, travelFeeStart, extraClause }
} = {}) {
  const deposit = money(depositAmount);
  const price = money(priceAmount);
  const artistName = (overrides.artistName || '').trim() || ARTIST_NAME;
  const days = overrides.cancellationNoticeDays ?? CONTRACT_POLICIES.cancellationNoticeDays;
  const travelStart = (overrides.travelFeeStart || '').toString().trim() || CONTRACT_POLICIES.travelFeeStart;
  const extraClause = (overrides.extraClause || '').trim();
  const isStudio = locationType === 'studio';

  const depositLine = deposit
    ? `A non-refundable deposit of ${deposit} is required to secure your date.`
    : `A non-refundable deposit is required to secure your date.`;

  const balanceLine = price
    ? `The remaining balance (base service price ${price}, plus any travel fee or add-ons) is due in cash on the day of your appointment. No digital payments are accepted for the balance.`
    : `The remaining balance is due in cash on the day of your appointment. No digital payments are accepted for the balance.`;

  const travelBody = isStudio
    ? `This appointment is booked as an in-studio service at the studio in ${CONTRACT_POLICIES.studioLocation}, so no travel fee applies. If the location changes to on-location (the artist traveling to you), a travel fee starting at ${travelStart} will apply.`
    : `On-location services (the artist traveling to you) are subject to a travel fee starting at ${travelStart}, regardless of distance. In-studio appointments at ${CONTRACT_POLICIES.studioLocation} have no travel fee.`;

  const isClass = kind === 'class';

  const bookingSection = { heading: 'Booking & Confirmation', body: isClass
    ? `Submitting this form and completing checkout reserves your seat in the class. Seats are limited and are confirmed once payment is received. ${artistName} reserves the right to reschedule a class if needed, in which case you may attend the new date or receive a refund.`
    : `Submitting this form is a booking request, not a confirmed appointment. Your date is only confirmed once the deposit has been received and acknowledged by the Artist. Appointments are first come, first serve. The Artist reserves the right to decline any booking at her discretion.` };

  const paymentSection = isClass
    ? { heading: 'Payment', body: price
        ? `Your class fee (total ${price}) is paid in full at checkout by card to reserve your seat.`
        : `Your class fee is paid in full at checkout by card to reserve your seat.` }
    : { heading: 'Deposit & Payment', body: `${depositLine} ${balanceLine}` };

  const cancellationSection = { heading: 'Cancellation & Rescheduling', body: isClass
    ? `You must give at least ${days} days notice to cancel or reschedule. Class payments are non-refundable, but with at least ${days} days notice your payment may be transferred one time to a future class date. Cancellations with less than ${days} days notice, and no-shows, forfeit the payment.`
    : `The Client must give at least ${days} days notice to cancel or reschedule. Deposits are non-refundable. With at least ${days} days notice, your deposit may be transferred one time to a new appointment date. Cancellations or changes made with less than ${days} days notice forfeit the deposit in full. Same-day cancellations and no-shows are charged the full service amount. If the Artist must cancel due to illness or emergency, the Client will receive a full refund of the deposit or the option to reschedule at no additional cost.` };

  const sections = [
    bookingSection,
    paymentSection,
    cancellationSection,
    ...(isClass ? [] : [{ heading: 'Travel Fee', body: travelBody }]),
    {
      heading: 'Health, Skin & Allergies',
      body: `It is the Client's responsibility to disclose any skin conditions, allergies, sensitivities, or medical concerns before the appointment. The Artist will not be held liable for reactions resulting from undisclosed conditions. Service may be refused if the Client presents with a contagious condition (for example, an active cold sore or conjunctivitis).`,
    },
    {
      heading: 'Punctuality',
      body: `Please arrive on time. Arrivals more than 15 minutes late may result in a shortened ${isClass ? 'class' : 'service'} or cancellation at the Artist's discretion, without a refund.`,
    },
    {
      heading: 'Photography & Portfolio Use',
      body: `The Artist may photograph the completed look. Your photos will only be used for portfolio and promotional purposes (including Instagram, TikTok, and this website) if you consent below. Your consent choice is recorded with this agreement.`,
    },
    ...(extraClause ? [{ heading: 'Additional Terms', body: extraClause }] : []),
    {
      heading: 'Electronic Signature',
      body: `By typing your full name and submitting this form, you are signing this agreement electronically. You agree that your electronic signature is the legal equivalent of your handwritten signature and that this agreement is binding.`,
    },
  ];

  return {
    version: CONTRACT_VERSION,
    title: 'Service Agreement',
    intro: `This Service Agreement is entered into between ${artistName} ("Artist," ${BUSINESS_NAME}) and ${clientName || 'the client named below'} ("Client") for ${serviceName}${isClass ? '' : ` on ${dateFormatted}`}. By signing below, the Client confirms they have read, understood, and agree to the following terms.`,
    sections,
    // The explicit yes/no the Client must choose for photo use.
    photoConsentQuestion: 'Do you give permission for your photos to be posted online (portfolio, Instagram, TikTok, website)?',
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
