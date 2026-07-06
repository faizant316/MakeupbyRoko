import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { regHoldsDate, regDateOf } from '../../../src/lib/classSchedule';

// Must never be statically optimized — the picker needs live availability.
export const dynamic = 'force-dynamic';

// Dates already taken by a class booking, for the public Wednesday picker.
// One client per Wednesday is the rule, so a date with any active
// registration is closed. Returns bare 'YYYY-MM-DD' strings only, no client
// data ever leaves this route.
export async function GET() {
  try {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // select('*') on purpose: naming preferred_date would 400 on a live DB
    // that hasn't run migration 0003/0004 yet. Nothing but dates is returned.
    const { data, error } = await supabase
      .from('class_registrations')
      .select('*')
      .neq('status', 'cancelled')
      .neq('status', 'declined');

    if (error) throw error;

    const dates = new Set();
    for (const r of data || []) {
      if (!regHoldsDate(r)) continue;
      const d = regDateOf(r);
      if (d && d >= today) dates.add(d);
    }

    return NextResponse.json({ dates: [...dates].sort() }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('class-booked-dates:', err);
    // Fail open with an empty list — checkout re-validates on the server.
    return NextResponse.json({ dates: [] });
  }
}
