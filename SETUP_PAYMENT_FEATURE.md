# Payment Feature Setup Instructions

## Database Setup

Run these SQL commands in your Supabase SQL Editor in this order:

### 1. Add current_due column to debt_monitoring

```sql
ALTER TABLE public.debt_monitoring
ADD COLUMN current_due numeric(12,2);

COMMENT ON COLUMN public.debt_monitoring.current_due IS 'Current amount due (if different from balance_due); if null, balance_due is used';
```

### 2. Create debt_payments table

```sql
-- debt_payments table for tracking all payments
create table public.debt_payments (
  id                 uuid primary key default gen_random_uuid(),
  debt_id            uuid not null references public.debt_monitoring(id) on delete cascade,
  owner              text,
  origin             text,
  collector          text,
  account_number     text,
  payment_amount     numeric(12,2) not null,
  payment_date       date not null,
  payment_type       text not null,
  reference_number   text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Trigger for updated_at
create trigger trg_debt_payments_updated_at
  before update on public.debt_payments
  for each row execute function public.set_updated_at();

-- Row-level security
alter table public.debt_payments enable row level security;

-- Policies
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

-- Indexes
create index idx_debt_payments_debt_id on public.debt_payments(debt_id);
create index idx_debt_payments_payment_date on public.debt_payments(payment_date desc);
```

## How the Payment Feature Works

### Payment Flow

1. **User clicks the green $ (Pay) icon** on any debt row
2. **Payment modal opens** showing:
   - Current balance (uses `current_due ?? balance_due`)
   - Payment amount field
   - Payment date (defaults to today)
   - Payment type dropdown (Credit Card, Debit Card, Cash, Money Order, Cashier Check)
   - Reference number (optional)
   - Notes (optional)

3. **When payment is submitted**:
   - Payment record is saved to `debt_payments` table
   - `current_due` on the debt is updated: `(current_due ?? balance_due) - payment_amount`
   - New balance cannot go below $0
   - Success toast message is shown
   - Modal closes automatically
   - Debt list refreshes to show updated balance

### Key Fields

- **current_due**: The current amount owed (displayed prominently in the table)
- **balance_due**: The original balance (shown for reference)
- **Current Due calculation**: Always uses `current_due ?? balance_due` for display and calculations

### Data Storage

All payments are stored in `debt_payments` table with:
- Link to the debt (`debt_id`)
- Owner (copied from the debt record for easier reporting/filtering)
- Origin (debt origin - copied for reporting without joins)
- Collector (collector name - copied for reporting)
- Account Number (copied for reporting)
- Payment amount
- Payment date
- Payment type
- Reference number (optional - for check numbers, confirmation codes)
- Notes (optional - additional details)
- Timestamps (created_at, updated_at)

**Note:** The owner, origin, collector, and account_number are denormalized (copied from the debt record) to make payment reporting faster and simpler without requiring joins to the debt_monitoring table.

### UI Features

- **Green color theme** for all payment-related UI elements
- **Form validation** - requires valid amount > 0
- **Saving state** - Shows "Processing..." during save
- **Auto-refresh** - Debt list updates after successful payment
- **Current balance display** - Shows the balance being paid against
