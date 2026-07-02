import { NextResponse } from 'next/server';
import {
  sendEmailPair,
  bookingConfirmationEmail,
  bridalConfirmationEmail,
  adminBookingEmail,
  adminBridalEmail,
  contractCopyEmail,
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
      bookingType, to, firstName, lastName, serviceName, servicePrice, serviceDeposit,
      dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal, readyByTime, notes,
      bridalTitle, bridalDeposit, bridalDateFormatted,
      phone, instagram, eventLocation, eventStartTime, venueAccessTime, photographerArrival,
      photographer, hairstylist, numPeopleGlam, outOfState, weddingDate, additionalDetails, howHeard,
      contractSignedName, contractSignedAt, contractPhotoConsent,
    } = body;

    const isBridal = bookingType === 'bridal';

    const clientHtml = isBridal
      ? bridalConfirmationEmail({ firstName, bridalTitle, bridalDateFormatted, bridalDeposit, uploadUrl })
      : bookingConfirmationEmail({ firstName, serviceName, servicePrice, serviceDeposit, dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal });

    const clientSubject = isBridal
      ? `Bridal Inquiry Received — ${bridalTitle} ✦`
      : `Booking Request Received — ${serviceName}`;

    const adminSubject = isBridal
      ? `New Bridal Inquiry — ${firstName} (${bridalTitle})`
      : `New Booking — ${firstName} · ${serviceName} · ${dateFormatted}`;

    const adminHtml = isBridal
      ? adminBridalEmail({
          firstName, lastName, bridalTitle, weddingDate, bridalDateFormatted, email: to, phone, instagram,
          eventLocation, eventStartTime, venueAccessTime, artistArriveBy: readyByTime, photographerArrival,
          photographer, hairstylist, numPeopleGlam, outOfState, additionalDetails, howHeard,
        })
      : adminBookingEmail({
          name: [firstName, lastName].filter(Boolean).join(' ') || firstName,
          service: serviceName, date: dateFormatted, email: to, phone,
          servicePrice, deposit: serviceDeposit, readyByTime, isEarlyArrival, hasTravelFee, estimatedTotal, notes,
        });

    const emails = [
      { to, subject: clientSubject, html: clientHtml },
      { to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml },
    ];

    // If they signed the service agreement, send a standalone copy to both the
    // client and Roko so each has the signed contract in their inbox.
    if (contractSignedName) {
      const clientName = [firstName, lastName].filter(Boolean).join(' ') || firstName;
      const overrides = await loadContractOverrides();
      const contractArgs = {
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
      };
      emails.push({ to, subject: 'Your Signed Service Agreement — Makeup by Roko', html: contractCopyEmail({ ...contractArgs, forAdmin: false }) });
      emails.push({ to: ADMIN_EMAIL, subject: `Signed Agreement — ${clientName}`, html: contractCopyEmail({ ...contractArgs, forAdmin: true }) });
    }

    await sendEmailPair(emails);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-booking-confirmation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
