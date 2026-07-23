-- Fix payment_type check constraint
-- Run this if you're getting constraint violation errors

-- First, drop the existing constraint if it exists
ALTER TABLE public.debt_payments
DROP CONSTRAINT IF EXISTS debt_payments_payment_type_check;

-- Add a new constraint with all allowed payment types
ALTER TABLE public.debt_payments
ADD CONSTRAINT debt_payments_payment_type_check
CHECK (payment_type IN (
  'Credit Card',
  'Debit Card',
  'Cash',
  'Money Order',
  'Cashier Check'
));

-- Verify the constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.debt_payments'::regclass
  AND conname = 'debt_payments_payment_type_check';
