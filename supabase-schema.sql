-- Run this once in your Supabase project's SQL editor (Database > SQL Editor > New query).
-- Creates empty tables for calls, expenses, and a single settings row. No mock data.

create extension if not exists "pgcrypto";

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null default '',
  source text not null default 'Ads',
  booked boolean not null default true,
  outcome text not null default 'No Deposit & Follow-Up',
  revenue numeric not null default 0,
  cash_collected numeric not null default 0,
  offer_made boolean not null default false,
  objection text default '',
  call_summary text default '',
  recording_link text default '',
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null default 'Other',
  description text default '',
  amount numeric not null default 0,
  receipt_link text default '',
  created_at timestamptz default now()
);

create table if not exists settings (
  id text primary key,
  call_outcomes text[] not null default array[
    'Full-Pay','Split-Pay','Deposit','No Deposit & Follow-Up',
    'Offer & Didn''t Buy','Bad Fit & No Offer','Cancelled','No-Show','Rescheduled'
  ],
  call_sources text[] not null default array['Ads','Organic'],
  expense_categories text[] not null default array['Ad Spend','Software/Tools','Contractors','Travel','Other']
);

-- Row Level Security: enabled with a permissive policy so the app's anon key can
-- read/write. This is fine for a single-user / internal tool launched quickly.
-- Before sharing the app with other people, replace these policies with ones
-- scoped to an authenticated user (see SETUP.md "Adding real multi-user auth").

alter table calls enable row level security;
alter table expenses enable row level security;
alter table settings enable row level security;

create policy "Allow all access to calls" on calls for all using (true) with check (true);
create policy "Allow all access to expenses" on expenses for all using (true) with check (true);
create policy "Allow all access to settings" on settings for all using (true) with check (true);
