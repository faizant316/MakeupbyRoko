import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

async function withScreenshotUrl(supabase, booking) {
  if (!booking?.zelle_screenshot) return booking;
  const { data } = await supabase.storage
    .from('zelle-screenshots')
    .createSignedUrl(booking.zelle_screenshot, 3600);
  return { ...booking, screenshot_url: data?.signedUrl || null };
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const { token, booking_id } = await req.json();
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    let { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();

    if (error) throw error;

    if (!booking) {
      const { data: bridal, error: bridalErr } = await supabase
        .from('bridal_inquiries')
        .select('*')
        .eq('upload_token', token)
        .maybeSingle();
      if (bridalErr) throw bridalErr;
      if (bridal) {
        const withUrl = await withScreenshotUrl(supabase, bridal);
        return NextResponse.json({ booking: { ...withUrl, name: withUrl.bride_name, created_date: withUrl.created_at } });
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const withUrl = await withScreenshotUrl(supabase, booking);
    return NextResponse.json({ booking: { ...withUrl, created_date: withUrl.created_at } });
  } catch (err) {
    console.error('get-booking-by-token:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
