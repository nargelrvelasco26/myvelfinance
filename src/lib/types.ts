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

export interface BudgetTransaction {
  id: string;
  transaction: string | null;
  category: string | null;
  description: string | null;
  amount: number | null;
  transaction_dt: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export type BudgetTransactionInput = Omit<BudgetTransaction, 'id' | 'created_at'>;

export interface GamingTransaction {
  id: string;
  transaction_ref: string | null;
  type_of_wager: string | null;
  gross_winnings: number;
  federal_income_tax_withheld: number;
  transaction_dt: string | null;
  transaction_number: string | null;
  race: string | null;
  cashier: string | null;
  window_number: string | null;
  payer_name: string | null;
  payer_address: string | null;
  payer_city: string | null;
  payer_state: string | null;
  payer_zipcode: string | null;
  payer_federal_id_number: string | null;
  payer_telephone: string | null;
  winner_name: string | null;
  winner_address: string | null;
  winner_city: string | null;
  winner_state: string | null;
  winner_zipcode: string | null;
  winner_tin_last4: string | null;
  first_id: string | null;
  second_id: string | null;
  state: string | null;
  state_id_number: string | null;
  state_winnings: number | null;
  state_income_tax_withheld: number;
  total_amount: number | null;
  notes: string | null;
}

export type GamingTransactionInput = Omit<GamingTransaction, 'id'>;

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Event {
  id: string;
  event_name: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurrence_freq: RecurrenceFreq | null;
  recurrence_interval: number;
  recurrence_byweekday: number[] | null;
  recurrence_until: string | null;
  recurrence_count: number | null;
  recurrence_exceptions: string[];
  created_at: string;
  updated_at: string;
}

export type EventInput = Omit<Event, 'id' | 'created_at' | 'updated_at'>;

export interface EventOccurrence {
  event_id: string;
  event_name: string;
  occurrence_start: string;
  occurrence_end: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  is_recurring: boolean;
}
