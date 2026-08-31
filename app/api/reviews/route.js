import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { raiseAlert, keysOf } from '../../../src/lib/alerts';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Approved reviews are the ones on the public wall, so that one query stays
    // open to everyone. Anything else is moderation state: a review sits at
    // 'pending' precisely because Roko has not decided whether it should be
    // seen, and this route runs on the service-role key, so an unfiltered GET
    // was handing every unvetted submission to anyone who asked for it.
    if (status !== 'approved') {
      const { authError } = await requireAdmin();
      if (authError) return authError;
    }

    const supabase = createClient();
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data.map(r => ({ ...r, created_date: r.created_at })));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  let body = null;
  try {
    const supabase = createClient();
    body = await req.json();
    const { name, rating, message, service, highlights, location, photo } = body;
    if (!name || !message) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        name,
        message,
        rating: rating || 5,
        service: service || null,
        highlights: Array.isArray(highlights) ? highlights.slice(0, 8) : [],
        location: location || null,
        photo: photo || null,
        status: 'pending',
      })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    // This catch used to be completely empty, not even a console.error: a
    // client's review could vanish without leaving a single trace anywhere.
    await raiseAlert({
      source: 'api/reviews', kind: 'insert_failed',
      message: 'A client submitted a review and it could not be saved.',
      context: { error: err?.message, code: err?.code, sent_keys: keysOf(body) },
    });
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
