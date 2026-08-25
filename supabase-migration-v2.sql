-- v2 migration: clients, client payments, and settings-driven metric rules.
-- Applied to the production project on 2026-08-25. Recorded here so the repo
-- reflects the live schema (supabase-schema.sql describes the original v1).
--
-- Every statement is additive: no column is dropped and no existing row is
-- deleted. The v1 columns `calls.revenue` and `calls.cash_collected` are left
-- in place and still hold the pre-v2 revenue history, but the app no longer
-- reads them — revenue now comes from `client_payments`.

-- New columns on calls (existing data untouched)
alter table calls
  add column if not exists notes       text    default '',
  add column if not exists deal_value  numeric default 0,
  add column if not exists converted   boolean default false,
  add column if not exists client_id   uuid;

create table if not exists clients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  date_acquired  date not null default current_date,
  status         text not null default 'Active',
  notes          text default '',
  source_call_id uuid,
  created_at     timestamptz default now()
);

-- All revenue lives here from v2 onwards.
create table if not exists client_payments (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete cascade not null,
  amount     numeric not null default 0,
  date       date not null default current_date,
  category   text not null default 'Retainer',
  notes      text default '',
  created_at timestamptz default now()
);

do $$ begin
  alter table calls add constraint calls_client_id_fkey
    foreign key (client_id) references clients(id) on delete set null;
exception when duplicate_object then null;
end $$;

alter table clients enable row level security;
alter table client_payments enable row level security;

drop policy if exists "Allow all access to clients" on clients;
drop policy if exists "Allow all access to client_payments" on client_payments;

create policy "Allow all access to clients"
  on clients for all using (true) with check (true);
create policy "Allow all access to client_payments"
  on client_payments for all using (true) with check (true);

-- Settings columns that drive every metric in the app.
alter table settings
  add column if not exists client_statuses      text[]  not null default array['Active','Inactive','Paused'],
  add column if not exists revenue_categories   text[]  not null default array['New Client','Retainer','Other'],
  add column if not exists no_show_outcomes     text[]  not null default array['No Show'],
  add column if not exists cancelled_outcomes   text[]  not null default array['Cancelled'],
  add column if not exists rescheduled_outcomes text[]  not null default array['Rescheduled'],
  add column if not exists closed_outcomes      text[]  not null default array['Closed'],
  add column if not exists lead_sources         text[]  not null default array['Ads','Organic','Referral','Other'],
  add column if not exists outcome_colors       jsonb   not null default '{
    "No Show": "#d4493c",
    "Cancelled": "#d4493c",
    "Follow Up": "#f5a524",
    "Offer Made": "#5b5bf6",
    "Closed": "#1a9c6b",
    "Not Qualified": "#6b6b76",
    "Not Interested": "#6b6b76",
    "Rescheduled": "#f5a524"
  }'::jsonb,
  add column if not exists status_colors        jsonb   not null default '{
    "Active": "#1a9c6b",
    "Inactive": "#6b6b76",
    "Paused": "#f5a524"
  }'::jsonb;

-- IMPORTANT: the outcome category arrays above intentionally also list the
-- legacy v1 outcome names still present on historical calls ('Full-Pay',
-- 'No-Show' with a hyphen, etc). Without them the 39 pre-v2 calls would fall
-- outside every category and report a 0% close rate. The live values are:
--
--   closed_outcomes      = {Closed, Full-Pay, Split-Pay, Deposit}
--   no_show_outcomes     = {No-Show, No Show}
--   cancelled_outcomes   = {Cancelled}
--   rescheduled_outcomes = {Rescheduled}
--
-- These are editable in the app under Settings > Outcome Category Mapping.
