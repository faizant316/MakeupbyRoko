import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shortDateTime } from './depositState';

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
// comfort as before.

const INK = {
  // Confirmed by the receiving mail server. Quiet, because it is the boring case.
  delivered: { light: { fg: '#3F7D50', bg: 'rgba(22,163,74,0.09)',   line: '#D3E6D8' },
               dark:  { fg: '#7DC08F', bg: 'rgba(22,163,74,0.16)',   line: '#2C4433' } },
  // Handed over, nothing heard back yet. Neutral, NOT green.
  sent:      { light: { fg: '#64748B', bg: 'rgba(100,116,139,0.09)', line: '#E2E5EA' },
               dark:  { fg: '#A7B2C4', bg: 'rgba(148,163,184,0.14)', line: '#3A414D' } },
  // Slow, but not lost: the mail service retries these itself.
  delayed:   { light: { fg: '#A9660B', bg: 'rgba(245,158,11,0.12)',  line: '#F0E0C4' },
               dark:  { fg: '#F5B83C', bg: 'rgba(245,158,11,0.16)',  line: '#4A3D24' } },
  // She definitely did not get it. The whole reason the panel exists.
  bounced:   { light: { fg: '#B91C1C', bg: 'rgba(220,38,38,0.09)',   line: '#F6D2D2' },
               dark:  { fg: '#F28B82', bg: 'rgba(220,38,38,0.16)',   line: '#4A2C2C' } },
};
INK.failed = INK.bounced;
INK.complained = INK.delayed;
INK.queued = INK.delayed;

const tone = (status, dm) => {
  const set = INK[status] || INK.sent;
  return dm ? set.dark : set.light;
};

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

export default function EmailLogPanel({ booking, registration, dm }) {
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

  const border = dm ? '#3a3a48' : '#EBEBEB';
  const muted = dm ? '#8e8e99' : '#999';

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
    <div className="mb-6">
      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-3">Emails</p>

      {isPending && <p className="text-[0.76rem]" style={{ color: muted }}>Checking&hellip;</p>}

      {/* An unreachable log means we don't know, and saying so is the only
          honest option. It must never read as "nothing was sent". */}
      {isError && (
        <p className="text-[0.76rem]" style={{ color: muted }}>
          Couldn&apos;t load the email history just now. That doesn&apos;t mean nothing was sent.
        </p>
      )}

      {!isPending && !isError && list.length === 0 && (
        <div className="rounded-[10px] p-3.5" style={{
          background: worrying ? (dm ? 'rgba(245,158,11,0.12)' : '#FEF6EC') : (dm ? '#27272a' : '#fafafa'),
          border: `1px solid ${worrying ? (dm ? 'rgba(245,158,11,0.35)' : '#F3DFC0') : (dm ? '#3a3a48' : '#e5e5e5')}`,
        }}>
          {worrying ? (
            <>
              <p className="text-[0.78rem] font-semibold mb-1" style={{ color: dm ? '#f0b666' : '#B45309' }}>
                No email on record for this booking
              </p>
              <p className="text-[0.72rem] leading-snug" style={{ color: dm ? '#c9a877' : '#a97a2e' }}>
                She may never have received her deposit details or her upload link.
                Use Message Client above to send them.
              </p>
            </>
          ) : (
            <p className="text-[0.76rem]" style={{ color: muted }}>
              {data?.since && bookedAt && new Date(bookedAt) <= new Date(data.since)
                ? 'This booking predates email tracking, so nothing is listed. It does not mean she was never emailed.'
                : 'Nothing recorded yet.'}
            </p>
          )}
        </div>
      )}

      {!isPending && !isError && list.length > 0 && (
        <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${border}` }}>
          {list.map((row, i) => {
            const t = tone(row.status, dm);
            const isClient = row.audience === 'client';
            const stamp = row.sent_at || row.created_at;
            return (
              <div key={row.id} className="flex items-start gap-3 p-3.5"
                style={{ borderTop: i ? `1px solid ${border}` : 'none', background: dm ? '#27272a' : '#fff' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]" style={{ background: t.fg }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[0.78rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>
                      {kindLabel(row.kind)}
                    </span>
                    <span className="text-[0.66rem] font-medium tracking-[0.05em] uppercase px-1.5 py-[2px] rounded-[4px]"
                      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.line}` }}>
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                    {!isClient && <span className="text-[0.68rem]" style={{ color: muted }}>your copy</span>}
                  </div>
                  <p className="text-[0.72rem] mt-1 break-all" style={{ color: muted }}>
                    {row.recipient}{stamp ? ` · ${shortDateTime(stamp)}` : ''}
                  </p>
                  {/* The only subtitle left, and the only one that ever told
                      Roko something she could act on. */}
                  {row.error && (
                    <p className="text-[0.72rem] mt-1 leading-snug" style={{ color: dm ? '#f28b82' : '#B91C1C' }}>
                      {row.error}
                    </p>
                  )}
                </div>
                {isClient && (
                  <button type="button" onClick={() => resend(row)} disabled={resending === row.id}
                    className="flex-shrink-0 text-[0.7rem] font-medium px-2.5 py-1.5 rounded-[6px] transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ color: dm ? '#ECEDF1' : '#111', background: dm ? '#33333d' : '#f5f5f5', border: `1px solid ${border}` }}>
                    {resending === row.id ? 'Sending…' : 'Send again'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {note && (
        <p className="text-[0.72rem] mt-2" style={{ color: note.ok ? (dm ? '#7DC08F' : '#3F7D50') : (dm ? '#f28b82' : '#B91C1C') }}>
          {note.text}
        </p>
      )}

      {list.length > 0 && (
        <p className="text-[0.68rem] mt-2 leading-snug" style={{ color: muted }}>
          Send again resends the original email exactly as it was.
        </p>
      )}
    </div>
  );
}
