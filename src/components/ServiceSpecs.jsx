// Price, duration and deposit as one bordered strip.
//
// The bridal cards used to run these three facts together as a caption
// ("$750 · 2 hours · $375 deposit"), where the numbers that decide the purchase
// read as small print. Laid out as labelled cells they scan like a real product
// listing, and the deposit stops being the smallest thing on the card.
//
// Purely presentational: the same three values the cards already had, from the
// same service record.

// The service records store deposits as "$375 deposit". Under a DEPOSIT label
// that trailing word is noise, so drop it (same treatment BridalComparison uses).
const cleanDeposit = (d) => (d || '').replace(/\s*deposit\s*$/i, '').trim();

export default function ServiceSpecs({ svc, size = 'sm' }) {
  const deposit = cleanDeposit(svc.deposit);
  const cells = [
    ['Price', svc.price],
    ['Duration', svc.duration],
    deposit ? ['Deposit', deposit] : null,
  ].filter(([, value]) => value);

  if (!cells.length) return null;

  const big = size === 'lg';

  return (
    <div
      className="grid rounded-[var(--radius-lg)] overflow-hidden border border-[#f0e9e5] bg-[#fdfbfa]"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map(([label, value], i) => (
        <div
          key={label}
          className={`min-w-0 ${big ? 'px-5 py-4' : 'px-3.5 py-3'}`}
          style={{ borderLeft: i === 0 ? 'none' : '1px solid #f4eeea' }}
        >
          <span
            className="block"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.52rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#b3a9a3',
            }}
          >
            {label}
          </span>
          <span
            className="block font-serif text-[#111] leading-tight"
            style={{ fontSize: big ? '1.32rem' : '1.05rem', fontWeight: 300, marginTop: '0.28rem' }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
