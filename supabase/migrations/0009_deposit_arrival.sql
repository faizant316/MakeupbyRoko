-- 0009: make a late deposit announce itself
--
-- Until now the Zelle upload wrote `zelle_screenshot` and flipped
-- `deposit_received` in the same statement, so "the client sent proof" and
-- "Roko agreed it's good" were the same event. Nothing recorded *when* money
-- showed up, which meant a deposit sent two days after booking changed a
-- hidden boolean and told no one. The only way to find it was opening every
-- client card in turn.
--
-- Splitting the two gives the admin something to notice:
--   zelle_uploaded_at   = the client uploaded their screenshot
--   deposit_received    = Roko looked at it and confirmed (unchanged)
--   deposit_confirmed_at = when she did
--
-- "Needs her eyes" is then just uploaded-but-not-confirmed, which empties
-- itself as she works. No seen/unseen flags to keep in sync.

alter table bookings add column if not exists zelle_uploaded_at timestamptz;
alter table bookings add column if not exists deposit_confirmed_at timestamptz;

alter table bridal_inquiries add column if not exists zelle_uploaded_at timestamptz;
alter table bridal_inquiries add column if not exists zelle_confirmed_at timestamptz;

-- Rows already marked received stay marked, so nothing floods the review
-- queue on deploy. Their timestamps stay null on purpose: we don't know when
-- those deposits actually landed, and inventing a date would be worse than
-- showing none. The UI renders "Deposit confirmed" without a date in that case.

create index if not exists bookings_zelle_uploaded_at_idx
  on bookings(zelle_uploaded_at desc)
  where zelle_uploaded_at is not null;
