import { useState, useEffect, useMemo } from 'react'
import { TrendingDown, ArrowRight, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Debt } from '../lib/types'

export default function DebtMonitoringPanel() {
  const navigate = useNavigate()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from('debt_monitoring')
      .select('*')
      .order('owner', { ascending: true })

    if (!error && data) {
      setDebts(data)
    }
    setLoading(false)
  }

  const summary = useMemo(() => {
    const totalDebt = debts.reduce((sum, d) => sum + (d.current_due ?? d.balance_due ?? 0), 0)
    const byOwner = debts.reduce((acc, d) => {
      const owner = d.owner || 'Unknown'
      if (!acc[owner]) {
        acc[owner] = { total: 0, count: 0 }
      }
      acc[owner].total += d.current_due ?? d.balance_due ?? 0
      acc[owner].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    return { totalDebt, byOwner, accountCount: debts.length }
  }, [debts])

  const usd = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <div
      onClick={() => navigate('/debt-monitoring')}
      className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition">
            <TrendingDown className="text-red-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Debt Monitoring</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-300">Loading...</p>
        </div>
      ) : debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 p-4 bg-white/5 rounded-full">
            <TrendingDown className="text-red-400" size={48} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Track Your Debts</h3>
          <p className="text-slate-300 text-center mb-6 max-w-xs">
            Monitor all your debt accounts in one place with detailed tracking and reporting.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition group-hover:scale-105">
            Get Started
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-red-400" size={20} />
              <p className="text-sm text-slate-300">Total Debt</p>
            </div>
            <p className="text-3xl font-bold text-white">{usd(summary.totalDebt)}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.accountCount} accounts</p>
          </div>

          {Object.keys(summary.byOwner).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">By Owner</p>
              {Object.entries(summary.byOwner)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([owner, data]) => (
                  <div
                    key={owner}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div>
                      <p className="text-white font-semibold">{owner}</p>
                      <p className="text-xs text-slate-400">{data.count} accounts</p>
                    </div>
                    <p className="text-lg font-bold text-red-400">{usd(data.total)}</p>
                  </div>
                ))}
            </div>
          )}

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 rounded-lg text-indigo-300 font-semibold text-sm transition group-hover:scale-105 w-full justify-center">
              View Details
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
