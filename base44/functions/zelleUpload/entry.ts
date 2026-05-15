import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, file_url, booking_id } = body;

    if (!token || !file_url) {
      return Response.json({ error: 'Missing token or file_url' }, { status: 400 });
    }

    // Find booking by id and verify token matches
    const booking = await base44.asServiceRole.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.upload_token !== token) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    // Update the booking with the screenshot URL
    await base44.asServiceRole.entities.Booking.update(booking_id, {
      zelle_screenshot: file_url,
      deposit_received: true,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});