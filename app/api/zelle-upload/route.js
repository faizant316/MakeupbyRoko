import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { validateImageFile } from '../../../src/lib/requireAdmin';

export async function POST(req) {
  try {
    const supabase = createClient();
    const formData = await req.formData();
    const file = formData.get('file');
    const token = formData.get('token');
    const bookingId = formData.get('bookingId');

    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const validationError = validateImageFile(file);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    // Validate token against database
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

    if (!recordId) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });

    const mimeToExt = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
    const ext = mimeToExt[file.type] || 'jpg';
    const path = `${recordId}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('zelle-screenshots')
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('zelle-screenshots').getPublicUrl(path);

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
