import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { input } = await req.json();
    if (!input) return NextResponse.json({ predictions: [] });

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${key}&types=establishment|geocode`;

    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('places-autocomplete:', err);
    return NextResponse.json({ predictions: [] });
  }
}
