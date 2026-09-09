# Makeup by Roko

Professional makeup artistry website for Roqia Moshref.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Email:** Resend
- **Storage:** Supabase Storage
- **Deploy:** Vercel


## Checks

```
npm run db:check     # every form's insert path still matches the live schema
npm run test:scroll  # every booking sheet still scrolls to the end of itself
```

`test:scroll` drives a real browser through the non-bridal booking sheet at
desktop and phone widths, unfolding the sections that appear when you pick
"Other" or ask Roko to travel, and asserts that Lenis can still reach the
bottom of the form after each one.

It exists because the sheets scroll through Lenis, which caches the scrollable
height. When that cache goes stale the sheet quietly stops scrolling partway
down: nothing throws, nothing logs, the build is green, and a client simply
cannot reach the rest of the form. That shipped once. Run this after touching
`src/lib/modalLenis.js`, any booking sheet, or anything that shows and hides
content inside one.

It starts its own dev server on port 3210 and builds into `.next-e2e`, so it
will not disturb a `npm run dev` you already have open. Point it at a server
you are already running with `E2E_URL=http://localhost:3000`, or watch it work
with `HEADED=1`.

First run needs the browser binary once: `npx playwright install chromium`.
