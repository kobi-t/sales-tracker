-- v4 migration: client payments track what was charged; cash lives in its own log.
--
-- Run this in the Supabase SQL editor BEFORE deploying the v4 frontend.
--
-- Model change:
--   client_payments.amount  = what the client was charged / invoiced
--   cash_payouts.amount     = what Stripe actually deposited in the bank
--
-- The two are now completely separate. A client payment no longer carries a
-- cash figure of its own.

-- 1. New standalone log of Stripe payouts.
create table if not exists cash_payouts (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  amount     numeric not null default 0,
  notes      text default '',
  created_at timestamptz default now()
);

alter table cash_payouts enable row level security;
drop policy if exists "Allow all access to cash_payouts" on cash_payouts;
create policy "Allow all access to cash_payouts"
  on cash_payouts for all using (true) with check (true);

-- 2. `amount` becomes the charged figure. Until now it held cash collected and
--    the v3 `revenue` column held the charged figure, so copy revenue across
--    before the column goes.
--
--    Nothing is lost: the original per-call cash figures remain untouched in
--    `calls.cash_collected`, and the charged figures in `calls.revenue`.
update client_payments
   set amount = revenue
 where revenue is not null
   and revenue <> amount;

-- 3. Drop the now-redundant column. Safe to run against the currently deployed
--    frontend, which falls back to `amount` when `revenue` is absent.
alter table client_payments drop column if exists revenue;
