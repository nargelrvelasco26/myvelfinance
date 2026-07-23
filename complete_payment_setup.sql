-- =============================================================
-- COMPLETE PAYMENT FEATURE SETUP
-- Run this entire script in Supabase SQL Editor
-- =============================================================

-- Step 1: Add current_due column to debt_monitoring
-- This tracks the current amount owed (after payments)
ALTER TABLE public.debt_monitoring
ADD COLUMN IF NOT EXISTS current_due numeric(12,2);

COMMENT ON COLUMN public.debt_monitoring.current_due IS 'Current amount due (if different from balance_due); if null, balance_due is used';

-- Step 2: Create debt_payments table
-- Stores all payment transactions
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id                 uuid primary key default gen_random_uuid(),
  debt_id            uuid not null references public.debt_monitoring(id) on delete cascade,
  owner              text,                          -- account owner (NV/JV) - copied for reporting
  origin             text,                          -- debt origin - copied for reporting
  collector          text,                          -- collector name - copied for reporting
  account_number     text,                          -- account number - copied for reporting
  payment_amount     numeric(12,2) not null,        -- payment amount
  payment_date       date not null,                 -- when payment was made
  payment_type       text not null,                 -- Credit Card, Debit Card, Cash, Money Order, Cashier Check
  reference_number   text,                          -- confirmation or check number
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  CONSTRAINT debt_payments_payment_type_check CHECK (payment_type IN (
    'Credit Card',
    'Debit Card',
    'Cash',
    'Money Order',
    'Cashier Check'
  ))
);

-- Step 3: Create trigger for updated_at (only if table was just created)
DROP TRIGGER IF EXISTS trg_debt_payments_updated_at ON public.debt_payments;
CREATE TRIGGER trg_debt_payments_updated_at
  BEFORE UPDATE ON public.debt_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Step 4: Enable Row Level Security
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "authenticated_select" ON public.debt_payments;
DROP POLICY IF EXISTS "authenticated_insert" ON public.debt_payments;
DROP POLICY IF EXISTS "authenticated_update" ON public.debt_payments;
DROP POLICY IF EXISTS "authenticated_delete" ON public.debt_payments;

-- Step 6: Create RLS policies
CREATE POLICY "authenticated_select"
  ON public.debt_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert"
  ON public.debt_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update"
  ON public.debt_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_delete"
  ON public.debt_payments FOR DELETE
  TO authenticated
  USING (true);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_date ON public.debt_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_debt_payments_owner ON public.debt_payments(owner);

-- Done! Payment feature is now set up.
