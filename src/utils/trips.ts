import type { StoredState, Trip } from '../types'
import { MAX_NAME_LENGTH, initialState } from './storage'
import { tripSignature } from './share'

export type Resolution =
  | { kind: 'import' }
  | { kind: 'select'; id: string }
  | { kind: 'conflict'; local: Trip }

export function normalizeName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  return trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH
    ? trimmed
    : null
}

export function nextTripName(trips: Trip[]): string {
  const names = new Set(trips.map((trip) => trip.name))
  for (let number = trips.length + 1; ; number++) {
    if (!names.has(`Trip ${number}`)) return `Trip ${number}`
  }
}

export function activeTrip(state: StoredState): Trip {
  return (
    state.trips.find((trip) => trip.id === state.activeTripId) ?? state.trips[0]
  )
}

export function setActiveTrip(state: StoredState, id: string): StoredState {
  return state.trips.some((trip) => trip.id === id)
    ? { ...state, activeTripId: id }
    : state
}

export function updateTrip(state: StoredState, trip: Trip): StoredState {
  return {
    ...state,
    trips: state.trips.map((item) => (item.id === trip.id ? trip : item))
  }
}

export function appendTrip(
  state: StoredState,
  trip: Trip,
  replaceState = false
): StoredState {
  return replaceState
    ? initialState(trip)
    : { ...state, activeTripId: trip.id, trips: [...state.trips, trip] }
}

export function setTripName(
  state: StoredState,
  id: string,
  name: string
): StoredState {
  return {
    ...state,
    trips: state.trips.map((trip) =>
      trip.id === id ? { ...trip, name } : trip
    )
  }
}

// Removing the last trip leaves a fresh empty one so there is always something to show.
export function withoutTrip(state: StoredState, id: string): StoredState {
  const index = state.trips.findIndex((trip) => trip.id === id)
  if (index === -1) return state
  const trips = state.trips.filter((trip) => trip.id !== id)
  if (trips.length === 0) return initialState()
  const activeTripId =
    state.activeTripId === id
      ? trips[Math.min(index, trips.length - 1)].id
      : state.activeTripId
  return { ...state, activeTripId, trips }
}

export function resolveIncoming(
  state: StoredState,
  incoming: Trip
): Resolution {
  const local = state.trips.find((trip) => trip.id === incoming.id)
  if (!local) return { kind: 'import' }
  return tripSignature(local) === tripSignature(incoming)
    ? { kind: 'select', id: local.id }
    : { kind: 'conflict', local }
}

export function copyOf(incoming: Trip): Trip {
  const suffix = ' (copy)'
  const name = `${incoming.name.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`
  return { ...incoming, id: crypto.randomUUID(), name }
}
