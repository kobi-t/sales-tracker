-- v3 migration: split each client payment into deal value vs money received.
--
-- Run this in the Supabase SQL editor BEFORE deploying the v3 frontend.
--
-- Non-destructive by design. The existing `client_payments.amount` column is
-- KEPT and continues to hold cash collected — nothing is renamed and no row is
-- rewritten, so there is no window where the live app reads a missing column.
-- Only a new `revenue` column is added.
--
--   client_payments.revenue  = full deal value agreed  (e.g. $5,000)
--   client_payments.amount   = cash actually received  (e.g. $2,500 so far)
--
-- Outstanding balance is therefore (revenue - amount).

alter table client_payments
  add column if not exists revenue numeric not null default 0;

-- Any pre-existing row starts with revenue equal to the cash already recorded,
-- so no payment reports a negative outstanding balance before it is corrected.
-- The 10 backfilled historical payments are then set to their true deal values
-- from the original call log (done over the REST API, not here).
update client_payments set revenue = amount where revenue = 0;
