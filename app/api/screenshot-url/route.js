import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const { id, table = 'bookings' } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: record } = await supabase
      .from(table)
      .select('zelle_screenshot')
      .eq('id', id)
      .maybeSingle();

    if (!record?.zelle_screenshot) return NextResponse.json({ url: null });

    const { data, error } = await supabase.storage
      .from('zelle-screenshots')
      .createSignedUrl(record.zelle_screenshot, 3600);
    if (error) throw error;

    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    console.error('screenshot-url:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
