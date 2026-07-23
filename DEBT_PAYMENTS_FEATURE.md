# Record Payment — Form Implementation Guide

Adds payment recording to **myvelfinance**: a **Record payment** form tied to a
debt, plus a per-debt **payment history** list. Backed by the Supabase
`debt_payments` table (FK `debt_id` → `debt_monitoring.id`).

**Same stack as the debt page:** React 18 · TypeScript · Vite · Tailwind ·
`@supabase/supabase-js` · `react-hot-toast` · `lucide-react` · `dayjs`

> Assumes `debt_payments.sql` has been run and the `DebtMonitoring` page from
> `DEBT_MONITORING_FEATURE.md` already exists.

---

## 1. Types — add to `src/lib/types.ts`

```ts
export type PaymentType = 'Credit card' | 'Debit card';

export interface Payment {
  id: string;
  debt_id: string;
  payment_amount: number | null;
  payment_date: string;          // 'YYYY-MM-DD'
  payment_type: PaymentType;
  reference_number: string | null;
  notes: string | null;
  // snapshot copied from the parent debt at payment time
  origin: string | null;
  account_number: string | null;
  collector: string | null;
  created_at: string;
  updated_at: string;
}

// what the form supplies (id + timestamps are DB-managed)
export type PaymentInput = Omit<Payment, 'id' | 'created_at' | 'updated_at'>;
```

---

## 2. Data layer — `src/lib/payments.ts`

```ts
import { supabase } from './supabase';
import type { Payment, PaymentInput } from './types';

const TABLE = 'debt_payments';

/** All payments for one debt, newest first. */
export async function listPayments(debtId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('debt_id', debtId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
```

---

## 3. The form + history — `src/components/PaymentsModal.tsx`

Opened from a debt row. Shows that debt's history **and** the record-payment
form in one modal. The snapshot fields (`origin`, `account_number`,
`collector`) are auto-filled from the selected debt — the user never types
them.

```tsx
import { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  listPayments,
  createPayment,
  deletePayment,
} from '../lib/payments';
import type { Debt } from '../lib/types';
import type { Payment, PaymentInput, PaymentType } from '../lib/types';

const PAYMENT_TYPES: PaymentType[] = ['Credit card', 'Debit card'];

const usd = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** Build a fresh form pre-filled from the debt being paid. */
function blankForm(debt: Debt): PaymentInput {
  return {
    debt_id: debt.id,
    payment_amount: debt.monthly_payment ?? null, // sensible default
    payment_date: dayjs().format('YYYY-MM-DD'),    // today
    payment_type: 'Credit card',
    reference_number: null,
    notes: null,
    // snapshot from parent debt
    origin: debt.origin,
    account_number: debt.account_number,
    collector: debt.collector,
  };
}

export default function PaymentsModal({
  debt,
  onClose,
}: {
  debt: Debt;
  onClose: () => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaymentInput>(() => blankForm(debt));

  async function refresh() {
    setLoading(true);
    try {
      setPayments(await listPayments(debt.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt.id]);

  function setField<K extends keyof PaymentInput>(key: K, value: PaymentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.payment_date) {
      toast.error('Payment date is required');
      return;
    }
    if (!form.payment_type) {
      toast.error('Payment type is required');
      return;
    }
    setSaving(true);
    try {
      await createPayment(form);
      toast.success('Payment recorded');
      setForm(blankForm(debt)); // reset for the next entry
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Payment) {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await deletePayment(p.id);
      toast.success('Payment deleted');
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const totalPaid = useMemo(
    () => payments.reduce((s, p) => s + (p.payment_amount ?? 0), 0),
    [payments],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Payments — {debt.origin}
              {debt.merchant ? ` · ${debt.merchant}` : ''}
            </h2>
            <p className="text-sm text-gray-500">
              {debt.collector ?? '—'}
              {debt.account_number ? ` · #${debt.account_number}` : ''}
              {' · '}Balance {usd(debt.balance_due)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* ---- Record payment form ---- */}
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Record payment</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">Amount</span>
              <input
                type="number"
                step="0.01"
                value={form.payment_amount ?? ''}
                onChange={(e) =>
                  setField(
                    'payment_amount',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">
                Date <span className="text-red-500">*</span>
              </span>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setField('payment_date', e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">
                Type <span className="text-red-500">*</span>
              </span>
              <select
                value={form.payment_type}
                onChange={(e) =>
                  setField('payment_type', e.target.value as PaymentType)
                }
                className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">Reference number</span>
              <input
                type="text"
                value={form.reference_number ?? ''}
                onChange={(e) =>
                  setField('reference_number', e.target.value || null)
                }
                className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-gray-600">Notes</span>
              <input
                type="text"
                value={form.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value || null)}
                className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={16} />
              {saving ? 'Saving…' : 'Record payment'}
            </button>
          </div>
        </div>

        {/* ---- History ---- */}
        <div className="max-h-[45vh] overflow-y-auto px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">History</h3>
            <span className="text-sm text-gray-500">
              {payments.length} payments · {usd(totalPaid)} total
            </span>
          </div>

          {loading ? (
            <p className="py-6 text-center text-gray-400">Loading…</p>
          ) : payments.length === 0 ? (
            <p className="py-6 text-center text-gray-400">No payments recorded yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {dayjs(p.payment_date).format('MMM D, YYYY')}
                    </td>
                    <td className="py-2 pr-3 text-right">{usd(p.payment_amount)}</td>
                    <td className="py-2 pr-3">{p.payment_type}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {p.reference_number ?? '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{p.notes ?? '—'}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Wire it into the debt table

In `DebtMonitoring.tsx`, add state and a **Payments** button per row.

### 4.1 Import + state
```tsx
import { CreditCard } from 'lucide-react';
import PaymentsModal from '../components/PaymentsModal';

// inside the component
const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
```

### 4.2 Button in the actions cell (next to Edit/Delete)
```tsx
<button
  onClick={() => setPayingDebt(d)}
  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-emerald-600"
  title="Payments"
>
  <CreditCard size={15} />
</button>
```

### 4.3 Render the modal (near the edit modal)
```tsx
{payingDebt && (
  <PaymentsModal debt={payingDebt} onClose={() => setPayingDebt(null)} />
)}
```

---

## 5. Notes

- **Snapshot is automatic.** `origin`, `account_number`, and `collector` are
  filled from the selected debt in `blankForm()` — no user input, and they
  freeze the debt's state at payment time.
- **Amount defaults to the monthly payment.** `blankForm()` seeds
  `payment_amount` with `debt.monthly_payment` so the common case is one click;
  the user can still override it.
- **Required fields** match the DB: `payment_date` and `payment_type` are
  validated before save; amount is optional.
- **Payment type** is a `<select>` limited to the two DB-allowed values. If you
  extend the table's `CHECK` constraint (e.g. add `'ACH'`), also add it to the
  `PAYMENT_TYPES` array here.
- **Balance isn't auto-decremented.** Recording a payment does not change
  `debt_monitoring.balance_due`. If you want the running balance to drop, add an
  `updateDebt` call after `createPayment`, or compute "remaining" as
  `balance_due − sum(payments)` in the UI. Tell me which you'd prefer.
