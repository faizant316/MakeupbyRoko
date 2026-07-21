// Single source of truth for the class catalog — titles, formats, prices,
// durations, and bookable time slots. Import this everywhere instead of
// duplicating the object.
//
// PRICING — every price already includes the Stripe processing fee.
// Stripe takes 2.9% + $0.30 per charge, so the advertised price is the base
// price grossed up (base + 0.30) / (1 - 0.029), rounded up to the nearest $5
// so Roko always nets at least the base:
//   online    beginner  $300 → $310      advanced  $1,200 → $1,240
//   in person beginner  $500 → $520      advanced  $1,400 → $1,445
// What the client sees is exactly what they're charged (no surprise at
// checkout), and amount_paid on the registration records this same number.

export const CLASS_FORMATS = {
  online: {
    key: 'online',
    label: 'Online',
    short: 'Online · Zoom',
    blurb: 'Live over Zoom. Your meeting link arrives instantly after checkout.',
  },
  in_person: {
    key: 'in_person',
    label: 'In Person',
    short: 'In Person · Mountain House',
    blurb: "At Roko's studio in Mountain House, CA. The address is in your confirmation email.",
  },
};

export const FORMAT_KEYS = Object.keys(CLASS_FORMATS);
export const DEFAULT_FORMAT = 'in_person';

export const CLASS_CATALOG = {
  private_basic_lesson: {
    title: 'Beginner Makeup Lesson',
    description: 'Perfect for anyone wanting to master makeup on themselves. We focus on a soft, everyday glam you can confidently recreate, with personalized guidance for your features.',
    includes: [
      'Everyday soft glam application',
      'Flawless skin prep, foundation, concealer, contour, and highlight',
      'Soft brown eyeshadow look (up to three shadows)',
      'Eyeliner and lash application',
      'Brow shaping and lip contour',
      'Product recommendations and personalized foundation match',
      'Techniques you can recreate at home',
    ],
    formats: {
      online: {
        price: 1, // TEMP $1 LAUNCH TEST — real price 310. REVERT THIS COMMIT.
        duration: '3 hours',
        durationMinutes: 180,
        dayNote: 'One 3-hour session, live on Zoom',
      },
      in_person: {
        price: 1, // TEMP $1 LAUNCH TEST — real price 520. REVERT THIS COMMIT.
        duration: '3 hours',
        durationMinutes: 180,
        dayNote: 'One 3-hour session at the studio',
      },
    },
  },
  masterclass: {
    title: 'Advanced Makeup Artist Training',
    description: 'Designed for makeup artists, or anyone wanting to start a career in makeup. We go deep on signature techniques, working on real clients, and the business side of artistry.',
    includes: [
      'My signature bridal and soft glam techniques',
      'Working on different face shapes, skin tones, and skin types',
      'Advanced complexion and blending techniques',
      'Creative eyeshadow placement and color theory',
      'Client consultation and product selection',
      'Professional tips for working on clients',
      'Social media and business guidance',
      'Certificate of completion included',
    ],
    formats: {
      online: {
        price: 1, // TEMP $1 LAUNCH TEST — real price 1240. REVERT THIS COMMIT.
        duration: '6.5-hour day',
        durationMinutes: 390,
        dayNote: '6 hours of training with a 30-minute break',
      },
      in_person: {
        price: 1, // TEMP $1 LAUNCH TEST — real price 1445. REVERT THIS COMMIT.
        duration: '7-hour day',
        durationMinutes: 420,
        dayNote: '6 hours of training with a 1-hour lunch break',
      },
    },
  },
};

// ── The class day ──────────────────────────────────────────────────────────
// Roko teaches between 11 AM and 7 PM, one client per Wednesday. The client
// picks any start time (30-minute steps) that lets their session finish by
// 7 PM; the stored value is the full window string ("12:30 PM – 3:30 PM").
export const CLASS_DAY = { startMin: 11 * 60, endMin: 19 * 60, label: '11 AM – 7 PM' };

function minToLabel(min) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Every valid start window for a class + format, e.g. a 3-hour class yields
// "11:00 AM – 2:00 PM" through "4:00 PM – 7:00 PM". Doubles as server-side
// validation: a submitted preferred_time must be one of these strings.
export function startWindows(key, format, stepMin = 30) {
  const meta = classMeta(key, format);
  if (!meta?.durationMinutes) return [];
  const out = [];
  for (let s = CLASS_DAY.startMin; s + meta.durationMinutes <= CLASS_DAY.endMin; s += stepMin) {
    out.push(`${minToLabel(s)} – ${minToLabel(s + meta.durationMinutes)}`);
  }
  return out;
}

export const CLASS_KEYS = Object.keys(CLASS_CATALOG);

// Resolve the flattened meta for one class in one format:
// { title, description, includes, price, duration, durationMinutes, dayNote }.
// Unknown format falls back to in-person (legacy rows without class_format).
export function classMeta(key, format) {
  const cls = CLASS_CATALOG[key];
  if (!cls) return null;
  const f = cls.formats[format] || cls.formats[DEFAULT_FORMAT];
  return { key, format: cls.formats[format] ? format : DEFAULT_FORMAT, title: cls.title, description: cls.description, includes: cls.includes, ...f };
}

// Short "Online · Zoom" / "In Person · Mountain House" label; '' when unknown.
export function formatShort(format) {
  return CLASS_FORMATS[format]?.short || '';
}

// The classes booked on a registration row, resolved against the row's own
// class_format so admin surfaces show the right price per format. Legacy keys
// that no longer exist in the live catalog still get a sensible label/price.
export function classesOfReg(reg) {
  const found = [];
  for (const key of Object.keys(CLASS_DISPLAY)) {
    if (!reg?.[key]) continue;
    const live = CLASS_CATALOG[key] ? classMeta(key, reg.class_format) : null;
    found.push(live || { key, format: null, ...CLASS_DISPLAY[key] });
  }
  return found;
}

// What a registration is worth: what Stripe actually charged when we have it,
// otherwise the current per-format catalog price (manual rows, legacy rows).
export function regTotal(reg) {
  if (reg?.amount_paid != null) return reg.amount_paid;
  return classesOfReg(reg).reduce((s, c) => s + (c.price || 0), 0);
}

// Display map for admin surfaces: live catalog titles (priced at the in-person
// default) plus the legacy class keys that may still exist on older
// registration rows, so those rows keep rendering a sensible label and price.
export const CLASS_DISPLAY = {
  private_basic_lesson: { title: CLASS_CATALOG.private_basic_lesson.title, duration: '3 hours', price: CLASS_CATALOG.private_basic_lesson.formats.in_person.price },
  masterclass:          { title: CLASS_CATALOG.masterclass.title,          duration: '7-hour day', price: CLASS_CATALOG.masterclass.formats.in_person.price },
  virtual_lesson:      { title: 'Virtual Makeup Lesson',      duration: '', price: 400 },
  intermediate_lesson: { title: 'Intermediate Makeup Lesson', duration: '', price: 500 },
  glam_class:          { title: 'Glam Makeup Class',          duration: '', price: 600 },
};

export const CLASS_DISPLAY_KEYS = Object.keys(CLASS_DISPLAY);
