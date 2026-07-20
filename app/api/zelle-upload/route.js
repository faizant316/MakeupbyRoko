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
    // The deposit marks itself received: asking Roko to confirm was busywork,
    // since her bank already told her the money landed. What makes it visible
    // is zelle_uploaded_at, not an unconfirmed state. Leaving deposit_seen_at
    // null is what puts it in the alert bar until she opens the card.
    const now = new Date().toISOString();
    const updateData = {
      zelle_screenshot: storagePath,
      zelle_uploaded_at: now,
    };
    if (table === 'bridal_inquiries') {
      updateData.zelle_received = true;
      updateData.zelle_confirmed_at = now;
    } else {
      updateData.deposit_received = true;
      updateData.deposit_confirmed_at = now;
    }

    const { error: updateError } = await supabase.from(table).update(updateData).eq('id', recordId);

    // Migrations 0009/0010 add the timestamp columns. If this deploy lands
    // before they're run, save the screenshot and the received flag anyway
    // rather than failing a client's upload over a missing column. The admin
    // still shows the deposit, just without the arrival time.
    if (updateError) {
      console.error('zelle-upload: full update failed, retrying without timestamps:', updateError.message);
      const fallback = { zelle_screenshot: storagePath };
      if (table === 'bridal_inquiries') fallback.zelle_received = true;
      else fallback.deposit_received = true;
      const { error: retryError } = await supabase.from(table).update(fallback).eq('id', recordId);
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
