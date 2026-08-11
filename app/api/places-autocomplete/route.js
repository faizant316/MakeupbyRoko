import { NextResponse } from 'next/server';

// Where Roko works out of. This is a *soft* bias: it decides ranking when a
// query is ambiguous ("hayward" → Hayward CA, not Hayward WI) without ever
// removing a result. Anything typed clearly enough still wins on text match,
// so LAX comes back first for "lax" despite being 300+ miles outside.
const BIAS_LAT = 37.6688;
const BIAS_LNG = -122.0808;
const RADIUS = 150000;

export async function POST(req) {
  try {
    const { input } = await req.json();
    if (!input) return NextResponse.json({ predictions: [] });

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', key);
    url.searchParams.set('location', `${BIAS_LAT},${BIAS_LNG}`);
    url.searchParams.set('radius', String(RADIUS));
    url.searchParams.set('language', 'en');
    // Deliberately no `types` and no `strictbounds`.
    //
    // `strictbounds` is presence-based in this API, not a boolean — sending
    // `strictbounds=false` switches it *on*, which is what used to happen here.
    // It turned the bias above into a hard fence and quietly dropped every
    // result outside it: LAX sits ~328km from the old center point, just past
    // a 300km radius, so airports and all of Southern California vanished from
    // the form while nearby addresses kept working. Never set this key at all.
    //
    // Omitting `types` returns the full mix Google Maps itself shows —
    // street addresses, businesses, hotels, venues, airports, cities.

    const res = await fetch(url.toString());
    const data = await res.json();

    // Google reports refusals in the body with HTTP 200 (billing lapsed, key
    // restricted, quota gone). Swallowing those is what made an outage look
    // like "no matches" for weeks, so say it out loud in the logs and tell the
    // client something went wrong rather than implying an empty result set.
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('places-autocomplete:', data.status, data.error_message || '');
      return NextResponse.json({ predictions: [], error: data.status });
    }

    return NextResponse.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('places-autocomplete:', err);
    return NextResponse.json({ predictions: [], error: 'REQUEST_FAILED' });
  }
}
