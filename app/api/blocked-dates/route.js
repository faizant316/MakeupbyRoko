import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

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

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase
      .from('blocked_dates')
      .upsert(body, { onConflict: 'date' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
