import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data.map(r => ({ ...r, created_date: r.created_at }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/bookings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const upload_token = body.upload_token || uuidv4();
    const { data, error } = await supabase
      .from('bookings')
      .insert({ ...body, upload_token })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    console.error('POST /api/bookings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
