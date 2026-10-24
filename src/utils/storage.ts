import type { Planner, PlannerEvent, StoredState, Trip } from '../types'
import { MAX_TRIP_DAYS, addDays, daySpan, isISODate, todayISO } from './dates'
import { eventError } from './schedule'

export const STORAGE_KEY = 'vacation-day-planner:v2'
export const LEGACY_STORAGE_KEY = 'vacation-day-planner:v1'
export const MAX_NAME_LENGTH = 60

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEvent(value: unknown): value is PlannerEvent {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    typeof value.date === 'string' &&
    typeof value.startMinute === 'number' &&
    typeof value.endMinute === 'number' &&
    eventError({
      title: value.title,
      date: value.date,
      startMinute: value.startMinute,
      endMinute: value.endMinute
    }) === null
  )
}

function hasValidEvents(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.events) &&
    value.events.every(isEvent) &&
    new Set(value.events.map((event) => event.id)).size === value.events.length
  )
}

export function isPlanner(value: unknown): value is Planner {
  return (
    isRecord(value) &&
    value.version === 1 &&
    isISODate(value.startDate) &&
    isISODate(value.endDate) &&
    value.startDate <= value.endDate &&
    hasValidEvents(value)
  )
}

export function isTrip(value: unknown): value is Trip {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 100 &&
    typeof value.name === 'string' &&
    value.name === value.name.trim() &&
    value.name.length >= 1 &&
    value.name.length <= MAX_NAME_LENGTH &&
    isISODate(value.startDate) &&
    isISODate(value.endDate) &&
    value.startDate <= value.endDate &&
    daySpan(value.startDate, value.endDate) <= MAX_TRIP_DAYS &&
    hasValidEvents(value)
  )
}

function isStoredState(value: unknown): value is StoredState {
  return (
    isRecord(value) &&
    value.version === 2 &&
    typeof value.activeTripId === 'string' &&
    Array.isArray(value.trips) &&
    value.trips.length > 0 &&
    value.trips.every(isTrip) &&
    new Set(value.trips.map((trip) => trip.id)).size === value.trips.length
  )
}

export function emptyTrip(name = 'Trip 1'): Trip {
  const startDate = todayISO()
  return {
    id: crypto.randomUUID(),
    name,
    startDate,
    endDate: addDays(startDate, 6),
    events: []
  }
}

export function initialState(trip: Trip = emptyTrip()): StoredState {
  return { version: 2, activeTripId: trip.id, trips: [trip] }
}

type ReadResult =
  // `pristine`: nothing was ever saved, so an imported link may replace the empty trip.
  | { state: StoredState; needsWrite: boolean; pristine: boolean; error: null }
  | { state: null; needsWrite: false; pristine: false; error: string }

export function readState(
  getStorage: () => Pick<Storage, 'getItem'> = () => localStorage
): ReadResult {
  try {
    const storage = getStorage()
    const raw = storage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const value: unknown = JSON.parse(raw)
      if (!isStoredState(value))
        throw new Error(
          'The saved trips have invalid data or an unsupported version.'
        )
      const activeTripId = value.trips.some(
        (trip) => trip.id === value.activeTripId
      )
        ? value.activeTripId
        : value.trips[0].id
      return {
        state: { ...value, activeTripId },
        needsWrite: false,
        pristine: false,
        error: null
      }
    }
    const legacy = storage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === null)
      return {
        state: initialState(),
        needsWrite: false,
        pristine: true,
        error: null
      }
    const old: unknown = JSON.parse(legacy)
    if (!isPlanner(old))
      throw new Error(
        'The saved planner has invalid data or an unsupported version.'
      )
    const migrated = initialState({
      id: crypto.randomUUID(),
      name: 'My trip',
      startDate: old.startDate,
      endDate: old.endDate,
      events: old.events
    })
    if (!isStoredState(migrated))
      throw new Error(
        `The saved planner spans more than ${MAX_TRIP_DAYS} days.`
      )
    return { state: migrated, needsWrite: true, pristine: false, error: null }
  } catch (error) {
    return {
      state: null,
      needsWrite: false,
      pristine: false,
      error: `Could not load the saved trips. ${error instanceof Error ? error.message : String(error)} Existing data has not been replaced.`
    }
  }
}

export function writeState(
  state: StoredState,
  getStorage: () => Pick<Storage, 'setItem'> = () => localStorage
): string | null {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(state))
    return null
  } catch (error) {
    return `Changes were not saved. ${error instanceof Error ? error.message : String(error)} Free up browser storage or allow site storage, then try again.`
  }
}
