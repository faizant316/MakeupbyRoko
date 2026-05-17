-- ============================================================
-- Makeup by Roko — Services Seed Data
-- Run this in your Supabase SQL Editor AFTER running schema.sql
-- ============================================================

insert into services (title, category, price, price_value, duration, deposit, description, includes, key_features, what_to_expect, photo, sort_order, is_active)
values

-- ── BRIDAL ────────────────────────────────────────────────────────────────────

(
  'Luxury Bridal Look',
  'bridal',
  '$750',
  750,
  '2 hours',
  '$375 deposit',
  'Your wedding day deserves nothing less than perfection. A $200+ travel fee will be automatically added for any service not held at the studio.',
  ARRAY[
    'Full bridal makeup application',
    'Lash application included',
    'Professional touch-up kit'
  ],
  ARRAY[
    'Fully customized to your wedding aesthetic',
    'Zoom consultation (30 min) included',
    '$200+ travel fee for on-location services'
  ],
  'We start with a detailed consultation to understand your vision, inspiration photos, and dress style. Every product is chosen to complement your skin tone and last all day.',
  '/images/luxury-bridal.jpg',
  1,
  true
),

(
  'Full Day Service',
  'bridal',
  '$1,700',
  1700,
  'Full day',
  '$850 deposit',
  'Full-day booking is required for brides who need a bridal switch (second look), are located over 1 hour from the studio, or need an early start time before 7 AM.',
  ARRAY[
    'Full bridal makeup + second look',
    'All-day availability',
    'Travel included'
  ],
  ARRAY[
    'Required for bridal switch / second look',
    'Required for location over 1 hr from studio',
    'Required for start time before 7 AM'
  ],
  'Full-day coverage means you never worry about smudging before the first look. Timing is coordinated with your hair stylist and photographer so the morning runs smoothly.',
  '/images/fullday-bridal.jpg',
  2,
  true
),

(
  'Bridal Trial',
  'bridal',
  '$500',
  500,
  '2–3 hrs',
  '$250 deposit',
  'Your trial is where the vision comes to life. We''ll dial in your exact bridal look before the big day so there are no surprises on your wedding day.',
  ARRAY[
    'Full trial makeup application',
    'Lash application included',
    'Personalized look consultation'
  ],
  ARRAY[
    'Recommended 1–3 months before your wedding',
    'Test your exact wedding day look',
    'No surprises on the big day'
  ],
  'Come in with your inspiration photos and we will build and perfect your look together. The trial is the best way to feel completely confident walking in on your wedding morning.',
  '',
  3,
  true
),

-- ── EVENT / NON-BRIDAL ───────────────────────────────────────────────────────

(
  'Non-Bridal Makeup',
  'event',
  '$400',
  400,
  '1.5 hours',
  '$200 deposit',
  'All non-bridal appointments are held exclusively at the studio in Mountain House, unless included as part of a bridal travel service package. Non-bridal bookings can only be made up to one month before your event, as bridal clients are prioritized.',
  ARRAY[
    'Skin prep & primer',
    'Custom foundation match',
    'Eye look of your choice',
    'Lashes included',
    'Setting spray finish'
  ],
  ARRAY[
    'Studio only — Mountain House, CA',
    'Must be booked within 1 month of event',
    'Earlier bookings subject to bridal pricing'
  ],
  'Show up with clean, moisturized skin. We will walk through your event details and desired vibe, then build the look from there.',
  '',
  4,
  true
),

-- ── CREATIVE / PHOTOSHOOT ────────────────────────────────────────────────────

(
  'Photoshoot Makeup',
  'creative',
  '$600',
  600,
  '1 hr 45 min',
  '$300 deposit',
  'Engagement shoots, maternity shoots, birthday shoots, quinceañeras, and more. Roko specializes in camera-ready looks that photograph beautifully under professional lighting. All photoshoot appointments are held exclusively at the studio in Mountain House, CA.',
  ARRAY[
    'Skin prep optimized for camera',
    'High-definition foundation technique',
    'Contouring & highlight for depth on camera',
    'Custom eye & lip look per brief',
    'On-set touch-ups available (hourly rate)'
  ],
  ARRAY[
    'Studio only — Mountain House, CA',
    'Works beautifully for digital and print',
    'Consultation with photographer welcome'
  ],
  'Bring your mood board, shoot details, and any wardrobe pieces. Every product choice is tailored to the lighting conditions and camera setup.',
  '',
  5,
  true
),

-- ── LESSONS ──────────────────────────────────────────────────────────────────

(
  'Makeup Courses',
  'lessons',
  'See Classes',
  0,
  'Varies',
  '50% deposit via Zelle',
  'Classes are held Monday through Thursday between 10:00 AM and 8:00 PM. Select a class and submit a 50% deposit via Zelle to secure your spot.',
  ARRAY[
    'Private Basic Makeup Lesson — $300',
    'Virtual Makeup Lesson — $400',
    'Intermediate Makeup Lesson — $500',
    'Glam Makeup Class — $600',
    'Makeup Masterclass — $1,500'
  ],
  ARRAY[
    'All skill levels welcome',
    'Mon–Thu · 10 AM – 8 PM',
    '50% Zelle deposit to secure spot'
  ],
  'Come ready to learn, ask questions, and practice in real time. Each session ends with a personalized product list and technique notes so you can recreate your looks at home.',
  '',
  6,
  true
);
