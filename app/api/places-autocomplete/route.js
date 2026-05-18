import { NextResponse } from 'next/server';

// Location bias: center of California, 300km radius — prioritizes CA results
const CA_LAT = 36.7783;
const CA_LNG = -119.4179;
const RADIUS = 300000;

export async function POST(req) {
  try {
    const { input } = await req.json();
    if (!input) return NextResponse.json({ predictions: [] });

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', key);
    url.searchParams.set('types', 'establishment|geocode');
    url.searchParams.set('location', `${CA_LAT},${CA_LNG}`);
    url.searchParams.set('radius', String(RADIUS));
    url.searchParams.set('strictbounds', 'false');
    url.searchParams.set('language', 'en');

    const res = await fetch(url.toString());
    const data = await res.json();
    return NextResponse.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('places-autocomplete:', err);
    return NextResponse.json({ predictions: [] });
  }
}
