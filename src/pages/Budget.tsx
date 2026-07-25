import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Printer, FileDown, ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  listBudgetTransactions,
  createBudgetTransaction,
  updateBudgetTransaction,
  deleteBudgetTransaction,
} from '../lib/budget';
import type { BudgetTransaction, BudgetTransactionInput } from '../lib/types';

const EMPTY: BudgetTransactionInput = {
  transaction: null,
  category: null,
  description: null,
  amount: null,
  transaction_dt: null,
  reference_number: null,
  notes: null,
};

const EXPENSE_CATEGORIES = {
  '🏠 Housing': ['Rent/Mortgage', 'HOA Fees', 'Property Taxes', 'Home Insurance', 'Home Maintenance & Repairs', 'Furniture', 'Appliances'],
  '⚡ Utilities': ['Electricity', 'Water', 'Gas', 'Sewer/Trash', 'Internet', 'Mobile Phone', 'Cable/Streaming'],
  '🍽️ Food & Dining': ['Groceries', 'Restaurants', 'Fast Food', 'Coffee & Snacks', 'Food Delivery'],
  '🚗 Transportation': ['Car Payment', 'Gas/Fuel', 'Auto Insurance', 'Vehicle Maintenance', 'Registration', 'Parking', 'Tolls', 'Public Transportation', 'Uber/Lyft'],
  '💳 Debt Payments': ['Credit Card Payments', 'Personal Loans', 'Student Loans', 'Medical Debt', 'Buy Now, Pay Later (Affirm, Klarna, etc.)'],
  '💊 Healthcare': ['Health Insurance', 'Doctor Visits', 'Dental', 'Vision', 'Prescriptions', 'Medical Supplies'],
  '🎰 Gambling / Casino': ['Casino Buy-ins', 'Sports Betting', 'Lottery Tickets', 'Gambling Wins', 'Gambling Losses', 'Tournament Fees'],
  '🛍️ Shopping': ['Clothing', 'Shoes', 'Electronics', 'Household Items', 'Gifts', 'Amazon Purchases'],
  '🎉 Entertainment': ['Movies', 'Concerts', 'Hobbies', 'Video Games', 'Books', 'Events'],
  '✈️ Travel': ['Flights', 'Hotels', 'Car Rental', 'Vacation Activities', 'Travel Insurance'],
  '🐶 Pets': ['Pet Food', 'Vet', 'Grooming', 'Pet Insurance', 'Supplies'],
  '👨‍👩‍👧 Family': ['Childcare', 'School Expenses', 'Allowance', 'Elder Care', 'Family Support'],
  '📚 Education': ['Tuition', 'Certifications', 'Online Courses', 'Books', 'Software'],
  '💼 Work': ['Office Supplies', 'Software Subscriptions', 'Professional Memberships', 'Business Travel', 'Continuing Education'],
  '📱 Subscriptions': ['Netflix', 'Spotify', 'ChatGPT', 'Microsoft 365', 'Adobe', 'Cloud Storage', 'Other Apps'],
  '🎁 Donations & Gifts': ['Charity', 'Church Tithes', 'Special Occasions', 'Holiday Gifts'],
  '💰 Savings & Investments': ['Emergency Fund', 'Retirement', 'Brokerage Investments', 'High-Yield Savings', 'Crypto', 'CDs'],
  '🏦 Taxes & Fees': ['Income Taxes', 'Bank Fees', 'Credit Card Fees', 'Late Fees', 'Government Fees'],
  '🛡️ Insurance': ['Life Insurance', 'Auto Insurance', 'Health Insurance', 'Home/Renters Insurance', 'Umbrella Insurance'],
  '🏡 Home Improvement': ['Renovations', 'Garden', 'Tools', 'Cleaning Supplies'],
  '💅 Personal Care': ['Haircuts', 'Salon', 'Spa', 'Cosmetics', 'Gym Membership', 'Massage'],
  '💼 Miscellaneous': ['Cash Withdrawals', 'Unexpected Expenses', 'Lost Items', 'Uncategorized'],
};

const INCOME_CATEGORIES = {
  '💼 Employment Income': ['Salary/Wages', 'Overtime', 'Bonuses', 'Commissions', 'Tips', 'Holiday Pay', 'Severance Pay'],
  '🧾 Self-Employment / Business': ['Business Revenue', 'Freelance Income', 'Consulting', 'Side Hustle', 'Contract Work'],
  '💵 Investment Income': ['Dividends', 'Interest Income', 'Capital Gains', 'Rental Income', 'REIT Distributions', 'Cryptocurrency Gains'],
  '🎰 Gambling & Gaming': ['Casino Wins', 'Sports Betting Wins', 'Poker Winnings', 'Lottery Winnings', 'Sweepstakes/Prizes'],
  '💳 Refunds & Reimbursements': ['Tax Refund', 'Insurance Reimbursement', 'Medical Reimbursement', 'Expense Reimbursement', 'Store Refunds', 'Cashback Rewards'],
  '🏛️ Government Benefits': ['Social Security', 'SSI', 'Unemployment Benefits', 'Disability Benefits', 'Veterans Benefits', 'SNAP', 'Tax Credits'],
  '👨‍👩‍👧 Family & Personal': ['Gifts Received', 'Allowance', 'Child Support Received', 'Alimony Received', 'Inheritance'],
  '🏦 Financial Transfers': ['Transfer from Savings', 'Transfer from Investment Account', 'Credit Card Cashback', 'Loan Proceeds', 'Loan Repayment Received'],
  '📈 Asset Sales': ['Vehicle Sale', 'Property Sale', 'Furniture Sale', 'Electronics Sale', 'Other Personal Item Sales'],
  '🌐 Other Income': ['Royalties', 'Affiliate Income', 'Referral Bonuses', 'Royalties/Licensing', 'Miscellaneous Income'],
};

