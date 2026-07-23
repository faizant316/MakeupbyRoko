import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

async function withScreenshotUrl(supabase, booking) {
  if (!booking?.zelle_screenshot) return booking;
  const { data } = await supabase.storage
    .from('zelle-screenshots')
    .createSignedUrl(booking.zelle_screenshot, 3600);
  return { ...booking, screenshot_url: data?.signedUrl || null };
}

// Friendly label for a class registration built from its boolean columns, so the
// cancel page can show what they booked without pulling in the pricing catalog.
const CLASS_TITLES = {
  private_basic_lesson: 'Private Basic Lesson',
  virtual_lesson: 'Virtual Lesson',
  intermediate_lesson: 'Intermediate Lesson',
  glam_class: 'Glam Class',
  masterclass: 'Masterclass',
};
function classLabel(reg) {
  const chosen = Object.keys(CLASS_TITLES).filter((k) => reg[k]).map((k) => CLASS_TITLES[k]);
  return chosen.join(' + ') || 'Makeup Class';
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

    if (booking) {
      const withUrl = await withScreenshotUrl(supabase, booking);
      return NextResponse.json({ recordType: 'booking', booking: { ...withUrl, created_date: withUrl.created_at } });
    }

    const { data: bridal, error: bridalErr } = await supabase
      .from('bridal_inquiries')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();
    if (bridalErr) throw bridalErr;
    if (bridal) {
      const withUrl = await withScreenshotUrl(supabase, bridal);
      return NextResponse.json({ recordType: 'bridal_inquiry', booking: { ...withUrl, name: withUrl.bride_name, created_date: withUrl.created_at } });
    }

    const { data: reg, error: regErr } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();
    if (regErr) throw regErr;
    if (reg) {
      return NextResponse.json({
        recordType: 'class',
        booking: {
          ...reg,
          name: reg.full_name,
          service: classLabel(reg),
          date: reg.appointment_date,
          time: reg.appointment_time,
          created_date: reg.created_at,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  } catch (err) {
    console.error('get-booking-by-token:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
