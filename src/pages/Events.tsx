import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventOccurrences,
} from '../lib/events';
import type { Event, EventInput, EventOccurrence, RecurrenceFreq } from '../lib/types';

const EMPTY: EventInput = {
  event_name: '',
  starts_at: '',
  ends_at: null,
  all_day: false,
  location: null,
  notes: null,
  is_recurring: false,
  recurrence_freq: null,
  recurrence_interval: 1,
  recurrence_byweekday: null,
  recurrence_until: null,
  recurrence_count: null,
  recurrence_exceptions: [],
};

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(EMPTY);
  const [viewMode, setViewMode] = useState<'list' | 'occurrences' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Date range for occurrences view
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: (() => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      return future.toISOString().split('T')[0];
    })(),
  });

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (viewMode === 'occurrences') {
      fetchOccurrences();
    }
  }, [viewMode, dateRange]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarOccurrences();
    }
  }, [viewMode, calendarDate]);

  async function fetchCalendarOccurrences() {
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const data = await getEventOccurrences(startDate.toISOString(), endDate.toISOString());
      setOccurrences(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load calendar events');
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      setEvents(await listEvents());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOccurrences() {
    try {
      const startISO = new Date(dateRange.start).toISOString();
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      const endISO = endDate.toISOString();

      const data = await getEventOccurrences(startISO, endISO);
      setOccurrences(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load occurrences');
    }
  }

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);

    // Convert ISO timestamps to datetime-local format (YYYY-MM-DDTHH:MM)
    // This needs to convert from UTC stored time to local time for display
    const formatForInput = (isoString: string | null) => {
      if (!isoString) return null;
      const date = new Date(isoString);
      // Get local date/time components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setForm({
      event_name: event.event_name,
      starts_at: formatForInput(event.starts_at) || '',
      ends_at: formatForInput(event.ends_at),
      all_day: event.all_day,
      location: event.location,
      notes: event.notes,
      is_recurring: event.is_recurring,
      recurrence_freq: event.recurrence_freq,
      recurrence_interval: event.recurrence_interval,
      recurrence_byweekday: event.recurrence_byweekday,
      recurrence_until: event.recurrence_until,
      recurrence_count: event.recurrence_count,
      recurrence_exceptions: event.recurrence_exceptions,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.event_name.trim()) {
      toast.error('Event name is required');
      return;
    }
    if (!form.starts_at) {
      toast.error('Start date & time is required');
      return;
    }

    setSaving(true);
    try {
      // Convert datetime-local format to ISO string (preserving local timezone)
      const convertToISOString = (datetimeLocal: string | null) => {
        if (!datetimeLocal) return null;
        // datetime-local format: "2024-01-15T16:00"
        // We need to treat this as local time and convert to ISO
        const date = new Date(datetimeLocal);
        return date.toISOString();
      };

      const dataToSave = {
        ...form,
        starts_at: convertToISOString(form.starts_at) || '',
        ends_at: convertToISOString(form.ends_at),
      };

      if (editingId) {
        await updateEvent(editingId, dataToSave);
        toast.success('Event updated!');
      } else {
        await createEvent(dataToSave);
        toast.success('Event added!');
      }
      setModalOpen(false);
      refresh();
      if (viewMode === 'calendar') {
        fetchOccurrences();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteEvent(id);
      toast.success('Event deleted!');
      refresh();
      if (viewMode === 'calendar') {
        fetchOccurrences();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDay = (day: number) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const targetDate = new Date(year, month, day);

    return occurrences.filter(occ => {
      const occDate = new Date(occ.occurrence_start);
      return (
        occDate.getFullYear() === year &&
        occDate.getMonth() === month &&
        occDate.getDate() === day
      );
    });
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
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

  const handleToday = () => {
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Events</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                {viewMode === 'list' ? `${events.length} events` : `${occurrences.length} occurrences`}
              </p>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 text-sm font-medium text-white transition shrink-0"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Event</span>
            </button>
          </div>
          <div className="flex bg-gray-200 rounded-lg p-1 overflow-x-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Events List
            </button>
            <button
              onClick={() => setViewMode('occurrences')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                viewMode === 'occurrences'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Occurrences
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {viewMode === 'occurrences' && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-gray-600" />
                <label className="text-sm font-medium text-gray-700">Date Range:</label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'calendar' ? (
          <CalendarView
            date={calendarDate}
            occurrences={occurrences}
            onMonthChange={handleMonthChange}
            onToday={handleToday}
            getEventsForDay={getEventsForDay}
            getDaysInMonth={getDaysInMonth}
            getFirstDayOfMonth={getFirstDayOfMonth}
          />
        ) : viewMode === 'list' ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Event Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Start Date & Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">End Date & Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">All Day</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Recurring</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : events.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No events found. Click "Add Event" to get started.
                        </td>
                      </tr>
                    ) : (
                      events.map((event, index) => (
                        <tr key={event.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(event)}
                                className="p-1 hover:bg-blue-100 rounded transition"
                                title="Edit"
                              >
                                <Pencil size={16} className="text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="p-1 hover:bg-red-100 rounded transition"
                                title="Delete"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{event.event_name}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDateTime(event.starts_at)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDateTime(event.ends_at)}</td>
                          <td className="px-4 py-3">
                            {event.all_day ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Yes</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {event.is_recurring ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                {event.recurrence_freq}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{event.location ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{event.notes ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                  Loading...
                </div>
              ) : events.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                  No events found. Click "Add Event" to get started.
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">{event.event_name}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {event.all_day && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">All Day</span>
                          )}
                          {event.is_recurring && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              {event.recurrence_freq}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => openEdit(event)}
                          className="p-2 hover:bg-blue-100 rounded transition"
                          title="Edit"
                        >
                          <Pencil size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 hover:bg-red-100 rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-20 shrink-0">Starts:</span>
                        <span className="text-gray-900">{formatDateTime(event.starts_at)}</span>
                      </div>
                      {event.ends_at && (
                        <div className="flex items-start">
                          <span className="text-gray-600 font-medium w-20 shrink-0">Ends:</span>
                          <span className="text-gray-900">{formatDateTime(event.ends_at)}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-start">
                          <span className="text-gray-600 font-medium w-20 shrink-0">Location:</span>
                          <span className="text-gray-900">{event.location}</span>
                        </div>
                      )}
                      {event.notes && (
                        <div className="flex items-start">
                          <span className="text-gray-600 font-medium w-20 shrink-0">Notes:</span>
                          <span className="text-gray-700">{event.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Table View for Occurrences */}
            <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Event Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occurrences.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No occurrences in selected date range.
                        </td>
                      </tr>
                    ) : (
                      occurrences.map((occ, index) => (
                        <tr key={`${occ.event_id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{occ.event_name}</span>
                              {occ.is_recurring && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                  Recurring
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{formatDate(occ.occurrence_start)}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {occ.all_day ? (
                              <span className="text-green-600 font-medium">All Day</span>
                            ) : (
                              `${new Date(occ.occurrence_start).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}${
                                occ.occurrence_end
                                  ? ` - ${new Date(occ.occurrence_end).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}`
                                  : ''
                              }`
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{occ.location ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{occ.notes ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View for Occurrences */}
            <div className="sm:hidden space-y-3">
              {occurrences.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                  No occurrences in selected date range.
                </div>
              ) : (
                occurrences.map((occ, index) => (
                  <div key={`${occ.event_id}-${index}`} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-base flex-1">{occ.event_name}</h3>
                      {occ.is_recurring && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded ml-2">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-16 shrink-0">Date:</span>
                        <span className="text-gray-900">{formatDate(occ.occurrence_start)}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-600 font-medium w-16 shrink-0">Time:</span>
                        <span className="text-gray-900">
                          {occ.all_day ? (
                            <span className="text-green-600 font-medium">All Day</span>
                          ) : (
                            `${new Date(occ.occurrence_start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}${
                              occ.occurrence_end
                                ? ` - ${new Date(occ.occurrence_end).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}`
                                : ''
                            }`
                          )}
                        </span>
                      </div>
                      {occ.location && (
                        <div className="flex items-start">
                          <span className="text-gray-600 font-medium w-16 shrink-0">Location:</span>
                          <span className="text-gray-900">{occ.location}</span>
                        </div>
                      )}
                      {occ.notes && (
                        <div className="flex items-start">
                          <span className="text-gray-600 font-medium w-16 shrink-0">Notes:</span>
                          <span className="text-gray-700">{occ.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {modalOpen && (
          <EventModal
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

function CalendarView({
  date,
  occurrences,
  onMonthChange,
  onToday,
  getEventsForDay,
  getDaysInMonth,
  getFirstDayOfMonth,
}: {
  date: Date;
  occurrences: EventOccurrence[];
  onMonthChange: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  getEventsForDay: (day: number) => EventOccurrence[];
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
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
      <div className="p-2 sm:p-6">
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

            const eventsForDay = getEventsForDay(day);
            const isToday = isCurrentMonth && day === todayDate;

            return (
              <div
                key={day}
                className={`border rounded-lg p-1 sm:p-2 min-h-[60px] sm:min-h-[120px] transition ${
                  isToday
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : eventsForDay.length > 0
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`text-xs sm:text-sm font-bold mb-1 sm:mb-2 ${
                  isToday ? 'text-blue-700' : eventsForDay.length > 0 ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {day}
                  {isToday && <span className="ml-1 text-xs hidden sm:inline">(Today)</span>}
                </div>

                {eventsForDay.length > 0 && (
                  <div className="space-y-1">
                    {eventsForDay.slice(0, 2).map((event, idx) => (
                      <div
                        key={`${event.event_id}-${idx}`}
                        className="text-xs bg-white border border-green-200 rounded p-1 sm:p-1.5 hover:shadow-sm transition"
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <div className="font-semibold text-gray-800 truncate flex-1 text-[10px] sm:text-xs" title={event.event_name}>
                            {event.event_name}
                          </div>
                          {event.is_recurring && (
                            <span className="text-purple-600 hidden sm:inline" title="Recurring">
                              ↻
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600 text-[10px] sm:text-xs hidden sm:block">
                          {event.all_day ? (
                            <span className="text-green-600 font-medium">All Day</span>
                          ) : (
                            <span>{formatTime(event.occurrence_start)}</span>
                          )}
                        </div>
                        {event.location && (
                          <div className="text-gray-500 truncate text-[10px] sm:text-xs hidden sm:block" title={event.location}>
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                    ))}
                    {eventsForDay.length > 2 && (
                      <div className="text-[10px] sm:text-xs text-gray-500 text-center">
                        +{eventsForDay.length - 2} more
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-500 bg-blue-50 rounded"></div>
            <span className="text-gray-700">Today</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-green-300 bg-green-50 rounded"></div>
            <span className="text-gray-700">Events</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-purple-600 font-bold">↻</span>
            <span className="text-gray-700 hidden sm:inline">Recurring Event</span>
            <span className="text-gray-700 sm:hidden">Recurring</span>
          </div>
          <div className="text-gray-600 w-full sm:w-auto sm:ml-auto text-center sm:text-left">
            Total: <strong>{occurrences.length}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventModal({
  form,
  editing,
  saving,
  onField,
  onClose,
  onSave,
}: {
  form: EventInput;
  editing: boolean;
  saving: boolean;
  onField: (field: keyof EventInput, value: any) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const toggleWeekday = (day: number) => {
    const current = form.recurrence_byweekday ?? [];
    if (current.includes(day)) {
      onField('recurrence_byweekday', current.filter((d) => d !== day));
    } else {
      onField('recurrence_byweekday', [...current, day].sort());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white">
          <h2 className="text-xl sm:text-2xl font-bold">{editing ? 'Edit Event' : 'Add Event'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.event_name}
                onChange={(e) => onField('event_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Enter event name"
                required
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => onField('starts_at', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.ends_at ?? ''}
                  onChange={(e) => onField('ends_at', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>

            {/* All Day */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="all_day"
                checked={form.all_day}
                onChange={(e) => onField('all_day', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="all_day" className="text-sm font-medium text-gray-700">
                All Day Event
              </label>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location ?? ''}
                onChange={(e) => onField('location', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Enter location"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => onField('notes', e.target.value || null)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
                placeholder="Additional notes (optional)"
              />
            </div>

            {/* Recurrence */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={form.is_recurring}
                  onChange={(e) => {
                    onField('is_recurring', e.target.checked);
                    if (!e.target.checked) {
                      onField('recurrence_freq', null);
                      onField('recurrence_byweekday', null);
                      onField('recurrence_until', null);
                      onField('recurrence_count', null);
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="is_recurring" className="text-sm font-semibold text-gray-700">
                  Recurring Event
                </label>
              </div>

              {form.is_recurring && (
                <div className="space-y-4 pl-3 sm:pl-6 border-l-2 border-blue-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                      <select
                        value={form.recurrence_freq ?? ''}
                        onChange={(e) => onField('recurrence_freq', (e.target.value as RecurrenceFreq) || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        required
                      >
                        <option value="">Select frequency</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Every</label>
                      <input
                        type="number"
                        min="1"
                        value={form.recurrence_interval}
                        onChange={(e) => onField('recurrence_interval', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {form.recurrence_freq === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Repeat on</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekday(day.value)}
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                              (form.recurrence_byweekday ?? []).includes(day.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={form.recurrence_until ?? ''}
                        onChange={(e) => {
                          onField('recurrence_until', e.target.value || null);
                          if (e.target.value) onField('recurrence_count', null);
                        }}
                        disabled={!!form.recurrence_count}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Or After # Occurrences</label>
                      <input
                        type="number"
                        min="1"
                        value={form.recurrence_count ?? ''}
                        onChange={(e) => {
                          onField('recurrence_count', e.target.value ? parseInt(e.target.value) : null);
                          if (e.target.value) onField('recurrence_until', null);
                        }}
                        disabled={!!form.recurrence_until}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              )}
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
            disabled={saving || !form.event_name.trim() || !form.starts_at}
            className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50 text-sm sm:text-base"
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
