import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('blocked_dates').select('*').order('date', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Accepts a single { date, reason } or an array of them, so closing a whole
// trip is one request instead of one per day. An array comes back as an array.
export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const body = await req.json();
    const isBatch = Array.isArray(body);
    if (isBatch && body.length === 0) return NextResponse.json([], { status: 201 });

    const query = supabase.from('blocked_dates').upsert(body, { onConflict: 'date' }).select();
    const { data, error } = isBatch ? await query : await query.single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
