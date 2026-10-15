-- Schema for the `applications` table, reconstructed from src/database.py.
-- Run in the Supabase SQL editor.

create table if not exists public.applications (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  user_id            uuid references auth.users (id) on delete cascade,
  user_email         text,
  applicant_name     text,
  gender             int,
  married            int,
  dependents         int,
  education          int,
  self_employed      int,
  applicant_income   numeric,
  coapplicant_income numeric,
  loan_amount        numeric,
  loan_amount_term   numeric,
  credit_history     numeric,
  property_area      int,
  decision           text,
  probability        numeric,
  status             text,
  bias_score         numeric,
  bias_decision      text,
  gender_disparity   numeric,
  married_disparity  numeric,
  fnr_disparity      numeric,
  email_status       text,
  email_attempts     int,
  email_body         text,
  eligible_products  jsonb not null default '[]'::jsonb,
  product_count      int   not null default 0
);

-- Row Level Security: users can only create and read their own applications.
alter table public.applications enable row level security;

create policy "Users insert own applications"
  on public.applications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own applications"
  on public.applications for select
  to authenticated
  using (auth.uid() = user_id);
