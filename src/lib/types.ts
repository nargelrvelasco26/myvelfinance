export interface Debt {
  id: string;
  origin: string;
  collector: string | null;
  current_creditor: string | null;
  original_creditor: string | null;
  merchant: string | null;
  account_number: string | null;
  reference_number: string | null;
  account_manager: string | null;
  balance_due: number | null;
  current_due: number | null;
  monthly_payment: number | null;
  payment_due_day: string | null;
  pay_from_bank: string | null;
  owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DebtInput = Omit<Debt, 'id' | 'created_at' | 'updated_at'>;

export interface DebtPayment {
  id: string;
  debt_id: string;
  owner: string | null;
  origin: string | null;
  collector: string | null;
  account_number: string | null;
  payment_amount: number;
  payment_date: string;
  payment_type: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DebtPaymentInput = Omit<DebtPayment, 'id' | 'created_at' | 'updated_at'>;
