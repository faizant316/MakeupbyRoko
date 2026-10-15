import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shortDateTime } from './depositState';
import { Panel, cx } from './ui';

// "Did she actually get the email?" — answered on the card, where the question
// gets asked.
//
// Before this, the honest answer was "nobody can tell". A send that Resend
// rejected raised an alert to the developer; a send that never happened at all
// raised nothing, because there was nothing to fail. Roko had no surface for
// either, so a bride sitting on a booking with no deposit instructions looked
// identical to one who had everything.
//
// Two states are kept deliberately distinct. "Sent" means the mail service
// accepted the message. "Delivered" means it came back to say the receiving
// server took it. Collapsing those into one green tick would be the same false
// comfort as before, so the two differ in shape as well as in word: delivered
// is a filled tint, sent is only an outline.

const INK = {
  // Confirmed by the receiving mail server. Quiet, because it is the boring case.
  delivered: { dot: 'bg-tone-done', chip: 'bg-tone-done/10 text-tone-done' },
  // Handed over, nothing heard back yet. Neutral, and not the delivered tint.
  sent:      { dot: 'bg-ink-muted', chip: 'text-ink-muted shadow-[inset_0_0_0_1px_rgb(var(--c-line-strong))]' },
  // Slow, but not lost: the mail service retries these itself.
  delayed:   { dot: 'bg-tone-pending', chip: 'bg-tone-pending/10 text-tone-pending' },
  // She definitely did not get it. The whole reason the panel exists.
  bounced:   { dot: 'bg-tone-alert', chip: 'bg-tone-alert/10 text-tone-alert' },
};
INK.failed = INK.bounced;
INK.complained = INK.delayed;
INK.queued = INK.delayed;

const tone = (status) => INK[status] || INK.sent;

const STATUS_LABEL = {
  delivered: 'Delivered', sent: 'Sent', delayed: 'Delayed',
  bounced: 'Bounced', complained: 'Marked spam', failed: 'Failed', queued: 'Not sent',
};

