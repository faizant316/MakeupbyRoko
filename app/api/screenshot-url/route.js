import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

// The only tables that carry a zelle_screenshot column.
const DEPOSIT_TABLES = ['bookings', 'bridal_inquiries'];

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const { id, table = 'bookings' } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    // `table` comes from the request body and goes straight into the query
    // builder on a service-role client, which bypasses RLS. Only these two
    // tables have a deposit screenshot on them, so anything else is either a
    // typo or someone reading a table this route was never meant to reach.
    if (!DEPOSIT_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Unknown record type' }, { status: 400 });
    }

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
