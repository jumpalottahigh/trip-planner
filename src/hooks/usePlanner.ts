import { useCallback, useEffect, useState } from 'react'
import type { EventDraft, PlannerEvent, StoredState, Trip } from '../types'
import {
  STORAGE_KEY,
  emptyTrip,
  initialState,
  readState,
  writeState
} from '../utils/storage'
import {
  activeTrip,
  appendTrip,
  copyOf,
  nextTripName,
  normalizeName,
  setActiveTrip,
  setTripName,
  updateTrip,
  withoutTrip
} from '../utils/trips'

export function usePlanner() {
  const [initial] = useState(() => readState())
  const [state, setState] = useState<StoredState | null>(initial.state)
  const [error, setError] = useState<string | null>(initial.error)
  const [pristine, setPristine] = useState(initial.pristine)
  const trip = state ? activeTrip(state) : null

  useEffect(() => {
    if (initial.needsWrite && initial.state) setError(writeState(initial.state))
  }, [initial])

  // Adopt trips saved by other tabs, but keep this tab on its own trip.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return
      const { state: other } = readState()
      if (!other) return
      setState((current) => ({
        ...other,
        activeTripId:
          current &&
          other.trips.some((item) => item.id === current.activeTripId)
            ? current.activeTripId
            : other.activeTripId
      }))
      setPristine(false)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commit = useCallback((next: StoredState): boolean => {
    const failure = writeState(next)
    setError(failure)
    if (failure) return false
    setState(next)
    setPristine(false)
    return true
  }, [])

  const saveEvent = useCallback(
    (draft: EventDraft, id?: string): boolean => {
      if (!state) return false
      const current = activeTrip(state)
      const event: PlannerEvent = {
        ...draft,
        title: draft.title.trim(),
        id: id ?? crypto.randomUUID()
      }
      return commit(
        updateTrip(state, {
          ...current,
          events: id
            ? current.events.map((item) => (item.id === id ? event : item))
            : [...current.events, event]
        })
      )
    },
    [state, commit]
  )

  const deleteEvent = useCallback(
    (id: string): boolean => {
      if (!state) return false
      const current = activeTrip(state)
      return commit(
        updateTrip(state, {
          ...current,
          events: current.events.filter((event) => event.id !== id)
        })
      )
    },
    [state, commit]
  )

  const updateRange = useCallback(
    (startDate: string, endDate: string): boolean => {
      return state
        ? commit(
            updateTrip(state, { ...activeTrip(state), startDate, endDate })
          )
        : false
    },
    [state, commit]
  )

  const selectTrip = useCallback(
    (id: string): boolean => {
      return state ? commit(setActiveTrip(state, id)) : false
    },
    [state, commit]
  )

  const createTrip = useCallback((): boolean => {
    return state
      ? commit(appendTrip(state, emptyTrip(nextTripName(state.trips))))
      : false
  }, [state, commit])

  const renameTrip = useCallback(
    (id: string, name: string): boolean => {
      const clean = normalizeName(name)
      return state && clean ? commit(setTripName(state, id, clean)) : false
    },
    [state, commit]
  )

  const deleteTrip = useCallback(
    (id: string): boolean => {
      return state ? commit(withoutTrip(state, id)) : false
    },
    [state, commit]
  )

  const importTrip = useCallback(
    (incoming: Trip): boolean => {
      return state ? commit(appendTrip(state, incoming, pristine)) : false
    },
    [state, pristine, commit]
  )

  const replaceTrip = useCallback(
    (incoming: Trip): boolean => {
      return state
        ? commit(setActiveTrip(updateTrip(state, incoming), incoming.id))
        : false
    },
    [state, commit]
  )

  const importCopy = useCallback(
    (incoming: Trip): boolean => {
      return state ? commit(appendTrip(state, copyOf(incoming))) : false
    },
    [state, commit]
  )

  const retry = useCallback(() => {
    const result = readState()
    setState(result.state)
    setError(result.error)
    setPristine(result.pristine)
  }, [])

  const reset = useCallback(() => commit(initialState()), [commit])

  return {
    state,
    trip,
    pristine,
    error,
    saveEvent,
    deleteEvent,
    updateRange,
    selectTrip,
    createTrip,
    renameTrip,
    deleteTrip,
    importTrip,
    replaceTrip,
    importCopy,
    retry,
    reset
  }
}
