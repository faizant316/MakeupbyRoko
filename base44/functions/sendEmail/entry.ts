import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_ADDRESS = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

Deno.serve(async (req) => {
  try {
    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const fromName = from_name || 'Roqia Moshref';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${FROM_ADDRESS}>`,
        to: [to],
        subject,
        html: body,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data }, { status: res.status });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});