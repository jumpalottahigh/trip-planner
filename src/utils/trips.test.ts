import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { emptyTrip, initialState } from './storage'
import {
  appendTrip,
  copyOf,
  nextTripName,
  normalizeName,
  resolveIncoming,
  setActiveTrip,
  setTripName,
  updateTrip,
  withoutTrip
} from './trips'

const trip = (name: string, extra: Partial<Trip> = {}): Trip => ({
  ...emptyTrip(name),
  ...extra
})
const event = {
  id: 'e',
  title: 'Hike',
  date: '2026-06-01',
  startMinute: 540,
  endMinute: 600
}

describe('trip operations', () => {
  it('names new trips without clashing', () => {
    const [a, b] = [trip('Trip 1'), trip('Trip 3')]
    expect(nextTripName([a])).toBe('Trip 2')
    expect(nextTripName([a, b])).toBe('Trip 4')
  })

  it('normalizes names', () => {
    expect(normalizeName('  Big   trip ')).toBe('Big trip')
    expect(normalizeName('   ')).toBeNull()
    expect(normalizeName('x'.repeat(61))).toBeNull()
  })

  it('appends and selects a trip, or replaces a pristine state', () => {
    const state = initialState(trip('One'))
    const added = trip('Two')
    const next = appendTrip(state, added)
    expect(next.trips.map((item) => item.name)).toEqual(['One', 'Two'])
    expect(next.activeTripId).toBe(added.id)
    expect(appendTrip(state, added, true).trips).toEqual([added])
  })

  it('updates, renames and selects without touching other trips', () => {
    const [a, b] = [trip('A'), trip('B')]
    const state = appendTrip(initialState(a), b)
    expect(
      updateTrip(state, { ...a, events: [event] }).trips[0].events
    ).toEqual([event])
    expect(
      setTripName(state, b.id, 'Renamed').trips.map((item) => item.name)
    ).toEqual(['A', 'Renamed'])
    expect(setActiveTrip(state, a.id).activeTripId).toBe(a.id)
    expect(setActiveTrip(state, 'missing')).toBe(state)
  })

  it('moves the selection to a neighbour when the active trip is deleted', () => {
    const [a, b, c] = [trip('A'), trip('B'), trip('C')]
    const state = {
      ...appendTrip(appendTrip(initialState(a), b), c),
      activeTripId: b.id
    }
    expect(withoutTrip(state, b.id).activeTripId).toBe(c.id)
    expect(
      withoutTrip({ ...state, activeTripId: c.id }, c.id).activeTripId
    ).toBe(b.id)
    expect(withoutTrip(state, a.id).activeTripId).toBe(b.id)
    expect(withoutTrip(state, 'missing')).toBe(state)
  })

  it('never leaves zero trips', () => {
    const only = trip('Only')
    const next = withoutTrip(initialState(only), only.id)
    expect(next.trips).toHaveLength(1)
    expect(next.trips[0].id).not.toBe(only.id)
    expect(next.activeTripId).toBe(next.trips[0].id)
  })
})

describe('incoming links', () => {
  const local = trip('Rome', { events: [event] })
  const state = initialState(local)

  it('imports an unknown trip', () => {
    expect(resolveIncoming(state, trip('Other'))).toEqual({ kind: 'import' })
  })

  it('selects the local trip when content is identical, even with different event ids', () => {
    const incoming = { ...local, events: [{ ...event, id: 'different' }] }
    expect(resolveIncoming(state, incoming)).toEqual({
      kind: 'select',
      id: local.id
    })
  })

  it('reports a conflict instead of overwriting when content differs', () => {
    expect(resolveIncoming(state, { ...local, name: 'Renamed' })).toEqual({
      kind: 'conflict',
      local
    })
    expect(resolveIncoming(state, { ...local, events: [] })).toEqual({
      kind: 'conflict',
      local
    })
  })

  it('copies with a new id and a valid name', () => {
    const copy = copyOf({ ...local, name: 'x'.repeat(60) })
    expect(copy.id).not.toBe(local.id)
    expect(copy.name.length).toBeLessThanOrEqual(60)
    expect(copy.name.endsWith('(copy)')).toBe(true)
    expect(copy.events).toEqual(local.events)
  })
})
