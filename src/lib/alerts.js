// Raise a visible alarm when a write path loses client data.
//
// The rule this library exists to enforce: a failure that costs the client
// something must never be swallowed. Before this, the bridal inquiry insert
// could fail on every single submission for six days while the site behaved
// normally in every other respect. The failure had nowhere to go.
//
// raiseAlert is the place it goes now. It writes a row (for the admin banner),
// and emails Roko once per problem rather than once per occurrence. It NEVER
// throws and never blocks the request: alerting about a broken booking must not
// be the thing that breaks the booking.
import { createClient } from './supabase/server';
import { DEVELOPER_EMAILS } from './adminAllowlist';

// Whoever maintains the site, NOT ADMIN_NOTIFICATION_EMAIL. That one is Roko's
// personal Gmail, where new-booking notifications land; a Postgres error code
// arriving beside them tells her the thing she paid for is broken and gives her
// nothing she can do. Set ALERT_EMAIL in Vercel to override.
const ALERT_TO = process.env.ALERT_EMAIL || DEVELOPER_EMAILS[0];

// One email per problem per hour. A form that is broken is broken for every
// visitor, so the unthrottled version would be a hundred identical emails and a
// muted inbox, which is just the silent failure again wearing a hat.
const THROTTLE_MS = 60 * 60 * 1000;

// Payload KEYS only. Knowing that `venue_access_time` was absent is the entire
// diagnosis; the bride's phone number adds nothing and does not belong in an
// alert log or an email.
export function keysOf(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj) : [];
}

function alertEmail({ source, kind, message, context }) {
  const rows = Object.entries(context || {})
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:12px;vertical-align:top;">${k}</td>
      <td style="padding:6px 0;font-size:12px;color:#111;font-family:ui-monospace,monospace;">${
        String(Array.isArray(v) ? v.join(', ') : v ?? '').slice(0, 500).replace(/</g, '&lt;')}</td></tr>`)
    .join('');
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#B42318;border-radius:12px;padding:18px;margin-bottom:16px;">
      <p style="margin:0;color:#fff;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Site alert</p>
      <p style="margin:6px 0 0;color:#fff;font-size:18px;font-weight:600;">${source}</p>
    </div>
    <p style="font-size:14px;color:#111;line-height:1.6;margin:0 0 16px;">${message}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:12px;">kind</td>
        <td style="padding:6px 0;font-size:12px;font-family:ui-monospace,monospace;">${kind}</td></tr>
      ${rows}
    </table>
    <p style="font-size:12px;color:#888;line-height:1.6;margin:0;">
      Client data may not have saved. This is recorded on the admin dashboard until it's marked handled.
      Further identical failures in the next hour will not send another email.
    </p>
  </div>`;
}

/**
 * Record a failure and, if it's new, email about it.
 * Safe to call from anywhere: it swallows its own errors on purpose.
 */
export async function raiseAlert({ source, kind, message, context = {}, severity = 'error' }) {
  try {
    const supabase = createClient();

    // Has this exact problem already been reported recently? Checked before the
    // insert so the row we're about to write can't throttle itself.
    const since = new Date(Date.now() - THROTTLE_MS).toISOString();
    const { data: recent } = await supabase
      .from('system_alerts')
      .select('id')
      .eq('source', source).eq('kind', kind)
      .not('notified_at', 'is', null)
      .gte('created_at', since)
      .limit(1);
    const alreadyNotified = !!recent?.length;

    const { data: row, error } = await supabase
      .from('system_alerts')
      .insert({ source, kind, message, context, severity })
      .select('id').single();
    // The alerts table itself being unreachable is the one case with nowhere
    // left to escalate to. Log loudly and carry on; the request must survive.
    if (error) { console.error('ALERT (unrecorded):', source, kind, message, error.message); return; }

    console.error(`ALERT ${severity} ${source} ${kind}: ${message}`);
    if (alreadyNotified) return;

    // Imported lazily so email.js can alert on its OWN failures without the two
    // modules forming a static import cycle.
    const { sendEmail } = await import('./email');
    await sendEmail({
      to: ALERT_TO,
      subject: `Site alert: ${source} (${kind})`,
      html: alertEmail({ source, kind, message, context }),
      // Don't let a failure to send THIS raise another alert, which would try
      // to send another email, forever.
      _internal: true,
    });
    await supabase.from('system_alerts').update({ notified_at: new Date().toISOString() }).eq('id', row.id);
  } catch (err) {
    console.error('raiseAlert failed:', err?.message || err);
  }
}
