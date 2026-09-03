// Small drawn glyphs, so a check in a button is the same shape as a check in a
// badge and both scale with their type.
//
// These replace the ✓ / ✕ / ✦ characters that used to stand in for icons all
// over the admin. Typed glyphs look fine at 16px and fall apart everywhere
// else: they carry the font's own weight and baseline, so a "✓ Saved" button
// sat a pixel low next to its label, a ✕ inside a 12px legend swatch rendered
// as a smudge, and the whole set changed shape depending on which fallback
// font the machine happened to reach for. A stroked path holds its weight at
// any size and inherits currentColor like every other icon here.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function Check({ className = 'w-3 h-3', strokeWidth = 3, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Cross({ className = 'w-3 h-3', strokeWidth = 3, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

// The house mark. A four-pointed star was already the shape being typed as ✦
// in the sidebar and on the sign-in screen; this is the same shape drawn with
// real curves, so it holds an edge at 24px instead of relying on whatever the
// font decides that character looks like.
export function Star4({ className = 'w-4 h-4', ...rest }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...rest}>
      <path d="M12 2c.5 4.6 2.4 7.5 6.9 8.4l1.1.2v2.8l-1.1.2c-4.5.9-6.4 3.8-6.9 8.4-.5-4.6-2.4-7.5-6.9-8.4L4 13.4v-2.8l1.1-.2C9.6 9.5 11.5 6.6 12 2z" />
    </svg>
  );
}

export function StarOutline({ className = 'w-4 h-4', strokeWidth = 1.6, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <polygon points="12 2.6 14.9 9 21.6 9.8 16.6 14.3 18 21 12 17.6 6 21 7.4 14.3 2.4 9.8 9.1 9" />
    </svg>
  );
}

export function Photo({ className = 'w-4 h-4', strokeWidth = 1.6, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.6" cy="9.4" r="1.6" />
      <path d="M3.5 17.2 8.9 12.4a1.8 1.8 0 0 1 2.4 0l5 4.6M14.4 14.2l2-1.7a1.8 1.8 0 0 1 2.4 0l1.7 1.5" />
    </svg>
  );
}

export function Archive({ className = 'w-4 h-4', strokeWidth = 1.6, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <rect x="2.6" y="4" width="18.8" height="4.4" rx="1.4" />
      <path d="M4.4 8.4v9.4a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2V8.4" />
      <line x1="10" y1="12.4" x2="14" y2="12.4" />
    </svg>
  );
}

export function Lock({ className = 'w-4 h-4', strokeWidth = 1.6, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
      <circle cx="12" cy="15.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Plane({ className = 'w-3.5 h-3.5', strokeWidth = 1.6, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <path d="M10.2 13.8 3 11.4l17.2-6.6-6.6 17.2-2.4-7.2 3.4-3.4z" />
    </svg>
  );
}

export function Undo({ className = 'w-4 h-4', strokeWidth = 2, ...rest }) {
  return (
    <svg {...base} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest}>
      <polyline points="9 14 4 9 9 4" />
      <path d="M4 9h9.5a6.5 6.5 0 0 1 0 13H8" />
    </svg>
  );
}
