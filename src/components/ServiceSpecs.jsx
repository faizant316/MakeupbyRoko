// Price, duration and deposit, as the three numbers that decide the booking.
//
// These used to run together as a caption ("$750 · 2 hours · $375 deposit"),
// where the figures that actually decide a $750 purchase read as small print.
// The first fix boxed them in a tinted panel, which made them scannable but
// dropped a beige card into the middle of an otherwise white, hairline-ruled
// page.
//
// So: no fill and no box, just the page's own hairline rules above and below.
// Price is the largest figure, the three values sit on one baseline regardless
// of size, and the deposit carries a "to book" suffix so it reads as the amount
// due now rather than another number on the card.
//
// Purely presentational: the same three values, from the same service record.

// The service records store deposits as "$375 deposit". Under a DEPOSIT label
// that trailing word is noise, so drop it (same treatment BridalComparison uses).
const cleanDeposit = (d) => (d || '').replace(/\s*deposit\s*$/i, '').trim();

export default function ServiceSpecs({ svc, size = 'sm' }) {
  const deposit = cleanDeposit(svc.deposit);
  const cells = [
    { label: 'Price', value: svc.price, lead: true },
    { label: 'Duration', value: svc.duration },
    { label: 'Deposit', value: deposit, suffix: 'to book' },
  ].filter((c) => c.value);

  if (!cells.length) return null;

  const big = size === 'lg';

  return (
    <div
      className={
        big
          // Featured card: one row spread across the rules, rather than the
          // three figures bunched into the left third with a stranded rule
          // beside them.
          ? 'flex flex-wrap items-end justify-between gap-x-8 gap-y-4 py-5'
          // Card width on a phone is about 250px, and "Up to 4 hours" alone is
          // a third of that, so three figures cannot share a row at a size
          // worth reading. A fixed two-column grid instead of letting flex-wrap
          // decide: every card breaks in the same place (only Full Day was wide
          // enough to wrap on its own, so the three cards stopped matching),
          // and the deposit gets a line to itself.
          : 'grid grid-cols-2 items-end gap-x-6 gap-y-3.5 py-4'
      }
      style={{ borderTop: '1px solid #f0ebe6', borderBottom: '1px solid #f0ebe6' }}
    >
      {cells.map(({ label, value, suffix, lead }) => (
        <div key={label} className="min-w-0">
          {/* Fixed row height, contents bottom-aligned: the figures can differ
              in size and still share one baseline, which keeps the labels
              underneath on a straight line. */}
          <div
            className="flex items-end gap-1.5"
            style={{ minHeight: big ? '2.1rem' : '1.7rem' }}
          >
            <span
              className="font-serif text-[#111]"
              style={{
                fontSize: lead ? (big ? '1.95rem' : '1.5rem') : (big ? '1.35rem' : '1.12rem'),
                fontWeight: 300,
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}
            >
              {value}
            </span>
            {suffix && (
              <span
                className="text-[#a89f99]"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', lineHeight: 1.5 }}
              >
                {suffix}
              </span>
            )}
          </div>
          <span
            className="mt-1.5 block"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.58rem',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#a89f99',
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
