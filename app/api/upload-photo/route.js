import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin, validateImageFile } from '../../../src/lib/requireAdmin';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const formData = await req.formData();
    const file = formData.get('file');

    const validationError = validateImageFile(file);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const mimeToExt = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
    const ext = mimeToExt[file.type] || 'jpg';
    const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('reference-photos')
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('reference-photos').getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('upload-photo:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
