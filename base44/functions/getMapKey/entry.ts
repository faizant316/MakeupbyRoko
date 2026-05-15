import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    return Response.json({ key: Deno.env.get('GOOGLE_MAPS_API_KEY') || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});