const usd = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function Budget() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetTransactionInput>(EMPTY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    transactionType: '',
    category: '',
  });

  // Sorting state
  const [sortField, setSortField] = useState<keyof BudgetTransaction | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('budgetColumnWidths');
    return saved ? JSON.parse(saved) : {
      checkbox: 50,
      actions: 120,
      transaction: 150,
      category: 150,
      description: 250,
      amount: 120,
      transaction_dt: 120,
      reference_number: 150,
      notes: 200,
    };
  });

  async function refresh() {
    setLoading(true);
    try {
      setTransactions(await listBudgetTransactions());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load budget transactions');
    } finally {
      setLoading(false);
    }
  }

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem('budgetColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle column sorting
  const handleSort = (field: keyof BudgetTransaction) => {
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

      // Transaction type filter
      if (filters.transactionType && t.transaction) {
        if (t.transaction.toLowerCase() !== filters.transactionType.toLowerCase()) return false;
      }

      // Category filter
      if (filters.category && t.category) {
        if (t.category !== filters.category) return false;
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

  const openEdit = (t: BudgetTransaction) => {
    setEditingId(t.id);
    setForm({
      transaction: t.transaction,
      category: t.category,
      description: t.description,
      amount: t.amount,
      transaction_dt: t.transaction_dt,
      reference_number: t.reference_number,
      notes: t.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await updateBudgetTransaction(editingId, form);
        toast.success('Transaction updated!');
      } else {
        await createBudgetTransaction(form);
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
      await deleteBudgetTransaction(id);
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
        <title>Budget Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Budget Transactions Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Reference #</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${selectedTransactions.map(t => `
              <tr>
                <td>${t.transaction ?? '—'}</td>
                <td>${t.category ?? '—'}</td>
                <td>${t.description ?? '—'}</td>
                <td class="text-right">${usd(t.amount)}</td>
                <td>${t.transaction_dt ?? '—'}</td>
                <td>${t.reference_number ?? '—'}</td>
                <td>${t.notes ?? '—'}</td>
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
      'Transaction', 'Category', 'Description', 'Amount', 'Date', 'Reference Number', 'Notes'
    ];

    const rows = selectedTransactions.map(t => [
      t.transaction ?? '',
      t.category ?? '',
      t.description ?? '',
      t.amount ?? '',
      t.transaction_dt ?? '',
      t.reference_number ?? '',
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
    link.setAttribute('download', `budget-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported to CSV');
  };

  const exportToPDF = () => {
    const selectedTransactions = selectedIds.size > 0
      ? transactions.filter(t => selectedIds.has(t.id))
      : transactions;

    if (selectedTransactions.length === 0) {
      toast.error('No records to export');
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
        <title>Budget Transactions - PDF Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #4CAF50; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .text-right { text-align: right; }
          @media print {
            @page { margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        <h1>Budget Transactions Report</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Reference #</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${selectedTransactions.map(t => `
              <tr>
                <td>${t.transaction ?? '—'}</td>
                <td>${t.category ?? '—'}</td>
                <td>${t.description ?? '—'}</td>
                <td class="text-right">${usd(t.amount)}</td>
                <td>${t.transaction_dt ?? '—'}</td>
                <td>${t.reference_number ?? '—'}</td>
                <td>${t.notes ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Budget Transactions</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">{transactions.length} transactions</p>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 sm:px-4 py-2 text-sm font-medium text-white transition shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
              <span className="text-xs sm:text-sm text-indigo-900 font-medium">
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
            <button
              onClick={exportToPDF}
              disabled={transactions.length === 0}
              className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={14} /> <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={filters.transactionType}
                onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="">All Types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="">All Categories</option>
                {[...new Set(transactions.map(t => t.category).filter(Boolean))].sort().map(cat => (
                  <option key={cat} value={cat!}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedTransactions.length} of {transactions.length} transactions
            </p>
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', transactionType: '', category: '' })}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] relative">
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
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.transaction }} onClick={() => handleSort('transaction')}>
                    <div className="flex items-center justify-between">
                      <span>Transaction</span>
                      {sortField === 'transaction' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('transaction', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.category }} onClick={() => handleSort('category')}>
                    <div className="flex items-center justify-between">
                      <span>Category</span>
                      {sortField === 'category' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('category', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.description }} onClick={() => handleSort('description')}>
                    <div className="flex items-center justify-between">
                      <span>Description</span>
                      {sortField === 'description' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('description', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.amount }} onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-between">
                      <span>Amount</span>
                      {sortField === 'amount' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('amount', e); }}
                    />
                  </th>
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.transaction_dt }} onClick={() => handleSort('transaction_dt')}>
                    <div className="flex items-center justify-between">
                      <span>Date</span>
                      {sortField === 'transaction_dt' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('transaction_dt', e); }}
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
                  <th className="px-3 py-3 bg-gray-100 relative cursor-pointer hover:bg-gray-200 transition" style={{ width: columnWidths.notes }} onClick={() => handleSort('notes')}>
                    <div className="flex items-center justify-between">
                      <span>Notes</span>
                      {sortField === 'notes' ? (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition"
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('notes', e); }}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredAndSortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No budget transactions found. Click "Add Transaction" to get started.
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
                      <td className="px-3 py-2 text-gray-700">{t.transaction ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{t.category ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{t.description ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold text-right">{usd(t.amount)}</td>
                      <td className="px-3 py-2 text-gray-700">{t.transaction_dt ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{t.reference_number ?? '—'}</td>
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
              No budget transactions found. Click "Add Transaction" to get started.
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
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          t.transaction === 'Income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {t.transaction ?? '—'}
                        </span>
                        {t.category && (
                          <span className="text-xs text-gray-600">{t.category}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-base">{t.description ?? 'No description'}</h3>
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
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Amount:</span>
                    <span className={`text-lg font-bold ${
                      t.transaction === 'Income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {usd(t.amount)}
                    </span>
                  </div>

                  {t.transaction_dt && (
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Date:</span>
                      <span className="text-gray-900">{t.transaction_dt}</span>
                    </div>
                  )}

                  {t.reference_number && (
                    <div className="flex items-start">
                      <span className="text-gray-600 font-medium w-24 shrink-0">Reference:</span>
                      <span className="text-gray-900 font-mono text-xs">{t.reference_number}</span>
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
          <BudgetModal
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

function BudgetModal({
  form,
  editing,
  saving,
  onField,
  onClose,
  onSave,
}: {
  form: BudgetTransactionInput;
  editing: boolean;
  saving: boolean;
  onField: (field: keyof BudgetTransactionInput, value: string | number | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [showCustomDescription, setShowCustomDescription] = useState(false);

  // Get available category groups based on transaction type
  const categoryGroups = form.transaction === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Get the main category names (without emoji prefix for storage)
  const mainCategories = Object.keys(categoryGroups);

  // Get subcategories (descriptions) based on selected category
  const getSubcategories = (): string[] => {
    if (!form.category) return [];

    // Find the category group that matches the selected category
    const matchingGroup = Object.entries(categoryGroups).find(
      ([group]) => group === form.category || group.includes(form.category)
    );

    return matchingGroup ? matchingGroup[1] : [];
  };

  const subcategories = getSubcategories();

  // Handle category change
  const handleCategoryChange = (value: string) => {
    onField('category', value || null);
    // Reset description when category changes
    onField('description', null);
    setShowCustomDescription(false);
  };

  // Handle description change
  const handleDescriptionChange = (value: string) => {
    if (value === 'Other') {
      setShowCustomDescription(true);
      onField('description', null);
    } else {
      setShowCustomDescription(false);
      onField('description', value || null);
    }
  };

  // Handle transaction type change
  const handleTransactionChange = (value: string) => {
    onField('transaction', value || null);
    // Reset category and description when transaction type changes
    onField('category', null);
    onField('description', null);
    setShowCustomDescription(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-indigo-600 text-white">
          <h2 className="text-lg sm:text-2xl font-bold">
            {editing ? 'Edit Transaction' : 'Add Transaction'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.transaction ?? ''}
                onChange={(e) => handleTransactionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select Type</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category ?? ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={!form.transaction}
                required
              >
                <option value="">
                  {!form.transaction ? 'Select transaction type first' : 'Select Category'}
                </option>
                {form.transaction && mainCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Subcategory) <span className="text-red-500">*</span>
              </label>
              {showCustomDescription ? (
                <input
                  type="text"
                  value={form.description ?? ''}
                  onChange={(e) => onField('description', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter custom description"
                  required
                />
              ) : (
                <select
                  value={form.description ?? ''}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={!form.category}
                  required
                >
                  <option value="">
                    {!form.category ? 'Select category first' : 'Select Description'}
                  </option>
                  {subcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  {form.category && <option value="Other">Other (Custom)</option>}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.amount ?? ''}
                onChange={(e) => onField('amount', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.transaction_dt ?? ''}
                onChange={(e) => onField('transaction_dt', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={form.reference_number ?? ''}
                onChange={(e) => onField('reference_number', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Optional reference number"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base"
                placeholder="Additional notes (optional)"
              />
            </div>
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
            disabled={saving}
            className="px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-50 text-sm sm:text-base"
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
