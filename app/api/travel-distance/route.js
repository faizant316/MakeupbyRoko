import { NextResponse } from 'next/server';
import { STUDIO_ADDRESS } from '@/lib/studio';

// How long it takes to drive from the studio to a venue a bride typed into the
// booking form. The bridal form uses the answer to decide whether her booking is
// a Luxury Bridal Look with a travel fee or a Full Day Service (see
// src/lib/travel.js for the rule and why it exists).
//
// Deliberately free-flow time, not live traffic: `departure_time` would make the
// same venue return a different answer on a Friday afternoon than on a Tuesday
// morning, so two brides with the same venue could be quoted two different
// packages depending on when they happened to open the form. A number Roko
// cannot explain is worse than a number that is five minutes optimistic, and the
// gate carries a buffer for exactly that (TRAVEL_GATE_MINUTES).
//
// Follows the same shape as places-autocomplete: never throws, always answers
// with JSON, and says out loud in the logs when Google refuses rather than
// letting a refusal read as "this venue is nearby".

export async function POST(req) {
  try {
    const { destination } = await req.json();
    const dest = typeof destination === 'string' ? destination.trim() : '';
    if (!dest) return NextResponse.json({ ok: false, reason: 'NO_DESTINATION' });
    // Every call spends money and this route is public, like the autocomplete
    // one beside it. A real venue line is well under this; anything longer is
    // either a mistake or someone running up the bill.
    if (dest.length > 200) return NextResponse.json({ ok: false, reason: 'DESTINATION_TOO_LONG' });

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
      // Same trap as the autocomplete route: without this the key rides along as
      // the literal string "undefined" and Google answers REQUEST_DENIED, which
      // reads exactly like lapsed billing.
      console.error('travel-distance: GOOGLE_MAPS_SERVER_KEY is not set');
      return NextResponse.json({ ok: false, reason: 'NOT_CONFIGURED' });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', STUDIO_ADDRESS);
    url.searchParams.set('destinations', dest);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('units', 'imperial');
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', key);

    // Bounded so a hung upstream cannot hold a serverless function open. The
    // catch below turns a timeout into the same fallback as any other failure.
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(7000) });
    const data = await res.json();

    // Top-level refusals (bad key, quota, billing) arrive with HTTP 200.
    if (data.status !== 'OK') {
      console.error('travel-distance:', data.status, data.error_message || '');
      return NextResponse.json({ ok: false, reason: data.status || 'REQUEST_FAILED' });
    }

    // Per-destination status is separate from the top-level one and is where a
    // venue Google cannot place shows up: NOT_FOUND for an address it cannot
    // geocode, ZERO_RESULTS when it geocodes but no road route exists.
    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      return NextResponse.json({ ok: false, reason: element?.status || 'NO_RESULT' });
    }

    const seconds = element.duration?.value;
    if (typeof seconds !== 'number') return NextResponse.json({ ok: false, reason: 'NO_DURATION' });

    return NextResponse.json({
      ok: true,
      minutes: Math.round(seconds / 60),
      miles: element.distance?.value != null ? Math.round(element.distance.value / 1609.34) : null,
      // What Google matched the typed venue to. Not shown to the bride, but it
      // is the first thing worth seeing when a drive time looks wrong.
      matched: data.destination_addresses?.[0] || null,
    });
  } catch (err) {
    console.error('travel-distance:', err);
    return NextResponse.json({ ok: false, reason: 'REQUEST_FAILED' });
  }
}
