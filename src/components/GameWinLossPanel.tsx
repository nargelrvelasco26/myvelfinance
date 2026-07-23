import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Gamepad2, Plus, Trash2, Trophy, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface GameRecord {
  id: string
  game_name: string
  result: 'win' | 'loss'
  amount: number
  date: string
  notes: string
  created_at: string
}

interface GameWinLossPanelProps {
  userId: string
}

export default function GameWinLossPanel({ userId }: GameWinLossPanelProps) {
  const [records, setRecords] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRecord, setNewRecord] = useState({
    game_name: '',
    result: 'win' as 'win' | 'loss',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from('game_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (!error && data) {
      setRecords(data)
    }
    setLoading(false)
  }

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('game_records').insert([
      {
        user_id: userId,
        game_name: newRecord.game_name,
        result: newRecord.result,
        amount: parseFloat(newRecord.amount),
        date: newRecord.date,
        notes: newRecord.notes,
      },
    ])

    if (!error) {
      toast.success('Game record added!')
      setNewRecord({
        game_name: '',
        result: 'win',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      })
      setShowAddForm(false)
      fetchRecords()
    } else {
      toast.error('Failed to add record')
    }
  }

  const handleDeleteRecord = async (id: string) => {
    const { error } = await supabase.from('game_records').delete().eq('id', id)
    if (!error) {
      toast.success('Record deleted!')
      fetchRecords()
    } else {
      toast.error('Failed to delete record')
    }
  }

  const wins = records.filter((r) => r.result === 'win')
  const losses = records.filter((r) => r.result === 'loss')
  const totalWins = wins.reduce((sum, r) => sum + r.amount, 0)
  const totalLosses = losses.reduce((sum, r) => sum + r.amount, 0)
  const netProfit = totalWins - totalLosses

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Gamepad2 className="text-purple-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Game Win/Loss</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
        >
          <Plus className="text-white" size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="text-green-400" size={16} />
            <p className="text-xs text-slate-300">Wins</p>
          </div>
          <p className="text-xl font-bold text-green-400">${totalWins.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{wins.length} games</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="text-red-400" size={16} />
            <p className="text-xs text-slate-300">Losses</p>
          </div>
          <p className="text-xl font-bold text-red-400">${totalLosses.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{losses.length} games</p>
        </div>
        <div className="col-span-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <p className="text-xs text-slate-300 mb-1">Net Profit/Loss</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddRecord} className="mb-6 p-4 bg-white/5 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Game name"
            value={newRecord.game_name}
            onChange={(e) => setNewRecord({ ...newRecord, game_name: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 text-sm"
            required
          />
          <select
            value={newRecord.result}
            onChange={(e) => setNewRecord({ ...newRecord, result: e.target.value as 'win' | 'loss' })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            required
          >
            <option value="win">Win</option>
            <option value="loss">Loss</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={newRecord.amount}
            onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 text-sm"
            required
          />
          <input
            type="date"
            value={newRecord.date}
            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            required
          />
          <textarea
            placeholder="Notes (optional)"
            value={newRecord.notes}
            onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-slate-400 text-sm"
            rows={2}
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
        ) : records.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No game records yet</p>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{record.game_name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        record.result === 'win'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {record.result.toUpperCase()}
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      record.result === 'win' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {record.result === 'win' ? '+' : '-'}${record.amount.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteRecord(record.id)}
                  className="p-2 hover:bg-white/10 rounded transition"
                >
                  <Trash2 className="text-red-400" size={16} />
                </button>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-slate-400">{new Date(record.date).toLocaleDateString()}</p>
                {record.notes && <p className="text-slate-300">{record.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
