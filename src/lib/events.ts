import { supabase } from './supabase';
import type { Event, EventInput, EventOccurrence } from './types';

const TABLE = 'events';

// Get all events (raw data, not expanded)
export async function listEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('starts_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Get event occurrences for a specific date range (expanded with recurrence)
export async function getEventOccurrences(
  windowStart: string,
  windowEnd: string
): Promise<EventOccurrence[]> {
  const { data, error } = await supabase.rpc('get_event_occurrences', {
    window_start: windowStart,
    window_end: windowEnd,
  });
  if (error) throw error;
  return data ?? [];
}

// Get today's events (for dashboard panel)
export async function getTodayEvents(): Promise<EventOccurrence[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  return getEventOccurrences(startOfDay.toISOString(), endOfDay.toISOString());
}

// Get upcoming events (next 7 days, for dashboard panel)
export async function getUpcomingEvents(days: number = 7): Promise<EventOccurrence[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return getEventOccurrences(now.toISOString(), future.toISOString());
}

// Create a new event
export async function createEvent(input: EventInput): Promise<Event> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update an existing event
export async function updateEvent(id: string, input: Partial<EventInput>): Promise<Event> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete an event
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Get a single event by ID
export async function getEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}
