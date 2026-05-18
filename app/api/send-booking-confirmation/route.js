import { NextResponse } from 'next/server';
import {
  sendEmailPair,
  bookingConfirmationEmail,
  bridalConfirmationEmail,
  adminBookingEmail,
  adminBridalEmail,
} from '../../../src/lib/email';

const ADMIN_EMAIL = 'makeupbyroko22@gmail.com';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      bookingType, to, firstName, serviceName, servicePrice, serviceDeposit,
      dateFormatted, uploadUrl, isEarlyArrival, hasTravelFee, estimatedTotal,
      bridalTitle, bridalDeposit, bridalDateFormatted,
      phone, eventLocation, eventStartTime, venueAccessTime, numPeopleGlam, outOfState, weddingDate,
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
      ? adminBridalEmail({ firstName, bridalTitle, weddingDate, bridalDateFormatted, email: to, phone, eventLocation, eventStartTime, venueAccessTime, numPeopleGlam, outOfState })
      : adminBookingEmail({ name: firstName, service: serviceName, date: dateFormatted, email: to, phone: phone || 'N/A', bookingType });

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
