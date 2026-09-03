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
// of size, and the deposit carries a "to book" suffix (desktop only, see below)
// so it reads as the amount due now rather than another number on the card.
//
// One row at every width. A two-column phone layout was tried and dropped: it
// never broke mid-row, but it made the deposit its own line and every bridal
// card that much taller.
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
      className={`flex flex-wrap items-end justify-between gap-y-3.5 ${
        // justify-between distributes the free space, so gap-x is only a floor
        // here. Keeping the phone floor small costs nothing at 360px and up and
        // is what keeps Full Day ("Up to 4 hours") on one row at 320px.
        big ? 'gap-x-8 py-5' : 'gap-x-2 py-4'
      }`}
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
            {/* Desktop only. On a phone this one phrase was the difference
                between three figures sharing a row and the deposit dropping to
                a line of its own, which made every bridal card taller for two
                words the DEPOSIT label underneath already covers. */}
            {suffix && big && (
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
              letterSpacing: big ? '0.16em' : '0.12em',
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
