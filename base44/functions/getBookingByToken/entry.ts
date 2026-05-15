import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, booking_id } = body;

    if (!token || !booking_id) {
      return Response.json({ error: 'Missing token or booking_id' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.upload_token !== token) {
      return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Return only safe public fields
    return Response.json({
      booking: {
        id: booking.id,
        name: booking.name,
        service: booking.service,
        date: booking.date,
        zelle_screenshot: booking.zelle_screenshot || null,
        deposit_received: booking.deposit_received || false,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});