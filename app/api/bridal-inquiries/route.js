import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    let query = supabase.from('bridal_inquiries').select('*').order('created_at', { ascending: false });
    const email = searchParams.get('email');
    if (email) query = query.eq('email', email);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data.map(r => ({ ...r, created_date: r.created_at })));
  } catch (err) {
    console.error('GET /api/bridal-inquiries:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();

    const { bride_name, soon_to_be_last_name, email, phone, instagram_handle, wedding_date,
      event_location, event_start_time, photographer, hairstylist, venue_access_time,
      num_people_glam, additional_details, how_heard, ready_by_time, photographer_arrival_time,
      out_of_state, preferred_date, preferred_time, status, service } = body;

    if (!bride_name || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

    const upload_token = body.upload_token || uuidv4();
    const insert = {
      bride_name, soon_to_be_last_name, email, phone, instagram_handle, wedding_date,
      event_location, event_start_time, photographer, hairstylist, venue_access_time,
      num_people_glam, additional_details, how_heard, ready_by_time, photographer_arrival_time,
      out_of_state, preferred_date, preferred_time, status, service, upload_token,
    };

    const { data, error } = await supabase.from('bridal_inquiries').insert(insert).select().single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    console.error('POST /api/bridal-inquiries:', err);
    return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 });
  }
}
