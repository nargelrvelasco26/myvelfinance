# Debt Monitoring — Feature Implementation Guide

A page for **myvelfinance** that lists debt accounts in a table and lets you
**add**, **edit**, and **delete** them, backed by the Supabase `debt_monitoring`
table.

**Stack this targets:** React 18 · TypeScript · Vite · Tailwind ·
`@supabase/supabase-js` · `react-hot-toast` · `lucide-react` · `react-router-dom` 7 · `dayjs`

---

## 1. Prerequisites

### 1.1 Database
The `debt_monitoring` table and its RLS policies must already exist (see
`debt_monitoring.sql`). Because the policies grant access only to the
`authenticated` role, the user must be **logged in** for reads/writes to work.

### 1.2 Environment variables
In your project root `.env`:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

---

## 2. Types — `src/lib/types.ts`

Mirrors the table columns exactly. Nullable columns are `| null`.

```ts
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
  monthly_payment: number | null;
  payment_due_day: string | null;
  pay_from_bank: string | null;
  owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fields the user supplies on add/edit (id + timestamps are DB-managed)
export type DebtInput = Omit<Debt, 'id' | 'created_at' | 'updated_at'>;
```

---

## 3. Supabase client — `src/lib/supabase.ts`

Skip this if you already have a shared client; just import your existing one.

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);
```

---

## 4. Data layer — `src/lib/debts.ts`

All CRUD in one place. Every function throws on error so the UI can `try/catch`
and toast.

```ts
import { supabase } from './supabase';
import type { Debt, DebtInput } from './types';

