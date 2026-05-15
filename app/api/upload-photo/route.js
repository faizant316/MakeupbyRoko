import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function POST(req) {
  try {
    const supabase = createClient();
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const ext = file.name?.split('.').pop() || 'jpg';
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
