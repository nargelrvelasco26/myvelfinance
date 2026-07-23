-- Add current_due column to debt_monitoring table
ALTER TABLE public.debt_monitoring
ADD COLUMN current_due numeric(12,2);

COMMENT ON COLUMN public.debt_monitoring.current_due IS 'Current amount due (if different from balance_due); if null, balance_due is used';
