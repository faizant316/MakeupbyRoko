import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const { authError } = await requireAdmin();
  if (authError) return authError;
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();

    const { name, email, phone, service, date, time, notes, status, reference_photos } = body;
    if (!name || !email || !service) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

    const upload_token = body.upload_token || uuidv4();
    const insert = { name, email, phone, service, date, time, notes, status, reference_photos, upload_token };

    const { data, error } = await supabase.from('bookings').insert(insert).select().single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    console.error('POST /api/bookings:', err);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
