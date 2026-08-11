# Makeup by Roko — Portfolio Case Study Handoff

This file is a complete brief for the portfolio build. Read it in full before touching any portfolio code. All facts here come directly from the live codebase.

---

## The Client

**Rokia (Roqia) Moshref** — goes by "Roko." Sacramento-based makeup artist specializing in bridal, quinceañera, photoshoot, and event glam. Also teaches makeup courses.

- Instagram: @makeupbyroko_
- Email: makeupbyroko22@gmail.com
- Live site: https://makeupbyroko.vercel.app (or current Vercel URL)
- Year built: 2025

---

## What Was Built

A full-stack luxury booking platform built end-to-end. Not a template. Every screen was custom-designed mobile-first. The platform handles the complete client journey: browsing services, viewing a portfolio gallery, booking appointments, tracking Zelle deposits, Zoom consultations, and receiving automated email confirmations.

Two audiences served simultaneously: a luxury client-facing experience on the front end, and a powerful admin workspace on the back end.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript / JSX |
| Database + Auth | Supabase |
| Styling | Tailwind CSS + Radix UI |
| Email | Resend |
| Payments | Stripe (makeup class checkout) |
| Video | Zoom API (consultation meetings) |
| Animations | Framer Motion |
| Charts | Recharts |
| Data fetching | TanStack Query (React Query) |
| Deployment | Vercel |

---

## Brand

**Colors:**
- Primary accent: `#D4A0B0` (dusty rose / mauve pink)
- Secondary pink: `#C4849A`
- Dark hero background: `#0C0A09`
- Text: `#111111`
- Light warm surface: `#FDF8F6`

**Typography:**
- Serif font for headings (elegant, editorial)
- Sans-serif for body copy (clean, modern)
- Style language: luxury bridal, editorial, high-fashion

---

## Client-Facing Features (Front End)

### Home Page
Luxury landing page with sections:
- Full-screen hero
- About Roko (her story, approach)
- Services grid with category filters
- Before and After gallery
- Testimonials / Reviews
- FAQ section

Navigation: transparent on hero, blurs white on scroll. Mobile: full-screen overlay with animated hamburger. Desktop: shows Instagram link.

### Services Page (/services)
The centerpiece page. Sticky parallax hero fades and scales as the service cards slide up over it.

**Service categories (filterable by tab):**
1. All Services
2. Bridal
3. Non-Bridal Makeup
4. Photoshoot Makeup
5. Makeup Courses

**Bridal services (3 tiers):**
- Luxury Bridal Look (featured card)
- Full Day Service (featured card)
- Bridal Trial (featured card)

Bridal cards sit in a premium 3-column grid on desktop, native scroll-snap carousel on mobile. A Bridal Comparison component below the cards lets clients compare all three tiers side-by-side.

**Non-bridal services:** Stacked cards on desktop, horizontal scroll-snap on mobile.

**Courses:** Separate section with its own cards.

Each card has a "View Details" tap that opens a full-screen ServiceDetailModal, and a "Book" button that opens the BookingModal.

### Booking Flow
BookingModal contains:
- Month calendar (real-time availability from Supabase)
- Time slots (marks taken times as struck through)
- Service selection
- Contact form (name, email, phone, notes)
- Pre-selects service via `?book=` query param
- On submit: creates Booking record in Supabase with status "pending"
- Triggers automated email to admin

### Zelle Deposit Upload Page (/upload-zelle)
Accessed via token-authenticated email link (not public). Shows:
- Zelle instructions: Send to Ruqia Moshref at 510-491-6497
- Client uploads screenshot of Zelle transfer
- Booking summary shows service, date, deposit amount, service price
- 3-column desktop layout / stacked mobile layout
- On success: shows confirmation with "what's next" card and remaining balance reminder (cash on day of appointment)

### Makeup Class Registration
Clients can register for makeup courses via MakeupClassModal. Payment collected via Stripe checkout. Admin receives notifications for new registrations.

### Reviews
Clients can leave reviews via LeaveReviewForm. Reviews are held for admin approval before appearing publicly.

---

## Admin Dashboard (/admin)

Full workspace for Roko. Sticky header, dark mode toggle, sidebar navigation. Mobile: full-screen slide-in nav overlay.

**Sidebar Tabs:**

| Tab | What It Does |
|---|---|
| Appointments | Calendar, stats, booking list, booking detail |
| Services | Edit service catalog (photos, prices, descriptions, gallery) |
| Reviews | Approve or delete client reviews |
| Class Sign-Ups | Manage makeup class registrations |
| Analytics | Charts and trends |
| Revenue | Revenue stats |

**Appointments tab features:**
- Stats cards: Today / Pending / Confirmed / Completed (clickable to filter list)
- Calendar with color-coded booking density
- Per-day capacity override (admin can set different max bookings on specific dates)
- Booking list with search (by name, email, phone, service) and status filter
- Booking detail: view full booking, update status, schedule Zoom consultation, send emails, edit fields, delete
- "Add Client" button to manually create a booking
- Class Sign-Ups quick-access button shows pending/confirmed/enrolled counts

**Services tab features:**
- Full CRUD for services
- Drag-and-drop reordering
- Photo upload + gallery photos
- Key features, includes, what-to-expect fields
- Service preview before saving

