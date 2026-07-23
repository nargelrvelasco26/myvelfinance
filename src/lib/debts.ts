import { supabase } from './supabase';
import type { Debt, DebtInput, DebtPayment, DebtPaymentInput } from './types';

const TABLE = 'debt_monitoring';
const PAYMENTS_TABLE = 'debt_payments';

export async function listDebts(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('owner', { ascending: true })
    .order('origin', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createDebt(input: DebtInput): Promise<Debt> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDebt(
  id: string,
  input: Partial<DebtInput>,
): Promise<Debt> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDebt(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function createPayment(input: DebtPaymentInput): Promise<DebtPayment> {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPayments(debtId: string): Promise<DebtPayment[]> {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select('*')
    .eq('debt_id', debtId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