const TABLE = 'debt_monitoring';

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
```

---

## 5. The page — `src/pages/DebtMonitoring.tsx`

Table listing + a modal form used for both **Add** and **Edit** + a
delete button per row. Totals are computed at the bottom.

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  listDebts,
  createDebt,
  updateDebt,
  deleteDebt,
} from '../lib/debts';
import type { Debt, DebtInput } from '../lib/types';

const EMPTY: DebtInput = {
  origin: '',
  collector: null,
  current_creditor: null,
  original_creditor: null,
  merchant: null,
  account_number: null,
  reference_number: null,
  account_manager: null,
  balance_due: null,
  monthly_payment: null,
  payment_due_day: null,
  pay_from_bank: null,
  owner: null,
  notes: null,
};

const usd = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function DebtMonitoring() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DebtInput>(EMPTY);

  async function refresh() {
    setLoading(true);
    try {
      setDebts(await listDebts());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load debts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(d: Debt) {
    setEditingId(d.id);
    const { id, created_at, updated_at, ...rest } = d;
    setForm(rest);
    setModalOpen(true);
  }

  function setField<K extends keyof DebtInput>(key: K, value: DebtInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.origin.trim()) {
      toast.error('Origin is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateDebt(editingId, form);
        toast.success('Debt updated');
      } else {
        await createDebt(form);
        toast.success('Debt added');
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: Debt) {
    if (!window.confirm(`Delete ${d.origin}${d.merchant ? ` — ${d.merchant}` : ''}?`))
      return;
    try {
      await deleteDebt(d.id);
      toast.success('Debt deleted');
      setDebts((prev) => prev.filter((x) => x.id !== d.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const totals = useMemo(
    () => ({
      balance: debts.reduce((s, d) => s + (d.balance_due ?? 0), 0),
      monthly: debts.reduce((s, d) => s + (d.monthly_payment ?? 0), 0),
    }),
    [debts],
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Debt Monitoring</h1>
          <p className="text-sm text-gray-500">{debts.length} accounts</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Add debt
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">Collector</th>
              <th className="px-3 py-2">Current creditor</th>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Account #</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2 text-right">Monthly</th>
              <th className="px-3 py-2">Due day</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : debts.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-gray-400">
                  No debts yet. Click “Add debt” to start.
                </td>
              </tr>
            ) : (
              debts.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{d.owner ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{d.origin}</td>
                  <td className="px-3 py-2">{d.collector ?? '—'}</td>
                  <td className="px-3 py-2">{d.current_creditor ?? '—'}</td>
                  <td className="px-3 py-2">{d.merchant ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {d.account_number ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{usd(d.balance_due)}</td>
                  <td className="px-3 py-2 text-right">{usd(d.monthly_payment)}</td>
                  <td className="px-3 py-2">{d.payment_due_day ?? '—'}</td>
                  <td className="px-3 py-2">{d.pay_from_bank ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(d)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {debts.length > 0 && (
            <tfoot className="bg-gray-50 font-medium text-gray-900">
              <tr>
                <td className="px-3 py-2" colSpan={6}>
                  Totals
                </td>
                <td className="px-3 py-2 text-right">{usd(totals.balance)}</td>
                <td className="px-3 py-2 text-right">{usd(totals.monthly)}</td>
                <td className="px-3 py-2" colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modalOpen && (
        <DebtModal
          form={form}
          editing={editingId !== null}
          saving={saving}
          onField={setField}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add/Edit modal
// ---------------------------------------------------------------------------

function DebtModal({
  form,
  editing,
  saving,
  onField,
  onClose,
  onSave,
}: {
  form: DebtInput;
  editing: boolean;
  saving: boolean;
  onField: <K extends keyof DebtInput>(k: K, v: DebtInput[K]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const text = (
    label: string,
    key: keyof DebtInput,
    required = false,
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type="text"
        value={(form[key] as string | null) ?? ''}
        onChange={(e) =>
          onField(key, (e.target.value || null) as DebtInput[typeof key])
        }
        className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );

  const money = (label: string, key: 'balance_due' | 'monthly_payment') => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type="number"
        step="0.01"
        value={form[key] ?? ''}
        onChange={(e) =>
          onField(key, e.target.value === '' ? null : Number(e.target.value))
        }
        className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit debt' : 'Add debt'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          {text('Origin', 'origin', true)}
          {text('Owner', 'owner')}
          {text('Collector', 'collector')}
          {text('Current creditor', 'current_creditor')}
          {text('Original creditor', 'original_creditor')}
          {text('Merchant', 'merchant')}
          {text('Account number', 'account_number')}
          {text('Reference number', 'reference_number')}
          {text('Account manager', 'account_manager')}
          {money('Balance due', 'balance_due')}
          {money('Monthly payment', 'monthly_payment')}
          {text('Payment due day', 'payment_due_day')}
          {text('Pay from bank', 'pay_from_bank')}
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-gray-600">Notes</span>
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => onField('notes', e.target.value || null)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add debt'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Wiring it up

### 6.1 Route — `src/App.tsx`
```tsx
import { Routes, Route } from 'react-router-dom';
import DebtMonitoring from './pages/DebtMonitoring';

// inside <Routes>
<Route path="/debts" element={<DebtMonitoring />} />
```

### 6.2 Toaster (once, at app root)
```tsx
import { Toaster } from 'react-hot-toast';

// inside your root layout / App
<Toaster position="top-right" />
```

Navigate to `/debts` and you're done.

---

## 7. Notes & next steps

- **Auth is required.** RLS grants access only to the `authenticated` role, so
  a signed-out user sees an empty table and writes fail. Make sure this route
  sits behind your login flow.
- **Refresh strategy.** The page re-fetches after add/edit for simplicity.
  Delete updates local state directly to feel instant.
- **`payment_due_day`** is free text (`"Every 2nd"`, `"Every 31st"`) — matching
  the column. Swap to a `<select>` of common values if you want to constrain it.
- **`account_number`** is rendered in a monospace font and stored as text, so
  masked values (`3832`, `6813`) and leading zeros survive intact.
- **Filtering/sorting.** For a per-owner view (NV vs JV), add a filter dropdown
  that passes `.eq('owner', value)` into `listDebts`.
- **`dayjs`** isn't used here yet, but is handy if you later add a
  "last updated" column — `dayjs(d.updated_at).format('MMM D, YYYY')`.
