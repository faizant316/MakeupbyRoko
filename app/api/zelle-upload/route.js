import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function POST(req) {
  try {
    const supabase = createClient();
    const formData = await req.formData();
    const file = formData.get('file');
    const token = formData.get('token');
    const bookingId = formData.get('bookingId');

    if (!file || !token) return NextResponse.json({ error: 'file and token required' }, { status: 400 });

    // Validate token
    let recordId = bookingId;
    let table = 'bookings';

    if (!recordId) {
      const { data: booking } = await supabase.from('bookings').select('id').eq('upload_token', token).maybeSingle();
      if (booking) {
        recordId = booking.id;
      } else {
        const { data: bridal } = await supabase.from('bridal_inquiries').select('id').eq('upload_token', token).maybeSingle();
        if (bridal) { recordId = bridal.id; table = 'bridal_inquiries'; }
      }
    }

    if (!recordId) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

    // Upload to Supabase Storage
    const ext = file.name?.split('.').pop() || 'jpg';
    const path = `${recordId}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('zelle-screenshots')
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('zelle-screenshots').getPublicUrl(path);

    // Update the record
    const updateData = { zelle_screenshot: publicUrl };
    if (table === 'bridal_inquiries') updateData.zelle_received = true;
    else updateData.deposit_received = true;

    await supabase.from(table).update(updateData).eq('id', recordId);

    return NextResponse.json({ url: publicUrl, success: true });
  } catch (err) {
    console.error('zelle-upload:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
