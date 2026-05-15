const ADMIN_EMAIL = 'roqiamoshref@gmail.com';

export default function sendAdminBookingEmail({ name, email, phone, service, date, time, notes, type = 'booking' }) {
  const dateFormatted = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not specified';

  const subject = `✨ New ${type === 'bridal' ? 'Bridal Inquiry' : 'Booking'} — ${name}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="font-family:Georgia,serif;font-weight:300;color:#111;">New ${type === 'bridal' ? 'Bridal Inquiry' : 'Booking Request'}</h2><p><strong>Name:</strong> ${name}</p><p><strong>Service:</strong> ${service}</p><p><strong>Date:</strong> ${dateFormatted}</p>${time ? `<p><strong>Time:</strong> ${time}</p>` : ''}<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}<p><a href="https://makeupbyroko.com/admin" style="color:#A0785A;">View in Admin Dashboard →</a></p></div>`;

  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: ADMIN_EMAIL, subject, html }),
  }).catch(err => console.error('sendAdminBookingEmail error:', err));
}
