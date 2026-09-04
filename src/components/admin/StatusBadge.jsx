import { STATUS_COLORS, CLASS_STATUS_COLORS } from './statusColors';

export default function StatusBadge({ status }) {
  // Appointments and class registrations use different words for the same few
  // states, and both end up in the same lists.
  const bg = STATUS_COLORS[status] || CLASS_STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      className="px-3 py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-lg flex-shrink-0"
      style={{ background: bg, color: '#fff' }}
    >
      {status}
    </span>
  );
}
