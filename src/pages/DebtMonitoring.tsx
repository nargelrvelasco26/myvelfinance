import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, FileDown, ArrowLeft, DollarSign, History, ArrowUp, ArrowDown, ArrowUpDown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  listDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  createPayment,
  listPayments,
} from '../lib/debts';
import type { DebtPayment } from '../lib/types';
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
  current_due: null,
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
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DebtInput>(EMPTY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_type: 'Credit Card',
    reference_number: '',
    notes: '',
  });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<DebtPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [bulkHistoryModalOpen, setBulkHistoryModalOpen] = useState(false);
  const [bulkPaymentHistory, setBulkPaymentHistory] = useState<{ debt: Debt; payments: DebtPayment[] }[]>([]);
  const [loadingBulkHistory, setLoadingBulkHistory] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Debt | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('debtMonitoringColumnWidths');
    return saved ? JSON.parse(saved) : {
      checkbox: 50,
      actions: 180,
      owner: 80,
      origin: 200,
      collector: 150,
      current_creditor: 150,
      merchant: 150,
      account_number: 120,
      reference_number: 120,
      balance_due: 120,
      current_due: 120,
      monthly_payment: 120,
      payment_due_day: 100,
      pay_from_bank: 120,
    };
  });

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

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem('debtMonitoringColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle column sorting
  const handleSort = (field: keyof Debt) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort debts
  const sortedDebts = useMemo(() => {
    if (!sortField) return debts;

    return [...debts].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [debts, sortField, sortDirection]);

  // Handle column resize
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = columnWidths[columnKey];

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (e.pageX - startX));
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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

  function openPayment(d: Debt) {
    setPayingDebt(d);
    setPaymentForm({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_type: 'Credit Card',
      reference_number: '',
      notes: '',
    });
    setPaymentModalOpen(true);
  }

  async function openHistory(d: Debt) {
    setHistoryDebt(d);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const history = await listPayments(d.id);
      setPaymentHistory(history);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment history');
      setPaymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function openBulkHistory() {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one debt');
      return;
    }

    setBulkHistoryModalOpen(true);
    setLoadingBulkHistory(true);

    try {
      const selectedDebts = debts.filter(d => selectedIds.has(d.id));
      const historyPromises = selectedDebts.map(async (debt) => {
        const payments = await listPayments(debt.id);
        return { debt, payments };
      });

      const results = await Promise.all(historyPromises);
      setBulkPaymentHistory(results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment histories');
      setBulkPaymentHistory([]);
    } finally {
      setLoadingBulkHistory(false);
    }
  }

  async function handlePayment() {
    if (!payingDebt) return;

    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setSaving(true);
    try {
      // Save payment to debt_payments table
      await createPayment({
        debt_id: payingDebt.id,
        owner: payingDebt.owner,
        origin: payingDebt.origin,
        collector: payingDebt.collector,
        account_number: payingDebt.account_number,
        payment_amount: amount,
        payment_date: paymentForm.date,
        payment_type: paymentForm.payment_type,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
      });

      // Calculate new current_due: (current_due ?? balance_due) - payment amount
      const currentBalance = payingDebt.current_due ?? payingDebt.balance_due ?? 0;
      const newCurrentDue = Math.max(0, currentBalance - amount); // Don't go below 0

      // Update debt's current_due
      await updateDebt(payingDebt.id, {
        current_due: newCurrentDue,
      });

      toast.success(`Payment of $${amount.toFixed(2)} recorded for ${payingDebt.origin}`);
      setPaymentModalOpen(false);
      setPayingDebt(null);

      // Refresh the debt list to show updated balances
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
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

  function openDeleteConfirm(d: Debt) {
    setDebtToDelete(d);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!debtToDelete) return;

    try {
      await deleteDebt(debtToDelete.id);
      toast.success('Debt deleted successfully');
      setDebts((prev) => prev.filter((x) => x.id !== debtToDelete.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(debtToDelete.id);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteConfirmOpen(false);
      setDebtToDelete(null);
    }
  }

  function cancelDelete() {
    setDeleteConfirmOpen(false);
    setDebtToDelete(null);
  }

  const totals = useMemo(
    () => ({
      balance: sortedDebts.reduce((s, d) => s + (d.balance_due ?? 0), 0),
      currentDue: sortedDebts.reduce((s, d) => s + (d.current_due ?? d.balance_due ?? 0), 0),
      monthly: sortedDebts.reduce((s, d) => s + (d.monthly_payment ?? 0), 0),
    }),
    [sortedDebts],
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === debts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(debts.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePrint = () => {
    const selectedDebts = selectedIds.size > 0
      ? debts.filter(d => selectedIds.has(d.id))
      : debts;

    if (selectedDebts.length === 0) {
      toast.error('No records to print');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Debt Monitoring Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Debt Monitoring Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Origin</th>
              <th>Collector</th>
              <th>Current Creditor</th>
              <th>Merchant</th>
              <th>Account #</th>
              <th>Reference #</th>
              <th class="text-right">Balance Due</th>
              <th class="text-right">Current Due</th>
              <th class="text-right">Monthly</th>
              <th>Due Day</th>
              <th>Bank</th>
            </tr>
          </thead>
          <tbody>
            ${selectedDebts.map(d => `
              <tr>
                <td>${d.owner ?? '—'}</td>
                <td>${d.origin}</td>
                <td>${d.collector ?? '—'}</td>
                <td>${d.current_creditor ?? '—'}</td>
                <td>${d.merchant ?? '—'}</td>
                <td>${d.account_number ?? '—'}</td>
                <td>${d.reference_number ?? '—'}</td>
                <td class="text-right">${usd(d.balance_due)}</td>
                <td class="text-right"><strong>${usd(d.current_due ?? d.balance_due)}</strong></td>
                <td class="text-right">${usd(d.monthly_payment)}</td>
                <td>${d.payment_due_day ?? '—'}</td>
                <td>${d.pay_from_bank ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals">
              <td colspan="8">Totals</td>
              <td class="text-right"><strong>${usd(selectedDebts.reduce((s, d) => s + (d.current_due ?? d.balance_due ?? 0), 0))}</strong></td>
              <td class="text-right">${usd(selectedDebts.reduce((s, d) => s + (d.monthly_payment ?? 0), 0))}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const exportToExcel = () => {
    const selectedDebts = selectedIds.size > 0
      ? debts.filter(d => selectedIds.has(d.id))
      : debts;

    if (selectedDebts.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = [
      'Owner', 'Origin', 'Collector', 'Current Creditor', 'Original Creditor',
      'Merchant', 'Account Number', 'Reference Number', 'Account Manager',
      'Balance Due', 'Current Due', 'Monthly Payment', 'Payment Due Day', 'Pay From Bank', 'Notes'
    ];

    const rows = selectedDebts.map(d => [
      d.owner ?? '',
      d.origin,
      d.collector ?? '',
      d.current_creditor ?? '',
      d.original_creditor ?? '',
      d.merchant ?? '',
      d.account_number ?? '',
      d.reference_number ?? '',
      d.account_manager ?? '',
      d.balance_due ?? '',
      d.current_due ?? d.balance_due ?? '',
      d.monthly_payment ?? '',
      d.payment_due_day ?? '',
      d.pay_from_bank ?? '',
      d.notes ?? ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `debt-monitoring-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported to CSV');
  };

  const exportToPDF = () => {
    const selectedDebts = selectedIds.size > 0
      ? debts.filter(d => selectedIds.has(d.id))
      : debts;

    if (selectedDebts.length === 0) {
      toast.error('No records to export');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Unable to open export window');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Debt Monitoring Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { font-weight: bold; background-color: #f9f9f9; }
          @media print {
            body { padding: 10px; }
            h1 { font-size: 18px; }
            table { font-size: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>Debt Monitoring Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Origin</th>
              <th>Collector</th>
              <th>Current Creditor</th>
              <th>Merchant</th>
              <th>Account #</th>
              <th>Reference #</th>
              <th class="text-right">Balance Due</th>
              <th class="text-right">Current Due</th>
              <th class="text-right">Monthly</th>
              <th>Due Day</th>
              <th>Bank</th>
            </tr>
          </thead>
          <tbody>
            ${selectedDebts.map(d => `
              <tr>
                <td>${d.owner ?? '—'}</td>
                <td>${d.origin}</td>
                <td>${d.collector ?? '—'}</td>
                <td>${d.current_creditor ?? '—'}</td>
                <td>${d.merchant ?? '—'}</td>
                <td>${d.account_number ?? '—'}</td>
                <td>${d.reference_number ?? '—'}</td>
                <td class="text-right">${usd(d.balance_due)}</td>
                <td class="text-right"><strong>${usd(d.current_due ?? d.balance_due)}</strong></td>
                <td class="text-right">${usd(d.monthly_payment)}</td>
                <td>${d.payment_due_day ?? '—'}</td>
                <td>${d.pay_from_bank ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals">
              <td colspan="8">Totals</td>
              <td class="text-right"><strong>${usd(selectedDebts.reduce((s, d) => s + (d.current_due ?? d.balance_due ?? 0), 0))}</strong></td>
              <td class="text-right">${usd(selectedDebts.reduce((s, d) => s + (d.monthly_payment ?? 0), 0))}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('PDF export opened. Use your browser\'s print to PDF feature.');
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getDebtsForDay = (day: number) => {
    return debts.filter(d => {
      if (!d.payment_due_day) return false;
      const dueDay = parseInt(d.payment_due_day);
      return dueDay === day;
    });
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Debt Monitoring</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">{debts.length} accounts</p>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 sm:px-4 py-2 text-sm font-medium text-white transition shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Record</span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
              <span className="text-xs sm:text-sm text-indigo-900 font-medium">
                {selectedIds.size} selected
              </span>
              <button
                onClick={openBulkHistory}
                className="ml-auto inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white transition"
              >
                <History size={14} /> <span className="hidden sm:inline">Debt Payment History</span><span className="sm:hidden">History</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCalendarModalOpen(true)}
              disabled={debts.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar size={14} /> <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={debts.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-gray-200 hover:bg-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={14} /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={debts.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={14} /> <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              disabled={debts.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={14} /> <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow max-h-[calc(100vh-250px)]">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 bg-gray-100 relative" style={{ width: columnWidths.checkbox }}>
                  <input
                    type="checkbox"
                    checked={debts.length > 0 && selectedIds.size === debts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative" style={{ width: columnWidths.actions }}>
                  Actions
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => handleMouseDown('actions', e)}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.owner }} onClick={() => handleSort('owner')}>
                  <div className="flex items-center justify-between">
                    <span>Owner</span>
                    {sortField === 'owner' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('owner', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.origin }} onClick={() => handleSort('origin')}>
                  <div className="flex items-center justify-between">
                    <span>Origin</span>
                    {sortField === 'origin' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('origin', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.collector }} onClick={() => handleSort('collector')}>
                  <div className="flex items-center justify-between">
                    <span>Collector</span>
                    {sortField === 'collector' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('collector', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.current_creditor }} onClick={() => handleSort('current_creditor')}>
                  <div className="flex items-center justify-between">
                    <span>Current creditor</span>
                    {sortField === 'current_creditor' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('current_creditor', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.merchant }} onClick={() => handleSort('merchant')}>
                  <div className="flex items-center justify-between">
                    <span>Merchant</span>
                    {sortField === 'merchant' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('merchant', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.account_number }} onClick={() => handleSort('account_number')}>
                  <div className="flex items-center justify-between">
                    <span>Account #</span>
                    {sortField === 'account_number' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('account_number', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.reference_number }} onClick={() => handleSort('reference_number')}>
                  <div className="flex items-center justify-between">
                    <span>Reference #</span>
                    {sortField === 'reference_number' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('reference_number', e); }}
                  />
                </th>
                <th className="px-3 py-3 text-right bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.balance_due }} onClick={() => handleSort('balance_due')}>
                  <div className="flex items-center justify-between">
                    <span>Balance Due</span>
                    {sortField === 'balance_due' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('balance_due', e); }}
                  />
                </th>
                <th className="px-3 py-3 text-right bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.current_due }} onClick={() => handleSort('current_due')}>
                  <div className="flex items-center justify-between">
                    <span>Current Due</span>
                    {sortField === 'current_due' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('current_due', e); }}
                  />
                </th>
                <th className="px-3 py-3 text-right bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.monthly_payment }} onClick={() => handleSort('monthly_payment')}>
                  <div className="flex items-center justify-between">
                    <span>Monthly</span>
                    {sortField === 'monthly_payment' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('monthly_payment', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.payment_due_day }} onClick={() => handleSort('payment_due_day')}>
                  <div className="flex items-center justify-between">
                    <span>Due day</span>
                    {sortField === 'payment_due_day' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('payment_due_day', e); }}
                  />
                </th>
                <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.pay_from_bank }} onClick={() => handleSort('pay_from_bank')}>
                  <div className="flex items-center justify-between">
                    <span>Bank</span>
                    {sortField === 'pay_from_bank' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('pay_from_bank', e); }}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : debts.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-gray-400">
                    No debts yet. Click "Add Record" to start.
                  </td>
                </tr>
              ) : (
                sortedDebts.map((d, index) => (
                  <tr key={d.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 text-gray-900`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPayment(d);
                          }}
                          className="rounded p-1.5 text-green-600 hover:bg-green-50 transition"
                          title="Make Payment"
                        >
                          <DollarSign size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openHistory(d);
                          }}
                          className="rounded p-1.5 text-purple-600 hover:bg-purple-50 transition"
                          title="Payment History"
                        >
                          <History size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(d);
                          }}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 transition"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteConfirm(d);
                          }}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 transition"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">{d.owner ?? '—'}</td>
                    <td className="px-3 py-3 font-medium">{d.origin}</td>
                    <td className="px-3 py-3">{d.collector ?? '—'}</td>
                    <td className="px-3 py-3">{d.current_creditor ?? '—'}</td>
                    <td className="px-3 py-3">{d.merchant ?? '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {d.account_number ?? '—'}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {d.reference_number ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right">{usd(d.balance_due)}</td>
                    <td className="px-3 py-3 text-right font-semibold">{usd(d.current_due ?? d.balance_due)}</td>
                    <td className="px-3 py-3 text-right">{usd(d.monthly_payment)}</td>
                    <td className="px-3 py-3">{d.payment_due_day ?? '—'}</td>
                    <td className="px-3 py-3">{d.pay_from_bank ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
            {debts.length > 0 && (
              <tfoot className="bg-gray-100 font-medium text-gray-900 sticky bottom-0">
                <tr>
                  <td className="px-3 py-3 bg-gray-100" colSpan={9}>
                    Totals
                  </td>
                  <td className="px-3 py-3 text-right bg-gray-100">{usd(totals.balance)}</td>
                  <td className="px-3 py-3 text-right font-bold text-lg bg-gray-100">{usd(totals.currentDue)}</td>
                  <td className="px-3 py-3 text-right bg-gray-100">{usd(totals.monthly)}</td>
                  <td className="px-3 py-3 bg-gray-100" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              Loading…
            </div>
          ) : debts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              No debts yet. Click "Add Record" to start.
            </div>
          ) : (
            <>
              {sortedDebts.map((d) => (
                <div key={d.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">{d.origin}</h3>
                        {d.merchant && (
                          <p className="text-sm text-gray-600 mb-2">{d.merchant}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => openPayment(d)}
                        className="p-2 rounded text-green-600 hover:bg-green-50 transition"
                        title="Make Payment"
                      >
                        <DollarSign size={18} />
                      </button>
                      <button
                        onClick={() => openHistory(d)}
                        className="p-2 rounded text-purple-600 hover:bg-purple-50 transition"
                        title="Payment History"
                      >
                        <History size={18} />
                      </button>
                      <button
                        onClick={() => openEdit(d)}
                        className="p-2 rounded text-blue-600 hover:bg-blue-50 transition"
                        title="Edit"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(d)}
                        className="p-2 rounded text-red-600 hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600 font-medium">Current Due:</span>
                        <p className="text-base font-bold text-gray-900">{usd(d.current_due ?? d.balance_due)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Monthly:</span>
                        <p className="text-base font-semibold text-gray-900">{usd(d.monthly_payment)}</p>
                      </div>
                    </div>

                    {d.owner && (
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-24 shrink-0">Owner:</span>
                        <span className="text-gray-900">{d.owner}</span>
                      </div>
                    )}
                    {d.collector && (
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-24 shrink-0">Collector:</span>
                        <span className="text-gray-900">{d.collector}</span>
                      </div>
                    )}
                    {d.current_creditor && (
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-24 shrink-0">Creditor:</span>
                        <span className="text-gray-900">{d.current_creditor}</span>
                      </div>
                    )}
                    {d.account_number && (
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-24 shrink-0">Account #:</span>
                        <span className="text-gray-900 font-mono text-xs">{d.account_number}</span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Balance:</span>
                      <span className="text-gray-900">{usd(d.balance_due)}</span>
                    </div>
                    {d.payment_due_day && (
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-24 shrink-0">Due Day:</span>
                        <span className="text-gray-900">{d.payment_due_day}</span>
                      </div>
                    )}
                    {d.pay_from_bank && (
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-24 shrink-0">Bank:</span>
                        <span className="text-gray-900">{d.pay_from_bank}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Mobile Totals */}
              <div className="bg-gray-100 rounded-lg p-4 font-medium text-gray-900 border border-gray-300">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Totals</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Balance Due:</span>
                    <p className="text-base font-bold text-gray-900">{usd(totals.balance)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Due:</span>
                    <p className="text-lg font-bold text-gray-900">{usd(totals.currentDue)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Monthly Payment:</span>
                    <p className="text-base font-bold text-gray-900">{usd(totals.monthly)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
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

        {paymentModalOpen && payingDebt && (
          <PaymentModal
            debt={payingDebt}
            paymentForm={paymentForm}
            saving={saving}
            onClose={() => {
              setPaymentModalOpen(false);
              setPayingDebt(null);
            }}
            onSubmit={handlePayment}
            onChange={(field, value) => {
              setPaymentForm(prev => ({ ...prev, [field]: value }));
            }}
          />
        )}

        {historyModalOpen && historyDebt && (
          <PaymentHistoryModal
            debt={historyDebt}
            payments={paymentHistory}
            loading={loadingHistory}
            onClose={() => {
              setHistoryModalOpen(false);
              setHistoryDebt(null);
              setPaymentHistory([]);
            }}
          />
        )}

        {bulkHistoryModalOpen && (
          <BulkPaymentHistoryModal
            debtsWithPayments={bulkPaymentHistory}
            loading={loadingBulkHistory}
            onClose={() => {
              setBulkHistoryModalOpen(false);
              setBulkPaymentHistory([]);
            }}
          />
        )}

        {calendarModalOpen && (
          <CalendarModal
            date={calendarDate}
            debts={debts}
            onClose={() => setCalendarModalOpen(false)}
            onMonthChange={changeMonth}
            onToday={goToToday}
            getDebtsForDay={getDebtsForDay}
            getDaysInMonth={getDaysInMonth}
            getFirstDayOfMonth={getFirstDayOfMonth}
          />
        )}

        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Delete Debt Record"
          message={`Are you sure you want to delete "${debtToDelete?.origin}${debtToDelete?.merchant ? ` — ${debtToDelete.merchant}` : ''}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          variant="danger"
        />
      </div>
    </div>
  );
}

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

  const money = (label: string, key: 'balance_due' | 'current_due' | 'monthly_payment') => (
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white border border-gray-200 shadow-2xl max-h-[95vh] sm:max-h-auto flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-5 py-3 sm:py-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {editing ? 'Edit debt' : 'Add debt'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:gap-4 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 sm:grid-cols-2">
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
          {money('Current due', 'current_due')}
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

        <div className="flex justify-end gap-2 sm:gap-3 border-t border-gray-200 px-4 sm:px-5 py-3 sm:py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add debt'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  debt,
  paymentForm,
  saving,
  onClose,
  onSubmit,
  onChange,
}: {
  debt: Debt;
  paymentForm: {
    amount: string;
    date: string;
    payment_type: string;
    reference_number: string;
    notes: string;
  };
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (field: string, value: string) => void;
}) {
  const paymentTypes = [
    'Credit Card',
    'Debit Card',
    'Cash',
    'Money Order',
    'Cashier Check',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-2xl max-h-[95vh] sm:max-h-auto flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Make Payment</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
              {debt.origin} {debt.merchant ? `— ${debt.merchant}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Current Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {(debt.current_due ?? debt.balance_due ?? 0).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </p>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              Payment Amount <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => onChange('amount', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="0.00"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              Payment Date <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={paymentForm.date}
              onChange={(e) => onChange('date', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              Payment Type <span className="text-red-500">*</span>
            </span>
            <select
              value={paymentForm.payment_type}
              onChange={(e) => onChange('payment_type', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {paymentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Reference Number</span>
            <input
              type="text"
              value={paymentForm.reference_number}
              onChange={(e) => onChange('reference_number', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Confirmation or check number"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Notes</span>
            <textarea
              rows={2}
              value={paymentForm.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Additional payment details..."
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3 border-t border-gray-200 px-4 sm:px-5 py-3 sm:py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-lg bg-green-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Processing…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentHistoryModal({
  debt,
  payments,
  loading,
  onClose,
}: {
  debt: Debt;
  payments: DebtPayment[];
  loading: boolean;
  onClose: () => void;
}) {
  const usd = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const totalPaid = payments.reduce((sum, p) => sum + p.payment_amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white border border-gray-200 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {debt.origin} {debt.merchant ? `— ${debt.merchant}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Current Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {usd(debt.current_due ?? debt.balance_due ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Original Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {usd(debt.balance_due ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Paid</p>
              <p className="text-xl font-bold text-green-600">
                {usd(totalPaid)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <History size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-400 text-center">No payment history yet</p>
              <p className="text-sm text-gray-500 text-center mt-1">
                Payments will appear here once recorded
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-700">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-700">
                      Payment Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-700">
                      Reference #
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-gray-700">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-700">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        {new Date(payment.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {payment.payment_type}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {payment.reference_number || '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-green-600">
                        {usd(payment.payment_amount)}
                      </td>
                      <td className="px-3 py-3 text-gray-600 max-w-xs truncate">
                        {payment.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-gray-900">
                      Total Payments
                    </td>
                    <td className="px-3 py-3 text-right text-green-600 font-bold text-base">
                      {usd(totalPaid)}
                    </td>
                    <td className="px-3 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkPaymentHistoryModal({
  debtsWithPayments,
  loading,
  onClose,
}: {
  debtsWithPayments: { debt: Debt; payments: DebtPayment[] }[];
  loading: boolean;
  onClose: () => void;
}) {
  const usd = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const grandTotal = debtsWithPayments.reduce(
    (sum, { payments }) => sum + payments.reduce((s, p) => s + p.payment_amount, 0),
    0
  );

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Debt Payment History Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
          .debt-section { margin-bottom: 30px; page-break-inside: avoid; }
          .debt-header { background-color: #f3f4f6; padding: 12px; margin-bottom: 10px; border-radius: 4px; }
          .debt-title { font-size: 16px; font-weight: bold; color: #1f2937; }
          .debt-info { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f9fafb; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { font-weight: bold; background-color: #f9fafb; }
          .debt-total { background-color: #dbeafe; font-weight: bold; }
          .grand-total { background-color: #c7d2fe; font-weight: bold; font-size: 13px; }
          .no-payments { padding: 20px; text-align: center; color: #9ca3af; font-style: italic; }
          @media print {
            body { padding: 10px; }
            h1 { font-size: 20px; }
            table { font-size: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>Debt Payment History Report</h1>
        <p class="subtitle">Generated on: ${new Date().toLocaleString()}</p>
        
        ${debtsWithPayments.map(({ debt, payments }) => `
          <div class="debt-section">
            <div class="debt-header">
              <div class="debt-title">${debt.origin}${debt.merchant ? ` — ${debt.merchant}` : ''}</div>
              <div class="debt-info">
                Owner: ${debt.owner || 'N/A'} | 
                Account: ${debt.account_number || 'N/A'} | 
                Current Balance: ${usd(debt.current_due ?? debt.balance_due ?? 0)}
              </div>
            </div>
            
            ${payments.length === 0 ? `
              <div class="no-payments">No payment history for this debt</div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payment Type</th>
                    <th>Reference #</th>
                    <th class="text-right">Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(p => `
                    <tr>
                      <td>${new Date(p.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td>${p.payment_type}</td>
                      <td>${p.reference_number || '—'}</td>
                      <td class="text-right">${usd(p.payment_amount)}</td>
                      <td>${p.notes || '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr class="debt-total">
                    <td colspan="3">Debt Total</td>
                    <td class="text-right">${usd(payments.reduce((s, p) => s + p.payment_amount, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            `}
          </div>
        `).join('')}
        
        <table>
          <tfoot>
            <tr class="grand-total">
              <td colspan="3">GRAND TOTAL (All Selected Debts)</td>
              <td class="text-right">${usd(grandTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl rounded-xl bg-white border border-gray-200 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Debt Payment History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {debtsWithPayments.length} debts selected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            >
              <Printer size={16} /> Print PDF
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">Loading payment histories...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {debtsWithPayments.map(({ debt, payments }) => {
                const debtTotal = payments.reduce((sum, p) => sum + p.payment_amount, 0);
                
                return (
                  <div key={debt.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {debt.origin} {debt.merchant ? `— ${debt.merchant}` : ''}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Owner: {debt.owner || 'N/A'} | Account: {debt.account_number || 'N/A'} | 
                            Current Balance: <span className="font-semibold">{usd(debt.current_due ?? debt.balance_due ?? 0)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Payments Made</p>
                          <p className="text-lg font-bold text-green-600">{usd(debtTotal)}</p>
                        </div>
                      </div>
                    </div>

                    {payments.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        No payment history for this debt
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-700">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-700">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-700">Reference</th>
                              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-700">Amount</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-700">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {payments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {new Date(payment.payment_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {payment.payment_type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{payment.reference_number || '—'}</td>
                                <td className="px-3 py-2 text-right font-semibold text-green-600">
                                  {usd(payment.payment_amount)}
                                </td>
                                <td className="px-3 py-2 text-gray-600 max-w-xs truncate text-xs">
                                  {payment.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Grand Total</p>
                    <p className="text-xs text-indigo-700 mt-1">Total payments across all selected debts</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">{usd(grandTotal)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarModal({
  date,
  debts,
  onClose,
  onMonthChange,
  onToday,
  getDebtsForDay,
  getDaysInMonth,
  getFirstDayOfMonth,
}: {
  date: Date;
  debts: Debt[];
  onClose: () => void;
  onMonthChange: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  getDebtsForDay: (day: number) => Debt[];
  getDaysInMonth: (date: Date) => number;
  getFirstDayOfMonth: (date: Date) => number;
}) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(date);
  const firstDay = getFirstDayOfMonth(date);
  const today = new Date();
  const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  const todayDate = today.getDate();

  const usd = (n: number | null) =>
    n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  // Create calendar grid
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg sm:text-2xl font-bold">Payment Schedule Calendar</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 hidden sm:block">View payment due dates for all debts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition shrink-0"
            title="Close"
          >
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-50">
          <button
            onClick={() => onMonthChange('prev')}
            className="px-2 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
          >
            <span className="hidden sm:inline">← Previous</span>
            <span className="sm:hidden">←</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-xl font-bold text-gray-900">
              {monthNames[date.getMonth()]} {date.getFullYear()}
            </h3>
            <button
              onClick={onToday}
              className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-medium"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => onMonthChange('next')}
            className="px-2 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
          >
            <span className="hidden sm:inline">Next →</span>
            <span className="sm:hidden">→</span>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="text-center font-bold text-gray-700 py-1 sm:py-2 bg-gray-100 rounded text-xs sm:text-sm">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="border border-gray-200 rounded-lg p-1 sm:p-2 bg-gray-50 min-h-[60px] sm:min-h-[120px]"></div>;
              }

              const debtsForDay = getDebtsForDay(day);
              const isToday = isCurrentMonth && day === todayDate;

              return (
                <div
                  key={day}
                  className={`border rounded-lg p-1 sm:p-2 min-h-[60px] sm:min-h-[120px] transition ${
                    isToday
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : debtsForDay.length > 0
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`text-xs sm:text-sm font-bold mb-1 sm:mb-2 ${
                    isToday ? 'text-blue-700' : debtsForDay.length > 0 ? 'text-orange-700' : 'text-gray-700'
                  }`}>
                    {day}
                    {isToday && <span className="ml-1 text-xs hidden sm:inline">(Today)</span>}
                  </div>

                  {debtsForDay.length > 0 && (
                    <div className="space-y-1">
                      {debtsForDay.slice(0, 2).map(debt => (
                        <div
                          key={debt.id}
                          className="text-xs bg-white border border-orange-200 rounded p-1 sm:p-1.5 hover:shadow-sm transition"
                        >
                          <div className="font-semibold text-gray-800 truncate text-[10px] sm:text-xs" title={debt.origin}>
                            {debt.origin}
                          </div>
                          <div className="text-gray-600 truncate text-[10px] sm:text-xs hidden sm:block" title={debt.collector || 'No collector'}>
                            {debt.collector || 'No collector'}
                          </div>
                          <div className="font-bold text-orange-600 mt-0.5 text-[10px] sm:text-xs">
                            {usd(debt.monthly_payment)}
                          </div>
                          <div className="text-gray-500 text-[10px] sm:text-xs hidden sm:block">
                            {debt.owner || '—'}
                          </div>
                        </div>
                      ))}
                      {debtsForDay.length > 2 && (
                        <div className="text-[10px] sm:text-xs text-gray-500 text-center">
                          +{debtsForDay.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with legend */}
        <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-500 bg-blue-50 rounded"></div>
                <span className="text-gray-700">Today</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-orange-300 bg-orange-50 rounded"></div>
                <span className="text-gray-700">Payment Due</span>
              </div>
              <div className="text-gray-600">
                Total: <strong>{debts.filter(d => d.payment_due_day).length}</strong>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700 transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
