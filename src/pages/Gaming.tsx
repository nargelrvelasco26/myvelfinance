import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, FileDown, ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  listGamingTransactions,
  createGamingTransaction,
  updateGamingTransaction,
  deleteGamingTransaction,
} from '../lib/gaming';
import type { GamingTransaction, GamingTransactionInput } from '../lib/types';

const EMPTY: GamingTransactionInput = {
  transaction_ref: null,
  type_of_wager: null,
  gross_winnings: null,
  federal_income_tax_withheld: null,
  transaction_dt: null,
  transaction_number: null,
  race: null,
  cashier: null,
  window_number: null,
  payer_name: null,
  payer_address: null,
  payer_city: null,
  payer_state: null,
  payer_zipcode: null,
  payer_federal_id_number: null,
  payer_telephone: null,
  winner_name: null,
  winner_address: null,
  winner_city: null,
  winner_state: null,
  winner_zipcode: null,
  winner_tin_last4: null,
  first_id: null,
  second_id: null,
  state: null,
  state_id_number: null,
  state_winnings: null,
  state_income_tax_withheld: null,
  total_amount: null,
  notes: null,
};

const usd = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function Gaming() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<GamingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GamingTransactionInput>(EMPTY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    transactionRef: '',
  });

  // Sorting state
  const [sortField, setSortField] = useState<keyof GamingTransaction | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('gamingColumnWidths');
    return saved ? JSON.parse(saved) : {
      checkbox: 50,
      actions: 120,
      transaction_ref: 150,
      type_of_wager: 150,
      gross_winnings: 130,
      total_amount: 130,
      transaction_dt: 120,
      payer_name: 200,
      winner_name: 200,
      notes: 200,
    };
  });

  async function refresh() {
    setLoading(true);
    try {
      setTransactions(await listGamingTransactions());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load gaming transactions');
    } finally {
      setLoading(false);
    }
  }

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem('gamingColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle column sorting
  const handleSort = (field: keyof GamingTransaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    // First apply filters
    let filtered = transactions.filter(t => {
      // Date range filter
      if (filters.startDate && t.transaction_dt) {
        if (t.transaction_dt < filters.startDate) return false;
      }
      if (filters.endDate && t.transaction_dt) {
        if (t.transaction_dt > filters.endDate) return false;
      }

      // Transaction ref filter (Win/Loss)
      if (filters.transactionRef && t.transaction_ref) {
        if (!t.transaction_ref.toLowerCase().includes(filters.transactionRef.toLowerCase())) return false;
      }

      return true;
    });

    // Then apply sorting
    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [transactions, filters, sortField, sortDirection]);

  // Handle column resizing
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

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (t: GamingTransaction) => {
    setEditingId(t.id);
    setForm({
      transaction_ref: t.transaction_ref,
      type_of_wager: t.type_of_wager,
      gross_winnings: t.gross_winnings,
      federal_income_tax_withheld: t.federal_income_tax_withheld,
      transaction_dt: t.transaction_dt,
      transaction_number: t.transaction_number,
      race: t.race,
      cashier: t.cashier,
      window_number: t.window_number,
      payer_name: t.payer_name,
      payer_address: t.payer_address,
      payer_city: t.payer_city,
      payer_state: t.payer_state,
      payer_zipcode: t.payer_zipcode,
      payer_federal_id_number: t.payer_federal_id_number,
      payer_telephone: t.payer_telephone,
      winner_name: t.winner_name,
      winner_address: t.winner_address,
      winner_city: t.winner_city,
      winner_state: t.winner_state,
      winner_zipcode: t.winner_zipcode,
      winner_tin_last4: t.winner_tin_last4,
      first_id: t.first_id,
      second_id: t.second_id,
      state: t.state,
      state_id_number: t.state_id_number,
      state_winnings: t.state_winnings,
      state_income_tax_withheld: t.state_income_tax_withheld,
      total_amount: t.total_amount,
      notes: t.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await updateGamingTransaction(editingId, form);
        toast.success('Transaction updated!');
      } else {
        await createGamingTransaction(form);
        toast.success('Transaction added!');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteGamingTransaction(id);
      toast.success('Transaction deleted!');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
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

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handlePrint = () => {
    const selectedTransactions = selectedIds.size > 0
      ? transactions.filter(t => selectedIds.has(t.id))
      : transactions;

    if (selectedTransactions.length === 0) {
      toast.error('No records to print');
      return;
    }

    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gaming Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #9333ea; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h1>Gaming Transactions Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Transaction Ref</th>
              <th>Type of Wager</th>
              <th>Gross Winnings</th>
              <th>Total Amount</th>
              <th>Date</th>
              <th>Payer</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            ${selectedTransactions.map(t => `
              <tr>
                <td>${t.transaction_ref ?? '—'}</td>
                <td>${t.type_of_wager ?? '—'}</td>
                <td class="text-right">${usd(t.gross_winnings)}</td>
                <td class="text-right">${usd(t.total_amount)}</td>
                <td>${t.transaction_dt ?? '—'}</td>
                <td>${t.payer_name ?? '—'}</td>
                <td>${t.winner_name ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
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
    const selectedTransactions = selectedIds.size > 0
      ? transactions.filter(t => selectedIds.has(t.id))
      : transactions;

    if (selectedTransactions.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = [
      'Transaction Ref', 'Type of Wager', 'Gross Winnings', 'Total Amount', 'Federal Tax Withheld',
      'Date', 'Payer Name', 'Winner Name', 'Notes'
    ];

    const rows = selectedTransactions.map(t => [
      t.transaction_ref ?? '',
      t.type_of_wager ?? '',
      t.gross_winnings ?? '',
      t.total_amount ?? '',
      t.federal_income_tax_withheld ?? '',
      t.transaction_dt ?? '',
      t.payer_name ?? '',
      t.winner_name ?? '',
      t.notes ?? ''
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
    link.setAttribute('download', `gaming-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported to CSV');
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gaming Transactions</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">{transactions.length} transactions</p>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 sm:px-4 py-2 text-sm font-medium text-white transition shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs sm:text-sm text-purple-900 font-medium">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={transactions.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-gray-200 hover:bg-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={14} /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={transactions.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={14} /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Win/Loss Filter
              </label>
              <select
                value={filters.transactionRef}
                onChange={(e) => setFilters(prev => ({ ...prev, transactionRef: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="">All Transactions</option>
                <option value="Win">Wins Only</option>
                <option value="Loss">Losses Only</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedTransactions.length} of {transactions.length} transactions
            </p>
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', transactionRef: '' })}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] relative">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-3 bg-gray-100 text-left" style={{ width: columnWidths.checkbox }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === transactions.length && transactions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 text-left" style={{ width: columnWidths.actions }}>
                    Actions
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.transaction_ref }} onClick={() => handleSort('transaction_ref')}>
                    <div className="flex items-center justify-between">
                      <span>Transaction Ref</span>
                      {sortField === 'transaction_ref' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('transaction_ref', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.type_of_wager }} onClick={() => handleSort('type_of_wager')}>
                    <div className="flex items-center justify-between">
                      <span>Type of Wager</span>
                      {sortField === 'type_of_wager' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('type_of_wager', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.gross_winnings }} onClick={() => handleSort('gross_winnings')}>
                    <div className="flex items-center justify-between">
                      <span>Gross Winnings</span>
                      {sortField === 'gross_winnings' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('gross_winnings', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.total_amount }} onClick={() => handleSort('total_amount')}>
                    <div className="flex items-center justify-between">
                      <span>Total Amount</span>
                      {sortField === 'total_amount' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('total_amount', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.transaction_dt }} onClick={() => handleSort('transaction_dt')}>
                    <div className="flex items-center justify-between">
                      <span>Date</span>
                      {sortField === 'transaction_dt' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('transaction_dt', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.payer_name }} onClick={() => handleSort('payer_name')}>
                    <div className="flex items-center justify-between">
                      <span>Payer</span>
                      {sortField === 'payer_name' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('payer_name', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.winner_name }} onClick={() => handleSort('winner_name')}>
                    <div className="flex items-center justify-between">
                      <span>Winner</span>
                      {sortField === 'winner_name' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('winner_name', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative" style={{ width: columnWidths.notes }}>
                    <span>Notes</span>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('notes', e); }}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredAndSortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No gaming transactions found. Click "Add Transaction" to get started.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTransactions.map((t, index) => (
                    <tr key={t.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1 hover:bg-blue-100 rounded transition"
                            title="Edit"
                          >
                            <Pencil size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1 hover:bg-red-100 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          t.transaction_ref?.toLowerCase().includes('win')
                            ? 'bg-green-100 text-green-800'
                            : t.transaction_ref?.toLowerCase().includes('loss')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {t.transaction_ref ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{t.type_of_wager ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold text-right">{usd(t.gross_winnings)}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold text-right">{usd(t.total_amount)}</td>
                      <td className="px-3 py-2 text-gray-700">{t.transaction_dt ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{t.payer_name ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{t.winner_name ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{t.notes ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              Loading...
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              No gaming transactions found. Click "Add Transaction" to get started.
            </div>
          ) : (
            filteredAndSortedTransactions.map((t) => (
              <div key={t.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          t.transaction_ref?.toLowerCase().includes('win')
                            ? 'bg-green-100 text-green-800'
                            : t.transaction_ref?.toLowerCase().includes('loss')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {t.transaction_ref ?? '—'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-base">{t.type_of_wager ?? 'No wager type'}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-2 rounded text-blue-600 hover:bg-blue-50 transition"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
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
                      <span className="text-gray-600 font-medium">Gross Winnings:</span>
                      <p className={`text-base font-bold ${
                        t.transaction_ref?.toLowerCase().includes('win') ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {usd(t.gross_winnings)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Total Amount:</span>
                      <p className="text-base font-semibold text-gray-900">{usd(t.total_amount)}</p>
                    </div>
                  </div>

                  {t.transaction_dt && (
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Date:</span>
                      <span className="text-gray-900">{t.transaction_dt}</span>
                    </div>
                  )}

                  {t.payer_name && (
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Payer:</span>
                      <span className="text-gray-900">{t.payer_name}</span>
                    </div>
                  )}

                  {t.winner_name && (
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Winner:</span>
                      <span className="text-gray-900">{t.winner_name}</span>
                    </div>
                  )}

                  {t.notes && (
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Notes:</span>
                      <span className="text-gray-700 text-xs">{t.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {modalOpen && (
          <GamingModal
            form={form}
            editing={editingId !== null}
            saving={saving}
            onField={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}

function GamingModal({
  form,
  editing,
  saving,
  onField,
  onClose,
  onSave,
}: {
  form: GamingTransactionInput;
  editing: boolean;
  saving: boolean;
  onField: (field: keyof GamingTransactionInput, value: string | number | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isWin = form.transaction_ref === 'Win';
  const isLoss = form.transaction_ref === 'Loss';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-purple-600 text-white">
          <h2 className="text-lg sm:text-2xl font-bold">
            {editing ? 'Edit Gaming Transaction' : 'Add Gaming Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition shrink-0"
          >
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Transaction Type - Always Shown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.transaction_ref ?? ''}
                onChange={(e) => onField('transaction_ref', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Select Win or Loss</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
              </select>
            </div>

            {/* Loss Form - Simple */}
            {isLoss && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Loss Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.transaction_dt ?? ''}
                      onChange={(e) => onField('transaction_dt', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Wager <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.type_of_wager ?? ''}
                      onChange={(e) => onField('type_of_wager', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Slot Machine, Sports Bet"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount (Loss) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.total_amount ?? ''}
                      onChange={(e) => onField('total_amount', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={form.notes ?? ''}
                      onChange={(e) => onField('notes', e.target.value || null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                      placeholder="Additional notes (optional)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Win Form - Full W-2G Details */}
            {isWin && (
              <div className="space-y-6">
                {/* Basic Win Information */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Win Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gross Winnings (Box 1) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.gross_winnings}
                        onChange={(e) => onField('gross_winnings', e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transaction Date (Box 2)
                      </label>
                      <input
                        type="date"
                        value={form.transaction_dt ?? ''}
                        onChange={(e) => onField('transaction_dt', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type of Wager (Box 3)
                      </label>
                      <input
                        type="text"
                        value={form.type_of_wager ?? ''}
                        onChange={(e) => onField('type_of_wager', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Federal Tax Withheld (Box 4)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.federal_income_tax_withheld}
                        onChange={(e) => onField('federal_income_tax_withheld', e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transaction Number (Box 5)
                      </label>
                      <input
                        type="text"
                        value={form.transaction_number ?? ''}
                        onChange={(e) => onField('transaction_number', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Race (Box 6)
                      </label>
                      <input
                        type="text"
                        value={form.race ?? ''}
                        onChange={(e) => onField('race', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cashier (Box 8)
                      </label>
                      <input
                        type="text"
                        value={form.cashier ?? ''}
                        onChange={(e) => onField('cashier', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Window Number (Box 10)
                      </label>
                      <input
                        type="text"
                        value={form.window_number ?? ''}
                        onChange={(e) => onField('window_number', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Payer Information */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Payer Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payer Name
                      </label>
                      <input
                        type="text"
                        value={form.payer_name ?? ''}
                        onChange={(e) => onField('payer_name', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payer Address
                      </label>
                      <input
                        type="text"
                        value={form.payer_address ?? ''}
                        onChange={(e) => onField('payer_address', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={form.payer_city ?? ''}
                        onChange={(e) => onField('payer_city', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.payer_state ?? ''}
                        onChange={(e) => onField('payer_state', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="CA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zipcode
                      </label>
                      <input
                        type="text"
                        value={form.payer_zipcode ?? ''}
                        onChange={(e) => onField('payer_zipcode', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Federal ID Number
                      </label>
                      <input
                        type="text"
                        value={form.payer_federal_id_number ?? ''}
                        onChange={(e) => onField('payer_federal_id_number', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telephone
                      </label>
                      <input
                        type="text"
                        value={form.payer_telephone ?? ''}
                        onChange={(e) => onField('payer_telephone', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Winner Information */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Winner Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Winner Name
                      </label>
                      <input
                        type="text"
                        value={form.winner_name ?? ''}
                        onChange={(e) => onField('winner_name', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Winner Address
                      </label>
                      <input
                        type="text"
                        value={form.winner_address ?? ''}
                        onChange={(e) => onField('winner_address', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={form.winner_city ?? ''}
                        onChange={(e) => onField('winner_city', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.winner_state ?? ''}
                        onChange={(e) => onField('winner_state', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="CA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zipcode
                      </label>
                      <input
                        type="text"
                        value={form.winner_zipcode ?? ''}
                        onChange={(e) => onField('winner_zipcode', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TIN Last 4 (Box 9)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={form.winner_tin_last4 ?? ''}
                        onChange={(e) => onField('winner_tin_last4', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First ID (Box 11)
                      </label>
                      <input
                        type="text"
                        value={form.first_id ?? ''}
                        onChange={(e) => onField('first_id', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Second ID (Box 12)
                      </label>
                      <input
                        type="text"
                        value={form.second_id ?? ''}
                        onChange={(e) => onField('second_id', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* State Information */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">State Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State (Box 13)
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.state ?? ''}
                        onChange={(e) => onField('state', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State ID Number (Box 13)
                      </label>
                      <input
                        type="text"
                        value={form.state_id_number ?? ''}
                        onChange={(e) => onField('state_id_number', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State Winnings (Box 14)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.state_winnings ?? ''}
                        onChange={(e) => onField('state_winnings', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State Tax Withheld (Box 15)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.state_income_tax_withheld}
                        onChange={(e) => onField('state_income_tax_withheld', e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={form.notes ?? ''}
                    onChange={(e) => onField('notes', e.target.value || null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 sm:px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition disabled:opacity-50 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.transaction_ref}
            className="px-3 sm:px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition disabled:opacity-50 text-sm sm:text-base"
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
