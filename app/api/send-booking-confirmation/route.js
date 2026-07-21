import { NextResponse } from 'next/server';
import {
  sendEmailPair,
  bookingConfirmationEmail,
  bridalConfirmationEmail,
  adminBookingEmail,
  adminBridalEmail,
  contractClientPanel,
} from '../../../src/lib/email';
import { createClient } from '../../../src/lib/supabase/server';
import { CONTRACT_SETTINGS_KEY, parseContractSettings } from '../../../src/lib/contract';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

// Load Roko's editable contract overrides so emailed agreements match the site.
async function loadContractOverrides() {
  try {
    const supabase = createClient();
    const { data } = await supabase.from('app_settings').select('value').eq('key', CONTRACT_SETTINGS_KEY).maybeSingle();
    return parseContractSettings(data?.value);
  } catch { return {}; }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      bookingId, bookingType, to, firstName, lastName, serviceName, servicePrice, serviceDeposit,
      dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal, readyByTime, notes,
      bridalTitle, bridalDeposit, bridalPrice, bridalRemaining, bridalDateFormatted, makeupReadyByTime,
      phone, instagram, eventLocation, eventStartTime, venueAccessTime, photographerArrival,
      photographer, hairstylist, numPeopleGlam, outOfState, weddingDate, additionalDetails, howHeard,
      contractSignedName, contractSignedAt, contractPhotoConsent,
    } = body;

    // Never trust the caller's `to`. The recipient is read from the booking row
    // (created immediately before this call), so this endpoint can only ever
    // email a real client of the site, not an arbitrary address supplied by an
    // abuser trying to use it as an open relay.
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }
    const supabase = createClient();
    const { data: bookingRow } = await supabase.from('bookings').select('email').eq('id', bookingId).maybeSingle();
    if (!bookingRow?.email) {
      return NextResponse.json({ error: 'Unknown booking' }, { status: 400 });
    }
    const recipient = bookingRow.email;

    const isBridal = bookingType === 'bridal';
    const clientName = [firstName, lastName].filter(Boolean).join(' ') || firstName;

    // Build the signed-agreement panel once and fold it into the client's ONE
    // confirmation email (no separate email). Roko's admin email gets a compact
    // "signed" summary instead, since she has the full copy in her dashboard.
    let contractSection = '';
    if (contractSignedName) {
      const overrides = await loadContractOverrides();
      contractSection = contractClientPanel({
        clientName,
        serviceName: isBridal ? bridalTitle : serviceName,
        dateFormatted: isBridal ? bridalDateFormatted : dateFormatted,
        depositAmount: isBridal ? bridalDeposit : serviceDeposit,
        priceAmount: isBridal ? undefined : servicePrice,
        locationType: isBridal ? 'onlocation' : (hasTravelFee ? 'onlocation' : 'studio'),
        kind: 'appointment',
        overrides,
        signedName: contractSignedName,
        signedAt: contractSignedAt,
        photoConsent: contractPhotoConsent,
      });
    }

    const clientHtml = isBridal
      ? bridalConfirmationEmail({
          firstName, bridalTitle, bridalDateFormatted, bridalDeposit, bridalPrice, bridalRemaining, uploadUrl,
          eventLocation, numPeopleGlam, outOfState, eventStartTime, venueAccessTime,
          hairstylistArriveBy: readyByTime, makeupReadyByTime, photographerArrival, photographer, hairstylist,
          additionalDetails, contractSection,
        })
      : bookingConfirmationEmail({ firstName, serviceName, servicePrice, serviceDeposit, dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal, readyByTime, contractSection });

    // Every subject carries the date. Gmail threads messages that share a
    // subject line and then hides the repeated part of the body behind a "..."
    // expander — which was swallowing the deposit box, since two inquiries for
    // the same package used to arrive under a byte-identical subject. The date
    // keeps each booking in its own conversation.
    const clientSubject = isBridal
      ? `Bridal Inquiry Received · ${bridalTitle} · ${bridalDateFormatted} ✦`
      : `Booking Request Received · ${serviceName} · ${dateFormatted}`;

    const adminSubject = isBridal
      ? `New Bridal Inquiry · ${firstName} (${bridalTitle}) · ${bridalDateFormatted}`
      : `New Booking · ${firstName} · ${serviceName} · ${dateFormatted}`;

    const adminHtml = isBridal
      ? adminBridalEmail({
          firstName, lastName, bridalTitle, weddingDate, bridalDateFormatted, email: recipient, phone, instagram,
          eventLocation, eventStartTime, venueAccessTime, hairstylistArriveBy: readyByTime, makeupReadyByTime, photographerArrival,
          photographer, hairstylist, numPeopleGlam, outOfState, additionalDetails, howHeard,
          contractSignedName, contractSignedAt, contractPhotoConsent,
        })
      : adminBookingEmail({
          name: clientName,
          service: serviceName, date: dateFormatted, email: recipient, phone,
          servicePrice, deposit: serviceDeposit, readyByTime, isEarlyArrival, hasTravelFee, estimatedTotal, notes,
          contractSignedName, contractSignedAt, contractPhotoConsent,
        });

    await sendEmailPair([
      { to: recipient, subject: clientSubject, html: clientHtml },
      { to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml },
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-booking-confirmation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
