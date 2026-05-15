# Makeup by Roko

Professional makeup artistry website for Roqia Moshref.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Email:** Resend
- **Storage:** Supabase Storage
- **Deploy:** Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
GOOGLE_MAPS_SERVER_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

## Database

Run `supabase/schema.sql` in your Supabase SQL editor to set up all tables.

## Admin

Visit `/login` to access the admin dashboard.