**Email automations triggered from admin (via Resend):**
- New booking notification (to Roko)
- Booking confirmation (to client, includes Zelle deposit link)
- Deposit reminder
- Post-appointment feedback request
- Booking cancelled
- Consultation/Zoom link email
- Class status update email
- Class lesson info email

**Zoom consultation flow:**
- Admin schedules a Zoom meeting from the booking detail view
- Platform creates a Zoom meeting via API, stores separate host link and client link
- Client receives email with their join link
- Waiting room enabled by default

---

## Database Entities (Supabase)

| Entity | Purpose |
|---|---|
| Booking | Client appointment records |
| Service | Service catalog (bridal, event, creative, lessons) |
| Review | Client reviews with approval status |
| ClassRegistration | Makeup course sign-ups |
| AppSettings | Global config (max bookings per day) |
| DayCapacity | Per-date booking capacity overrides |
| BlockedDates | Dates admin blocks off completely |

---

## Portfolio Case Study — Suggested Structure

Use this structure to build or improve the case study page on the portfolio. All copy below is ready to use.

### Section 1: Hero / Title Card
```
Label: BRIDAL PLATFORM · 2025
Headline: Makeup by Roko
```

### Section 2: Project Meta
```
CLIENT:    Rokia (Roko) Moshref
YEAR:      2025
ROLE:      Full-Stack Development, UI/UX Design, Deployment
TYPE:      Luxury Bridal Booking Platform
TECH:      Next.js, TypeScript, Supabase, Tailwind CSS, Resend, Vercel
```

### Section 3: Project Description (large body text)
```
A luxury bridal booking platform built end-to-end for Rokia, a
Sacramento-based makeup artist specializing in bridal, quinceañera,
and event glam. The platform handles the full client journey: browsing
services and viewing a portfolio gallery, booking appointments,
tracking Zelle deposits, and receiving automated confirmations.
Built mobile-first so clients can book from anywhere.
```

NOTE: The current portfolio draft uses em dashes in this paragraph ("journey — from browsing"). Remove all em dashes. Replace with commas or restructure the sentence.

### Section 4: Platform Overview
**Headline:** Built for both sides of the booking

**Body:**
```
The platform serves two audiences simultaneously: a luxury client
experience on the front end, and a powerful admin workspace on the
back end. Everything is synced in real time.
```

**Feature bullets:**
- Admin dashboard with real-time appointment calendar
- Client booking flow with service selection
- Automated email confirmations via Resend

### Section 5: Mobile Experience
**Headline:** Clients book from anywhere. In seconds.

**Body:**
```
Every screen was designed phone-first. Browse services, view the
look-book, pick a date, and confirm a booking, all without touching
a desktop.
```

**Feature bullets:**
- Admin dashboard with real-time appointment calendar
- Client booking flow with service selection and date picking
- Zelle payment status tracking per appointment
- Automated email confirmations via Resend
- Mobile-first responsive design

### Section 6: Screen Gallery ("Strong first impressions on every page")
**Headline:** Strong first impressions on every page

**Body:**
```
From the homepage to the confirmation screen, each view was designed
to build trust and reduce friction. Clients should not have to think,
just feel confident enough to book.
```

**Bullet list:**
- Luxury-forward homepage that converts visitors to bookings
- Service catalog with transparent pricing and descriptions
- Frictionless booking flow optimized for mobile thumbs
- Real-time admin calendar for appointment oversight

**Screenshots to capture for the gallery grid (capture on makeupbyroko.vercel.app):**
1. Services page hero (dark, full-bleed)
2. Bridal service cards (3-column grid)
3. BookingModal with calendar open
4. Zelle upload page (clean white)
5. Admin dashboard, Appointments tab (dark mode or light mode)
6. Admin booking detail view

### Section 7: Key Technical Details (for developer portfolio credibility)
```
- Supabase for real-time data, auth, and file storage
- Token-authenticated Zelle upload flow (no login required for clients)
- Zoom API integration for consultation meeting creation
- Stripe checkout for makeup course payments
- Resend transactional emails with 8+ automated triggers
- Per-day capacity overrides in admin
- TanStack Query for optimistic UI and real-time cache invalidation
- Scroll-snap carousels built in CSS (no library), 120fps on compositor
- Parallax hero using requestAnimationFrame via passive scroll listener
```

---

## What the Portfolio Mock-up Placeholders Need

The portfolio currently shows dark maroon placeholder boxes where screenshots should go:
- The browser mockup (desktop preview section)
- The phone mockup (mobile section)
- The 5-panel screenshot grid (gallery section)

These need real screenshots. Until screenshots are added, the placeholders will remain solid color. Options:
1. Take screenshots from the live site and swap them in
2. Use the existing dark gradient (#0C0A09 to deep maroon) as intentional art direction and overlay UI labels instead

---

## Notes on Copy Style

- No em dashes anywhere. Use commas, periods, or parentheses instead.
- Tone: editorial luxury, not corporate. Short sentences. Present tense.
- "Roko" is the preferred short form. "Rokia" or "Roqia Moshref" for formal references.
- Branding is uppercase "Makeup by Roko" in the nav and header.
