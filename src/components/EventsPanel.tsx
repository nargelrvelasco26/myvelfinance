import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getEventOccurrences } from '../lib/events'
import type { EventOccurrence } from '../lib/types'

export default function EventsPanel() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventOccurrence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeekEvents()
  }, [])

  const fetchWeekEvents = async () => {
    setLoading(true)
    try {
      // Get start of week (Monday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const startOfWeek = new Date(now)
      // If Sunday (0), go back 6 days to Monday, otherwise go back (dayOfWeek - 1) days
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startOfWeek.setDate(now.getDate() - daysToMonday)
      startOfWeek.setHours(0, 0, 0, 0)

      // Get end of week (Sunday)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const data = await getEventOccurrences(startOfWeek.toISOString(), endOfWeek.toISOString())
      setEvents(data)
    } catch (err) {
      console.error('Failed to load week\'s events:', err)
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }
    // Otherwise show day of week and date
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = new Date(event.occurrence_start).toDateString()
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
    return groups
  }, {} as Record<string, EventOccurrence[]>)

  // Sort dates chronologically
  const sortedDates = Object.keys(groupedEvents).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  )

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Calendar className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Activities/Events</h2>
            <p className="text-slate-300 text-sm">This Week's Schedule</p>
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
          <p className="text-slate-400 mb-2">No events scheduled this week</p>
          <p className="text-slate-500 text-sm">Click "View Calendar" to add events</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-1">
                <div className="h-px bg-white/20 flex-1"></div>
                <h4 className="text-white font-semibold text-sm px-2">
                  {formatDate(groupedEvents[dateKey][0].occurrence_start)}
                </h4>
                <div className="h-px bg-white/20 flex-1"></div>
              </div>

              {/* Events for this date */}
              <div className="space-y-2">
                {groupedEvents[dateKey].map((event, idx) => (
                  <div
                    key={`${event.event_id}-${idx}`}
                    className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">
                          {event.event_name}
                          {event.is_recurring && (
                            <span className="ml-2 text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                              Recurring
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
