import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { validateImageFile } from '../../../src/lib/requireAdmin';

// Public, token-gated endpoint. Lets a client attach their own photos
// (with & without makeup, inspiration) to their booking via the personal
// upload link. Photos land in the booking's reference_photos, which the
// admin client card already displays in its own section.
export async function POST(req) {
  try {
    const supabase = createClient();
    const formData = await req.formData();
    const token = formData.get('token');
    const files = formData.getAll('file').filter(Boolean);
    // Optional category tag ("without" | "with" | "extra"). We encode it in the
    // storage path so the admin card can group photos without a schema change;
    // reference_photos stays a flat URL array (backward compatible).
    const rawCategory = String(formData.get('category') || '').toLowerCase();
    const category = ['without', 'with', 'extra'].includes(rawCategory) ? rawCategory : 'misc';

    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    if (files.length > 10) return NextResponse.json({ error: 'Too many files at once (max 10).' }, { status: 400 });

    for (const f of files) {
      const validationError = validateImageFile(f);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Always resolve the record via token — never trust a client-supplied ID.
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, reference_photos')
      .eq('upload_token', token)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 });

    const mimeToExt = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heic' };
    const urls = [];
    for (const file of files) {
      const ext = mimeToExt[file.type] || 'jpg';
      const path = `client/${booking.id}/${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('reference-photos')
        .upload(path, arrayBuffer, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('reference-photos').getPublicUrl(path);
      urls.push(publicUrl);
    }

    const existing = Array.isArray(booking.reference_photos) ? booking.reference_photos : [];
    const updated = [...existing, ...urls];
    const { error: updateError } = await supabase.from('bookings').update({ reference_photos: updated }).eq('id', booking.id);
    if (updateError) throw updateError;

    return NextResponse.json({ urls, reference_photos: updated, success: true });
  } catch (err) {
    console.error('upload-client-photos:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
