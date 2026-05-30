import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

export async function GET(req) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    const status = searchParams.get('status');
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data.map(r => ({ ...r, created_date: r.created_at })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { name, email, rating, text, service } = body;
    if (!name || !text) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const { data, error } = await supabase
      .from('reviews')
      .insert({ name, email, rating, text, service, status: 'pending' })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
