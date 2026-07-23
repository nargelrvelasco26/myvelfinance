import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Wallet, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Budget {
  id: string
  category: string
  allocated: number
  spent: number
  month: string
  created_at: string
}

interface BudgetPanelProps {
  userId: string
}

export default function BudgetPanel({ userId }: BudgetPanelProps) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBudget, setNewBudget] = useState({
    category: '',
    allocated: '',
    spent: '',
    month: new Date().toISOString().slice(0, 7),
  })

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setBudgets(data)
    }
    setLoading(false)
  }

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('budgets').insert([
      {
        user_id: userId,
        category: newBudget.category,
        allocated: parseFloat(newBudget.allocated),
        spent: parseFloat(newBudget.spent),
        month: newBudget.month,
      },
    ])

    if (!error) {
      toast.success('Budget added successfully!')
      setNewBudget({ category: '', allocated: '', spent: '', month: new Date().toISOString().slice(0, 7) })
      setShowAddForm(false)
      fetchBudgets()
    } else {
      toast.error('Failed to add budget')
    }
  }

  const handleDeleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) {
      toast.success('Budget deleted!')
      fetchBudgets()
    } else {
      toast.error('Failed to delete budget')
    }
  }

  const totalAllocated = budgets.reduce((sum, budget) => sum + budget.allocated, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const remaining = totalAllocated - totalSpent

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Wallet className="text-blue-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Budget</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
        >
          <Plus className="text-white" size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-xs text-slate-300 mb-1">Allocated</p>
          <p className="text-xl font-bold text-white">${totalAllocated.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
          <p className="text-xs text-slate-300 mb-1">Spent</p>
          <p className="text-xl font-bold text-white">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="col-span-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
          <p className="text-xs text-slate-300 mb-1">Remaining</p>
          <p className="text-2xl font-bold text-green-400">${remaining.toLocaleString()}</p>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddBudget} className="mb-6 p-4 bg-white/5 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Category (e.g., Groceries, Rent)"
            value={newBudget.category}
            onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 text-sm"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Allocated amount"
            value={newBudget.allocated}
            onChange={(e) => setNewBudget({ ...newBudget, allocated: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 text-sm"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount spent"
            value={newBudget.spent}
            onChange={(e) => setNewBudget({ ...newBudget, spent: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 text-sm"
            required
          />
          <input
            type="month"
            value={newBudget.month}
            onChange={(e) => setNewBudget({ ...newBudget, month: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-semibold"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <p className="text-slate-400 text-center py-8">Loading...</p>
        ) : budgets.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No budgets created yet</p>
        ) : (
          budgets.map((budget) => {
            const percentage = (budget.spent / budget.allocated) * 100
            const isOverBudget = percentage > 100

            return (
              <div
                key={budget.id}
                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{budget.category}</h3>
                    <p className="text-sm text-slate-400">
                      {new Date(budget.month + '-01').toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBudget(budget.id)}
                    className="p-2 hover:bg-white/10 rounded transition"
                  >
                    <Trash2 className="text-red-400" size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">
                      ${budget.spent.toLocaleString()} / ${budget.allocated.toLocaleString()}
                    </span>
                    <span className={isOverBudget ? 'text-red-400' : 'text-green-400'}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isOverBudget ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
