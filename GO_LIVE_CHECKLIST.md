# Go-Live Checklist — Makeup by Roko
Everything needed before handing the site over to Roqia under her full ownership.

---

## 1. EMAILS (Resend)
- [ ] Remove `RESEND_TEST_EMAIL` from Vercel env vars (this is what's intercepting all emails to your inbox right now — removing it lets emails go to real recipients)
- [ ] Set `ADMIN_NOTIFICATION_EMAIL` to `makeupbyroko22@gmail.com` in Vercel
- [ ] She needs a Resend account at resend.com
- [ ] Verify her domain on Resend (makeupbyroko.com when she gets it, or set up a sending email like hello@makeupbyroko.com)
- [ ] Update `RESEND_API_KEY` in Vercel to her Resend API key
- [ ] Update `RESEND_FROM_EMAIL` in Vercel to her verified sending email (currently `onboarding@resend.dev` which is a placeholder — emails may land in spam)

---

## 2. STRIPE (Payments)
- [ ] She creates a Stripe account at stripe.com
- [ ] Add her bank account in Stripe → Settings → Bank accounts (so payouts go to her)
- [ ] Invite her as Administrator: Stripe → Settings → Team and security
- [ ] Swap test keys for live keys in Vercel:
  - `STRIPE_SECRET_KEY` → her `sk_live_...`
  - `STRIPE_PUBLISHABLE_KEY` → her `pk_live_...`
- [ ] Create a new webhook in her Stripe dashboard pointing to `https://makeupby-roko.vercel.app/api/stripe-webhook`
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Vercel with the new webhook secret

---

## 3. SUPABASE (Database + Auth)
- [ ] She creates an account at supabase.com
- [ ] Invite her as Owner: Supabase → Organization Settings → Members
- [ ] Transfer project ownership to her once she accepts
- [ ] No key changes needed — Supabase keys stay the same after ownership transfer

---

## 4. VERCEL (Hosting + Deployment)
- [ ] She creates an account at vercel.com
- [ ] Transfer the project: Vercel → Project Settings → Transfer
- [ ] She accepts the transfer
- [ ] All env vars, deployments, and domain settings move with it automatically

---

## 5. DOMAIN (makeupbyroko.com)
- [ ] Purchase `makeupbyroko.com` (check Namecheap, Google Domains, or Squarespace)
- [ ] Add domain in Vercel → Project → Domains
- [ ] Point DNS to Vercel (Vercel gives exact DNS records to add)
- [ ] Update `NEXT_PUBLIC_SITE_URL` in Vercel from `https://makeupby-roko.vercel.app` to `https://makeupbyroko.com`
- [ ] Verify domain on Resend for email sending (add DNS TXT records Resend provides)
- [ ] Redeploy after domain is live

---

## 6. GOOGLE (Analytics + Maps)
- [ ] She needs a Gmail / Google account
- [ ] Google Analytics: Admin → Account User Management → invite her as Administrator, then remove yourself
- [ ] Google Cloud: IAM & Admin → IAM → add her as Owner, then transfer project
- [ ] No key changes needed after transfer — API keys stay the same

---

## 7. ZELLE (Deposit payments)
- [ ] Confirm her Zelle is registered to: **Ruqia Moshref** at **510-491-6497**
- [ ] If name or number is different, update in `src/lib/email.js` (3 places) and `src/views/UploadZelle.jsx`

---

## 8. ADMIN ACCESS
- [ ] Use the Admin Invite page (`/admin-invite`) to invite her email as admin
- [ ] She sets her password via the invite email
- [ ] Test she can log in at `/login`
- [ ] Remove your own admin account once she's confirmed in

---

## 9. FINAL CHECKS BEFORE LAUNCH
- [ ] Send a test booking end-to-end — confirm she receives the admin notification email
- [ ] Send a test bridal inquiry — confirm email lands in her inbox
- [ ] Do a test Stripe payment (use Stripe test mode first, then switch to live)
- [ ] Confirm Zelle upload flow works
- [ ] Check all "View in Admin Dashboard" email links go to the correct URL
- [ ] Review all pages on mobile
- [ ] Remove `RESEND_TEST_EMAIL` last — this is the final switch that makes everything real

---

## QUICK REFERENCE — What She Needs to Do (her 4 tasks)
1. Create accounts: **Stripe**, **Resend**, **Supabase**, **Vercel** (all free to sign up)
2. Send you her Gmail for Google Analytics + Google Cloud transfers
3. Add her bank account in Stripe for payouts
4. Accept the ownership transfer invites when they hit her inbox

Everything else you handle on your end.
