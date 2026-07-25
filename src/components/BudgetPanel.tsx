import { useState, useEffect, useMemo } from 'react'
import { Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listBudgetTransactionsByMonth } from '../lib/budget'
import type { BudgetTransaction } from '../lib/types'

export default function BudgetPanel() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Initialize with current month/year
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1) // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    fetchTransactions()
  }, [selectedMonth, selectedYear])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const data = await listBudgetTransactionsByMonth(selectedYear, selectedMonth)
      setTransactions(data)
    } catch (err) {
      console.error('Failed to load budget transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Navigate to previous month
  const goToPreviousMonth = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to budget page
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  // Navigate to next month
  const goToNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to budget page
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // Calculate Spent, Income, and Savings for selected month
  // Transactions are already filtered by the query
  const summary = useMemo(() => {
    const monthDate = new Date(selectedYear, selectedMonth - 1)
    const displayMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const spent = transactions
      .filter(t => t.transaction?.toLowerCase() === 'expense')
      .reduce((sum, t) => sum + (t.amount ?? 0), 0)

    const income = transactions
      .filter(t => t.transaction?.toLowerCase() === 'income')
      .reduce((sum, t) => sum + (t.amount ?? 0), 0)

    const savings = income - spent

    return { displayMonth, spent, income, savings }
  }, [transactions, selectedMonth, selectedYear])

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Wallet className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Budget</h2>
          </div>
        </div>
        <button
          onClick={() => navigate('/budget')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
        >
          View Details
        </button>
      </div>

      {/* Month/Year Picker */}
      <div className="flex items-center justify-center gap-2 mb-6 bg-white/5 rounded-lg p-2">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition"
          title="Previous Month"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-white">{summary.displayMonth}</p>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition"
          title="Next Month"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-8">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
            <p className="text-xs text-slate-300 mb-1">Spent</p>
            <p className="text-2xl font-bold text-white">${summary.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-xs text-slate-300 mb-1">Income</p>
            <p className="text-2xl font-bold text-white">${summary.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-xs text-slate-300 mb-1">Savings</p>
            <p className={`text-2xl font-bold ${summary.savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${summary.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <p className="text-slate-400 text-center mt-4 text-sm">Click to add transactions</p>
      )}
    </div>
  )
}