// What each email actually is, in Roko's words rather than the code's.
const KIND_LABEL = {
  booking_confirmation: 'Booking request received',
  bridal_confirmation: 'Bridal inquiry received',
  booking_confirmed: 'Appointment confirmed',
  bridal_confirmed: 'Confirmed + consultation',
  consultation: 'Consultation scheduled',
  message_from_roko: 'Message from you',
  message_with_agreement: 'Message + updated agreement',
  cancel_requested: 'Cancellation request received',
  cancelled: 'Cancellation notice',
  cancelled_by_admin: 'Cancellation notice',
  class_lesson: 'Class scheduled',
  class_payment: 'Class booking confirmed',
  // Roko's own copies. The "your copy" tag beside the name says who it went to,
  // so these only need to name the event, not repeat the word admin.
  admin_new_booking: 'New booking',
  admin_bridal_confirmed: 'Confirmed + consultation',
  admin_consultation: 'Consultation scheduled',
  admin_cancel_requested: 'Cancellation request',
  admin_cancelled: 'Cancellation',
  admin_agreement_resigned: 'Agreement re-signed',
  admin_class_lesson: 'Class scheduled',
  admin_class_payment: 'New class booking',
};
// Anything unmapped still reads as English rather than as a variable name that
// escaped: "some_new_email" becomes "Some new email".
const kindLabel = (k) => {
  if (KIND_LABEL[k]) return KIND_LABEL[k];
  const words = String(k || 'Email').replace(/^admin_/, '').replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// A panel of its own. `className` defaults to the bottom margin the class
// registration card spaces its sections with; the client card passes its own.
// `dm` is still accepted from both callers; the colours switch themselves now.
// eslint-disable-next-line no-unused-vars
export default function EmailLogPanel({ booking, registration, dm, className = 'mb-6', style }) {
  const queryClient = useQueryClient();
  const [resending, setResending] = useState(null);
  const [note, setNote] = useState(null);

  const bookingId = booking?.id;
  const registrationId = registration?.id;
  const key = ['email-log', bookingId || registrationId];

  const { data, isPending, isError } = useQuery({
    queryKey: key,
    enabled: !!(bookingId || registrationId),
    queryFn: async () => {
      const param = bookingId ? `bookingId=${bookingId}` : `registrationId=${registrationId}`;
      const res = await fetch(`/api/email-log?${param}`);
      if (!res.ok) throw new Error('Could not load');
      return res.json();
    },
  });

  const resend = async (row) => {
    setResending(row.id);
    setNote(null);
    try {
      const res = await fetch('/api/email-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not send');
      setNote({ ok: true, text: `Sent again to ${row.recipient}.` });
      queryClient.invalidateQueries({ queryKey: key });
    } catch (err) {
      setNote({ ok: false, text: err.message });
    } finally {
      setResending(null);
    }
  };

  if (!bookingId && !registrationId) return null;

  const list = data?.rows || [];
  const clientRows = list.filter((r) => r.audience === 'client');
  // The amber warning is only honest for a booking taken AFTER logging started.
  // Anything older has no rows because none were ever written, not because the
  // client was never emailed, and marking those red would put a false alarm on
  // every client Roko has ever had.
  const bookedAt = booking?.created_at || registration?.created_at;
  const inLoggedEra = data?.since && bookedAt && new Date(bookedAt) > new Date(data.since);
  const worrying = !isPending && !isError && !clientRows.length && inLoggedEra
    && !!(booking?.email || registration?.email);

  return (
    <Panel title="Emails" className={className} style={style}>
      {isPending && <p className="px-4 py-4 text-[0.86rem] text-ink-muted sm:px-5">Checking&hellip;</p>}

      {/* An unreachable log means we don't know, and saying so is the only
          honest option. It must never read as "nothing was sent". */}
      {isError && (
        <p className="px-4 py-4 text-[0.86rem] leading-relaxed text-ink-muted sm:px-5">
          Couldn&apos;t load the email history just now. That doesn&apos;t mean nothing was sent.
        </p>
      )}

      {!isPending && !isError && list.length === 0 && (
        worrying ? (
          <div className="bg-tone-pending/[0.05] px-4 py-4 sm:px-5">
            <p className="text-[0.86rem] font-semibold text-tone-pending">
              No email on record for this booking
            </p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-soft">
              She may never have received her deposit details or her upload link.
              Use Message Client above to send them.
            </p>
          </div>
        ) : (
          <p className="px-4 py-4 text-[0.86rem] leading-relaxed text-ink-muted sm:px-5">
            {data?.since && bookedAt && new Date(bookedAt) <= new Date(data.since)
              ? 'This booking predates email tracking, so nothing is listed. It does not mean she was never emailed.'
              : 'Nothing recorded yet.'}
          </p>
        )
      )}

      {!isPending && !isError && list.length > 0 && (
        <ul className="divide-y divide-line">
          {list.map((row) => {
            const t = tone(row.status);
            const isClient = row.audience === 'client';
            const stamp = row.sent_at || row.created_at;
            return (
              <li key={row.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <span className={cx('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.86rem] font-semibold leading-snug text-ink">
                      {kindLabel(row.kind)}
                    </span>
                    <span className={cx('inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em]', t.chip)}>
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                    {!isClient && <span className="text-[0.74rem] text-ink-muted">your copy</span>}
                  </div>
                  <p className="mt-1 text-[0.74rem] leading-snug text-ink-muted">
                    <span className="break-all">{row.recipient}</span>
                    {stamp ? <span className="whitespace-nowrap tabular-nums"> · {shortDateTime(stamp)}</span> : null}
                  </p>
                  {/* The only subtitle left, and the only one that ever told
                      Roko something she could act on. */}
                  {row.error && (
                    <p className="mt-1 text-[0.74rem] leading-snug text-tone-alert">
                      {row.error}
                    </p>
                  )}
                  {/* Under the row rather than beside it, so the address and
                      the time keep the width they need in a narrow column. */}
                  {isClient && (
                    <button type="button" onClick={() => resend(row)} disabled={resending === row.id}
                      className="press mt-2.5 inline-flex h-8 items-center rounded-ctl border border-line-strong bg-paper px-3 text-[0.74rem] font-medium text-ink hover:border-ink/50 disabled:pointer-events-none disabled:opacity-40 max-sm:h-10">
                      {resending === row.id ? 'Sending…' : 'Send again'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {note && (
        <p className={cx('border-t border-line px-4 py-3 text-[0.8rem] sm:px-5', note.ok ? 'text-ink-soft' : 'text-tone-alert')}>
          {note.text}
        </p>
      )}

      {list.length > 0 && (
        <p className="border-t border-line px-4 py-3 text-[0.74rem] leading-snug text-ink-muted sm:px-5">
          Send again resends the original email exactly as it was.
        </p>
      )}
    </Panel>
  );
}
