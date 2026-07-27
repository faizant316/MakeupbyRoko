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
    const uploadToken = searchParams.get('upload_token');
    if (uploadToken) query = query.eq('upload_token', uploadToken);
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
      num_people_glam, additional_details, how_heard, ready_by_time, makeup_ready_by_time,
      photographer_arrival_time,
      out_of_state, preferred_date, preferred_time, status, service } = body;

    if (!bride_name || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

    const upload_token = body.upload_token || uuidv4();
    // An unanswered optional question is '' rather than a missing key: a text
    // column the form stopped asking about (venue_access_time) otherwise arrives
    // undefined, Postgres sees NULL, and a leftover NOT NULL throws the whole
    // inquiry away. '' satisfies the constraint and still reads as "blank"
    // everywhere it's displayed.
    const opt = (v) => (v === undefined || v === null ? '' : v);
    const insert = {
      bride_name, email, upload_token, out_of_state,
      soon_to_be_last_name: opt(soon_to_be_last_name), phone: opt(phone),
      instagram_handle: opt(instagram_handle), wedding_date: opt(wedding_date),
      event_location: opt(event_location), event_start_time: opt(event_start_time),
      photographer: opt(photographer), hairstylist: opt(hairstylist),
      venue_access_time: opt(venue_access_time), num_people_glam: opt(num_people_glam),
      additional_details: opt(additional_details), how_heard: opt(how_heard),
      ready_by_time: opt(ready_by_time), makeup_ready_by_time: opt(makeup_ready_by_time),
      photographer_arrival_time: opt(photographer_arrival_time),
      preferred_date: opt(preferred_date), preferred_time: opt(preferred_time),
      status: opt(status), service: opt(service),
    };

    // Losing an inquiry is the worst outcome here: the booking and both emails
    // still go through, so the failure is invisible until Roko opens the client
    // card and finds the wedding details gone. Rather than let one unmigrated
    // column do that, drop whatever the live table rejects and keep the rest.
    // Every dropped field is logged so the gap is findable, and the missing
    // migration is the real fix — this is just the floor under it.
    let attempt = { ...insert };
    let data, error, dropped = [];
    for (let i = 0; i <= Object.keys(insert).length; i++) {
      ({ data, error } = await supabase.from('bridal_inquiries').insert(attempt).select().single());
      if (!error) break;
      // 42703 ("column bridal_inquiries.x does not exist") and PGRST204 ("Could
      // not find the 'x' column of 'bridal_inquiries' in the schema cache") word
      // it differently, so try both shapes and keep the first capture that names
      // a field we actually sent. Matching against `attempt` is what stops a
      // stray word ("column OF 'bridal_inquiries'") being mistaken for a column.
      const col = [
        /Could not find the '([a-z_]+)' column/i,
        /column "?(?:bridal_inquiries\.)?([a-z_]+)"? does not exist/i,
      ].map(re => re.exec(error.message || '')?.[1]).find(c => c && c in attempt);
      if (!col) break;
      delete attempt[col];
      dropped.push(col);
    }
    if (dropped.length) {
      console.error(`POST /api/bridal-inquiries: saved without [${dropped.join(', ')}] — run the pending migration`);
    }
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    console.error('POST /api/bridal-inquiries:', err);
    return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 });
  }
}
