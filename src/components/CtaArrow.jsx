// The arrow that rides in every "Book Now" button.
//
// A bare word reads as a label; a word with an arrow reads as something that
// takes you somewhere. The courses block and the booking band already ended
// their CTAs this way, so the service cards were the odd ones out.
export default function CtaArrow({ className = 'w-3 h-3' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
