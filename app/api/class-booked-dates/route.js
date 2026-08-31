import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { regHoldsDate, regDateOf, DATE_HOLD_COLUMNS } from '../../../src/lib/classSchedule';
import { studioDayKey } from '../../../src/lib/studio';

// Must never be statically optimized — the picker needs live availability.
export const dynamic = 'force-dynamic';

// Dates already taken by a class booking, for the public Wednesday picker.
// One client per Wednesday is the rule, so a date with any active
// registration is closed. Returns bare 'YYYY-MM-DD' strings only, no client
// data ever leaves this route.
export async function GET() {
  try {
    const supabase = createClient();
    // The studio's day, not the runtime's. Vercel runs on UTC, so from 5 PM
    // Pacific onward toISOString() already says tomorrow and a Wednesday that
    // is booked *today* would drop out of the list. See studioDayKey().
    const today = studioDayKey();

    const { data, error } = await supabase
      .from('class_registrations')
      .select(DATE_HOLD_COLUMNS)
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
