import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function POST(req) {
  try {
    const supabase = createClient();
    const { token, booking_id } = await req.json();
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    // Check bookings first
    let { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();

    if (error) throw error;

    // If not found in bookings, check bridal_inquiries
    if (!booking) {
      const { data: bridal, error: bridalErr } = await supabase
        .from('bridal_inquiries')
        .select('*')
        .eq('upload_token', token)
        .maybeSingle();
      if (bridalErr) throw bridalErr;
      if (bridal) {
        return NextResponse.json({ booking: { ...bridal, name: bridal.bride_name, created_date: bridal.created_at } });
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    return NextResponse.json({ booking: { ...booking, created_date: booking.created_at } });
  } catch (err) {
    console.error('get-booking-by-token:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
