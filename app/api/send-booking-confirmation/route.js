import { NextResponse } from 'next/server';
import {
  sendEmailPair,
  bookingConfirmationEmail,
  bridalConfirmationEmail,
  adminBookingEmail,
  adminBridalEmail,
} from '../../../src/lib/email';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      bookingType, to, firstName, lastName, serviceName, servicePrice, serviceDeposit,
      dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal, readyByTime, notes,
      bridalTitle, bridalDeposit, bridalDateFormatted,
      phone, instagram, eventLocation, eventStartTime, venueAccessTime, photographerArrival,
      photographer, hairstylist, numPeopleGlam, outOfState, weddingDate, additionalDetails, howHeard,
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

    await sendEmailPair([
      { to, subject: clientSubject, html: clientHtml },
      { to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml },
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-booking-confirmation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
