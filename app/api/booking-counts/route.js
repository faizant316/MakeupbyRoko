import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';

// Public endpoint — returns confirmed booking counts per date.
// No PII exposed: just { "2026-08-12": 4, "2026-08-05": 2, ... }
export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('date')
      .eq('status', 'confirmed');
    if (error) throw error;

    const counts = {};
    data.forEach(({ date }) => {
      if (date) counts[date] = (counts[date] || 0) + 1;
    });

    return NextResponse.json(counts, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('GET /api/booking-counts:', err);
    return NextResponse.json({}, { status: 500 });
  }
}
