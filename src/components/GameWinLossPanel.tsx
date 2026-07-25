import { useState, useEffect, useMemo } from 'react'
import { Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listGamingTransactionsByMonth } from '../lib/gaming'
import type { GamingTransaction } from '../lib/types'

export default function GameWinLossPanel() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<GamingTransaction[]>([])
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
      const data = await listGamingTransactionsByMonth(selectedYear, selectedMonth)
      setTransactions(data)
    } catch (err) {
      console.error('Failed to load gaming transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Navigate to previous month
  const goToPreviousMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  // Navigate to next month
  const goToNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // Calculate Win/Loss based on transaction_ref
  const summary = useMemo(() => {
    const monthDate = new Date(selectedYear, selectedMonth - 1)
    const displayMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Wins: transaction_ref contains "Win" (case insensitive)
    const wins = transactions.filter(t =>
      t.transaction_ref?.toLowerCase().includes('win')
    )
    const totalWins = wins.reduce((sum, t) => sum + (t.gross_winnings || 0), 0)

    // Losses: transaction_ref contains "Loss" (case insensitive)
    // Use total_amount for losses instead of gross_winnings
    const losses = transactions.filter(t =>
      t.transaction_ref?.toLowerCase().includes('loss')
    )
    const totalLosses = losses.reduce((sum, t) => sum + (t.total_amount || 0), 0)

    const netProfit = totalWins - totalLosses

    return { displayMonth, totalWins, totalLosses, netProfit, winCount: wins.length, lossCount: losses.length }
  }, [transactions, selectedMonth, selectedYear])

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Gamepad2 className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Game Win/Loss</h2>
          </div>
        </div>
        <button
          onClick={() => navigate('/gaming')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition text-sm"
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
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-xs text-slate-300 mb-1">Wins</p>
            <p className="text-2xl font-bold text-white">${summary.totalWins.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.winCount} transactions</p>
          </div>
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
            <p className="text-xs text-slate-300 mb-1">Losses</p>
            <p className="text-2xl font-bold text-white">${summary.totalLosses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.lossCount} transactions</p>
          </div>
          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <p className="text-xs text-slate-300 mb-1">Net Profit/Loss</p>
            <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.netProfit >= 0 ? '+' : ''}${summary.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
