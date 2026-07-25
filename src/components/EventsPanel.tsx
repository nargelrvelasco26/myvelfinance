import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTodayEvents } from '../lib/events'
import type { EventOccurrence } from '../lib/types'

export default function EventsPanel() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventOccurrence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayEvents()
  }, [])

  const fetchTodayEvents = async () => {
    setLoading(true)
    try {
      const data = await getTodayEvents()
      setEvents(data)
    } catch (err) {
      console.error('Failed to load today\'s events:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatTimeRange = (start: string, end: string | null, allDay: boolean) => {
    if (allDay) return 'All Day'
    if (!end) return formatTime(start)
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Calendar className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Activities/Events</h2>
            <p className="text-slate-300 text-sm">Today's Schedule</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/events')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
        >
          View Calendar
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-8">Loading...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-2">No events scheduled for today</p>
          <p className="text-slate-500 text-sm">Click "View Calendar" to add events</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {events.map((event, idx) => (
            <div
              key={`${event.event_id}-${idx}`}
              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {event.event_name}
                    {event.is_recurring && (
                      <span className="ml-2 text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                        Recurring
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                    <Clock size={14} />
                    <span>{formatTimeRange(event.occurrence_start, event.occurrence_end, event.all_day)}</span>
                  </div>
                  {event.location && (
                    <p className="text-slate-400 text-sm mb-1">
                      📍 {event.location}
                    </p>
                  )}
                  {event.notes && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {event.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
