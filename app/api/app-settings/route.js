import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function GET(req) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    let query = supabase.from('app_settings').select('*');
    const key = searchParams.get('key');
    if (key) query = query.eq('key', key);
    const { data, error } = await query;
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
      .from('app_settings')
      .upsert(body, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const supabase = createClient();
    const { key, value } = await req.json();
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
