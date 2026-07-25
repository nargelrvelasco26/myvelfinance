import { supabase } from './supabase';
import type { BudgetTransaction, BudgetTransactionInput } from './types';

const TABLE = 'budget';

export async function listBudgetTransactions(): Promise<BudgetTransaction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('transaction_dt', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBudgetTransaction(input: BudgetTransactionInput): Promise<BudgetTransaction> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBudgetTransaction(
  id: string,
  input: Partial<BudgetTransactionInput>,
): Promise<BudgetTransaction> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBudgetTransaction(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function listBudgetTransactionsByMonth(year: number, month: number): Promise<BudgetTransaction[]> {
  // Start date: YYYY-MM-01
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // End date: Last day of the month (e.g., 2026-07-31)
  const lastDay = new Date(year, month, 0).getDate(); // Gets last day of month
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .gte('transaction_dt', startDate)
    .lte('transaction_dt', endDate)
    .order('transaction_dt', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
