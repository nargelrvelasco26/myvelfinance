-- =============================================================
-- debt_monitoring
-- Derived from DEBT_MONITORING.docx
-- The source doc packed creditor/account details into one free-text
-- "INFORMATION" cell; those are broken out into columns below.
-- "DUE" in the doc = payment due day (schedule text), NOT a dollar amount.
-- =============================================================

create table public.debt_monitoring (
  id                 uuid primary key default gen_random_uuid(),
  origin             text not null,        -- retailer/brand the debt originated from (HOME DEPOT, BESTBUY, ...)
  collector          text,                 -- collection agency handling it (Midland, Resurgent, Rausch Sturm LLP, ...)
  current_creditor   text,                 -- company that currently owns the account
  original_creditor  text,                 -- original lender
  merchant           text,                 -- product/card line (MY BEST BUY, THANKYOU PREFERRED, ...)
  account_number     text,                 -- original account / card number (may be masked); text to keep leading zeros
  reference_number   text,                 -- collector file / reference / Resurgent ID
  account_manager    text,                 -- named contact at the collector
  balance_due        numeric(12,2),        -- total amount owed
  monthly_payment    numeric(12,2),        -- agreed monthly payment (null = TBD)
  payment_due_day    text,                 -- when payment is due (e.g. 'Every 2nd'); null = TBD
  pay_from_bank      text,                 -- bank the payment is drawn from (CHASE, CHIME); null = TBD
  owner              text,                 -- account owner initials (NV / JV)
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_debt_monitoring_updated_at
  before update on public.debt_monitoring
  for each row execute function public.set_updated_at();

-- Row-level security (recommended for personal financial data).
alter table public.debt_monitoring enable row level security;

-- Policies: any authenticated (logged-in) user has full access.
-- Anonymous / public API keys get nothing.
create policy "authenticated_select"
  on public.debt_monitoring for select
  to authenticated
  using (true);

create policy "authenticated_insert"
  on public.debt_monitoring for insert
  to authenticated
  with check (true);

create policy "authenticated_update"
  on public.debt_monitoring for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_delete"
  on public.debt_monitoring for delete
  to authenticated
  using (true);
