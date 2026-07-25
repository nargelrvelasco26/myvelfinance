import { supabase } from './supabase';
import type { GamingTransaction, GamingTransactionInput } from './types';

const TABLE = 'gaming_transactions';

export async function listGamingTransactions(): Promise<GamingTransaction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('transaction_dt', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listGamingTransactionsByMonth(year: number, month: number): Promise<GamingTransaction[]> {
  // Start date: YYYY-MM-01
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // End date: Last day of the month
  const lastDay = new Date(year, month, 0).getDate();
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

export async function createGamingTransaction(input: GamingTransactionInput): Promise<GamingTransaction> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGamingTransaction(
  id: string,
  input: Partial<GamingTransactionInput>,
): Promise<GamingTransaction> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGamingTransaction(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
