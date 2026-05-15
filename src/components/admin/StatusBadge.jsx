const STATUS_STYLES = {
  pending:   { bg: '#F59E0B', text: '#fff' },
  confirmed: { bg: '#3B82F6', text: '#fff' },
  completed: { bg: '#22C55E', text: '#fff' },
  cancelled: { bg: '#EF4444', text: '#fff' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className="px-3 py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-lg flex-shrink-0"
      style={{ background: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}