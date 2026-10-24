import { describe, expect, it } from 'vitest'
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  emptyTrip,
  initialState,
  isTrip,
  readState,
  writeState
} from './storage'

const event = {
  id: 'a',
  title: 'A',
  date: '2026-06-01',
  startMinute: 420,
  endMinute: 480
}
const reader = (items: Record<string, string>) => () => ({
  getItem: (key: string) => items[key] ?? null
})

describe('browser persistence', () => {
  it('starts with one pristine empty trip when nothing is saved', () => {
    const result = readState(reader({}))
    expect(result.error).toBeNull()
    expect(result.state?.trips).toHaveLength(1)
    expect(result.state?.trips[0].events).toEqual([])
    expect(result.pristine).toBe(true)
  })

  it('round-trips trips including events outside the displayed dates', () => {
    const trip = {
      ...emptyTrip('Rome'),
      startDate: '2026-06-01',
      endDate: '2026-06-06',
      events: [
        {
          id: 'dinner',
          title: 'Dinner',
          date: '2026-06-07',
          startMinute: 19 * 60,
          endMinute: 20 * 60
        }
      ]
    }
    const state = initialState(trip)
    let saved = ''
    expect(
      writeState(state, () => ({
        setItem: (key, value) => {
          expect(key).toBe(STORAGE_KEY)
          saved = value
        }
      }))
    ).toBeNull()
    const result = readState(reader({ [STORAGE_KEY]: saved }))
    expect(result.state).toEqual(state)
    expect(result.pristine).toBe(false)
  })

  it('migrates a valid v1 planner into one trip', () => {
    const legacy = {
      version: 1,
      startDate: '2026-06-01',
      endDate: '2026-06-06',
      events: [event]
    }
    const result = readState(
      reader({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) })
    )
    expect(result.needsWrite).toBe(true)
    expect(result.state?.trips).toHaveLength(1)
    expect(result.state?.trips[0]).toMatchObject({
      name: 'My trip',
      startDate: '2026-06-01',
      events: [event]
    })
    expect(result.state?.activeTripId).toBe(result.state?.trips[0].id)
  })

  it('prefers v2 data over v1 data', () => {
    const state = initialState(emptyTrip('Kept'))
    const legacy = {
      version: 1,
      startDate: '2026-06-01',
      endDate: '2026-06-06',
      events: [event]
    }
    const result = readState(
      reader({
        [STORAGE_KEY]: JSON.stringify(state),
        [LEGACY_STORAGE_KEY]: JSON.stringify(legacy)
      })
    )
    expect(result.state?.trips[0].name).toBe('Kept')
  })

  it('falls back to the first trip when the active trip is missing', () => {
    const state = { ...initialState(emptyTrip('First')), activeTripId: 'gone' }
    const result = readState(reader({ [STORAGE_KEY]: JSON.stringify(state) }))
    expect(result.state?.activeTripId).toBe(state.trips[0].id)
  })

  it('surfaces malformed/unsupported data without replacing it', () => {
    const valid = initialState()
    const bad = [
      '{broken',
      '{}',
      JSON.stringify({ ...valid, version: 3 }),
      JSON.stringify({ ...valid, trips: [] }),
      JSON.stringify({ ...valid, trips: [valid.trips[0], valid.trips[0]] })
    ]
    for (const raw of bad) {
      const result = readState(reader({ [STORAGE_KEY]: raw }))
      expect(result.state).toBeNull()
      expect(result.error).toContain('Existing data has not been replaced')
    }
    expect(
      readState(reader({ [LEGACY_STORAGE_KEY]: '{"version":1}' })).state
    ).toBeNull()
  })

  it('rejects invalid trips', () => {
    const trip = emptyTrip()
    expect(isTrip(trip)).toBe(true)
    expect(isTrip({ ...trip, events: [event, event] })).toBe(false)
    expect(isTrip({ ...trip, events: [{ ...event, endMinute: 425 }] })).toBe(
      false
    )
    expect(isTrip({ ...trip, name: '' })).toBe(false)
    expect(isTrip({ ...trip, name: ' padded ' })).toBe(false)
    expect(isTrip({ ...trip, name: 'x'.repeat(61) })).toBe(false)
    expect(
      isTrip({ ...trip, startDate: '2026-06-02', endDate: '2026-06-01' })
    ).toBe(false)
    expect(
      isTrip({ ...trip, startDate: '2020-01-01', endDate: '2030-01-01' })
    ).toBe(false)
  })

  it('surfaces denied storage reads and failed writes', () => {
    expect(
      readState(() => {
        throw new Error('Access denied')
      }).error
    ).toContain('Access denied')
    expect(
      writeState(initialState(), () => ({
        setItem: () => {
          throw new Error('Quota exceeded')
        }
      }))
    ).toContain('Changes were not saved')
  })
})
