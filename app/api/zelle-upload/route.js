import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { validateImageFile } from '../../../src/lib/requireAdmin';

export async function POST(req) {
  try {
    const supabase = createClient();
    const formData = await req.formData();
    const file = formData.get('file');
    const token = formData.get('token');

    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const validationError = validateImageFile(file);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    // Always resolve record via token — never trust a client-supplied ID
    let recordId = null;
    let table = 'bookings';

    const { data: booking } = await supabase.from('bookings').select('id').eq('upload_token', token).maybeSingle();
    if (booking) {
      recordId = booking.id;
    } else {
      const { data: bridal } = await supabase.from('bridal_inquiries').select('id').eq('upload_token', token).maybeSingle();
      if (bridal) { recordId = bridal.id; table = 'bridal_inquiries'; }
    }

    if (!recordId) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });

    const mimeToExt = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
    const ext = mimeToExt[file.type] || 'jpg';
    const storagePath = `${recordId}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('zelle-screenshots')
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;

    // Store the path (not URL) so we can generate signed URLs on demand.
    //
    // Deliberately does NOT mark the deposit received. The client sending proof
    // and Roko confirming the money are two events, and collapsing them is what
    // made a late deposit invisible: the flag flipped itself, so nothing in the
    // admin had anything new to show. Stamping the arrival time instead puts the
    // booking in the "deposits to confirm" queue, where it's visible on the list
    // until she clears it.
    const updateData = {
      zelle_screenshot: storagePath,
      zelle_uploaded_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from(table).update(updateData).eq('id', recordId);

    // Migration 0009 adds zelle_uploaded_at. If this deploy lands before the
    // migration is run, save the screenshot anyway rather than failing a
    // client's upload over a missing column. The admin queue falls back to
    // "screenshot on file, not yet confirmed", so nothing is lost but the
    // arrival time.
    if (updateError) {
      console.error('zelle-upload: full update failed, retrying without timestamp:', updateError.message);
      const { error: retryError } = await supabase
        .from(table)
        .update({ zelle_screenshot: storagePath })
        .eq('id', recordId);
      if (retryError) throw retryError;
    }

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('zelle-screenshots')
      .createSignedUrl(storagePath, 3600);
    if (signedErr) throw signedErr;

    return NextResponse.json({ url: signedData.signedUrl, success: true });
  } catch (err) {
    console.error('zelle-upload:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
