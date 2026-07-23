-- =============================================================
-- debt_payments
-- Tracks all payments made toward debts in debt_monitoring
-- =============================================================

create table public.debt_payments (
  id                 uuid primary key default gen_random_uuid(),
  debt_id            uuid not null references public.debt_monitoring(id) on delete cascade,
  owner              text,                          -- account owner initials (NV / JV)
  origin             text,                          -- debt origin (copied from debt for reporting)
  collector          text,                          -- collector name (copied from debt for reporting)
  account_number     text,                          -- account number (copied from debt for reporting)
  payment_amount     numeric(12,2) not null,        -- payment amount
  payment_date       date not null,                 -- when payment was made
  payment_type       text not null,                 -- Credit Card, Debit Card, Cash, Money Order, Cashier Check
  reference_number   text,                          -- confirmation or check number
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- keep updated_at fresh
create trigger trg_debt_payments_updated_at
  before update on public.debt_payments
  for each row execute function public.set_updated_at();

-- Row-level security
alter table public.debt_payments enable row level security;

-- Policies: any authenticated user has full access
create policy "authenticated_select"
  on public.debt_payments for select
  to authenticated
  using (true);

create policy "authenticated_insert"
  on public.debt_payments for insert
  to authenticated
  with check (true);

create policy "authenticated_update"
  on public.debt_payments for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_delete"
  on public.debt_payments for delete
  to authenticated
  using (true);

-- Index for faster lookups by debt_id
create index idx_debt_payments_debt_id on public.debt_payments(debt_id);
create index idx_debt_payments_payment_date on public.debt_payments(payment_date desc);
