// A status, said with its colour on a light tint of itself. It used to be a
// solid block of saturated colour with white text on every row, which is most
// of what made a full list feel loud. Blue is still confirmed, amber still
// pending; they just stop shouting. The tones are variables (admin.css), so the
// badge is right in dark mode without being told.
//
// Appointments and class registrations use different words for the same few
// states, and both end up in the same lists.
const TONE = {
  pending: 'bg-tone-pending/10 text-tone-pending',
  new: 'bg-tone-pending/10 text-tone-pending',
  contacted: 'bg-tone-pending/10 text-tone-pending',
  confirmed: 'bg-tone-confirmed/10 text-tone-confirmed',
  enrolled: 'bg-tone-confirmed/10 text-tone-confirmed',
  completed: 'bg-tone-done/10 text-tone-done',
  cancelled: 'bg-tone-alert/10 text-tone-alert',
  declined: 'bg-tone-alert/10 text-tone-alert',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex h-[22px] shrink-0 items-center px-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${TONE[status] || TONE.pending}`}>
      {status}
    </span>
  );
}
