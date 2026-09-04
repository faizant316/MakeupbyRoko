// The record of what a client was actually sent.
//
// alerts.js answers "did anything break?". This answers the question that
// turned out to matter more often: "did she get her email?" — which an empty
// alert log cannot distinguish from "we never tried to send it".
//
// The shape is deliberately: write the row FIRST, resolve it after. A row is
// inserted as `queued` before Resend is called, so a send that dies halfway
// (a timeout, a serverless function killed mid-flight) still leaves a trace
// instead of vanishing. Nothing here throws: logging an email must never be the
// thing that stops the email.
import { createClient } from './supabase/server';

// Resend's event names, mapped to the status we keep on the row. `sent` is
// deliberately absent: our own send already wrote it, and the webhook's copy
// would only ever arrive to say the same thing later.
const EVENT_STATUS = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.delivery_delayed': 'delayed',
};

// Once an email has bounced, a later "delivered" for the same message must not
// paint over it — Resend can emit events out of order, and a bounce is the one
// outcome the dashboard exists to show. Higher wins.
const STATUS_RANK = {
  queued: 0, sent: 1, delayed: 2, delivered: 3, complained: 4, bounced: 5, failed: 5,
};

/**
 * Open a log row for an email that is about to be sent.
 * @returns {Promise<string|null>} the row id, or null if logging failed.
 */
export async function beginEmail({ bookingId, registrationId, kind, audience = 'client', recipient, subject, html }) {
  try {
    const { data, error } = await createClient()
      .from('email_log')
      .insert({
        booking_id: bookingId || null,
        registration_id: registrationId || null,
        kind: kind || 'unknown',
        audience,
        recipient: String(recipient || '').slice(0, 320),
        subject: subject ? String(subject).slice(0, 500) : null,
        // Client copies only: the resend button replays these, and Roko's own
        // admin copy is never worth a second send or the row size.
        html: audience === 'client' ? (html || null) : null,
        status: 'queued',
      })
      .select('id').single();
    if (error) { console.error('email_log insert failed:', error.message); return null; }
    return data.id;
  } catch (err) {
    console.error('email_log insert threw:', err?.message || err);
    return null;
  }
}

/** Resend accepted it. Stores the message id so the webhook can find this row. */
export async function finishEmail(id, { resendId }) {
  if (!id) return;
  try {
    await createClient().from('email_log')
      .update({ status: 'sent', resend_id: resendId || null, sent_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) { console.error('email_log finish failed:', err?.message || err); }
}

/** Resend rejected it, or the call threw. The client got nothing. */
export async function failEmail(id, reason) {
  if (!id) return;
  try {
    await createClient().from('email_log')
      .update({ status: 'failed', error: String(reason?.message || reason || 'unknown').slice(0, 500) })
      .eq('id', id);
  } catch (err) { console.error('email_log fail failed:', err?.message || err); }
}

/**
 * Apply one Resend webhook event to the row it belongs to.
 * @returns {Promise<{matched: boolean, status?: string, recipient?: string, kind?: string, bookingId?: string}>}
 */
export async function applyResendEvent({ resendId, type, at }) {
  const status = EVENT_STATUS[type];
  if (!resendId) return { matched: false };
  try {
    const supabase = createClient();
    const { data: row } = await supabase.from('email_log')
      .select('id, status, recipient, kind, booking_id')
      .eq('resend_id', resendId).limit(1).maybeSingle();
    if (!row) return { matched: false };

    const when = at || new Date().toISOString();
    const patch = { last_event: type, last_event_at: when };
    // Unknown event types (opens, clicks) still stamp last_event, so the row
    // shows the message is alive, without pretending to be a delivery verdict.
    if (status && (STATUS_RANK[status] ?? 0) >= (STATUS_RANK[row.status] ?? 0)) patch.status = status;
    if (status === 'delivered' && !row.delivered_at) patch.delivered_at = when;

    await supabase.from('email_log').update(patch).eq('id', row.id);
    return { matched: true, status: patch.status || row.status, recipient: row.recipient, kind: row.kind, bookingId: row.booking_id };
  } catch (err) {
    console.error('email_log event failed:', err?.message || err);
    return { matched: false };
  }
}
