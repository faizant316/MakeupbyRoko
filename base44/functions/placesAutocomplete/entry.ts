import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { input } = await req.json().catch(() => ({}));

    if (!input || input.length < 2) {
      return Response.json({ predictions: [] });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_SERVER_KEY');
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment|geocode&components=country:us&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    console.log('Places API full response:', JSON.stringify(data));
    return Response.json({ predictions: data.predictions || [], status: data.status, error: data.error_message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});