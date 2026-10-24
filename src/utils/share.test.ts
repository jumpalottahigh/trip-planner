import { describe, expect, it } from 'vitest'
import type { PlannerEvent, Trip } from '../types'
import {
  decodeTrip,
  encodeTrip,
  extractShareHash,
  hasShareParam,
  tripSignature
} from './share'

const trip: Trip = {
  id: 'trip-1',
  name: 'Lisbon',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  events: [
    {
      id: 'b',
      title: 'Dinner',
      date: '2026-06-02',
      startMinute: 19 * 60,
      endMinute: 21 * 60
    },
    {
      id: 'a',
      title: 'Museum \u00e9 \u{1F3A8}',
      date: '2026-06-01',
      startMinute: 9 * 60,
      endMinute: 11 * 60
    }
  ]
}

// Fails to compile when a field is added to the types, as a reminder to update the codec.
const tripFields: Record<keyof Trip, true> = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  events: true
}
const eventFields: Record<keyof PlannerEvent, true> = {
  id: true,
  title: true,
  date: true,
  startMinute: true,
  endMinute: true
}

const withoutIds = (value: Trip) => ({
  ...value,
  events: value.events.map(({ id: _id, ...rest }) => rest)
})

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

describe('share links', () => {
  it('extracts the share fragment from pasted text', () => {
    expect(extractShareHash('https://example.com/app/#t=1.abc')).toBe('#t=1.abc')
    expect(extractShareHash('  #t=1.abc\n')).toBe('#t=1.abc')
    expect(extractShareHash('t=1.abc')).toBe('#t=1.abc')
    expect(extractShareHash('https://example.com/')).toBeNull()
    expect(extractShareHash('')).toBeNull()
  })

  it('covers every trip and event field', () => {
    expect(Object.keys(tripFields).sort()).toEqual(Object.keys(trip).sort())
    expect(Object.keys(eventFields).sort()).toEqual(
      Object.keys(trip.events[0]).sort()
    )
  })

  it('round-trips a trip losslessly apart from regenerated event ids', async () => {
    const hash = await encodeTrip(trip)
    expect(hasShareParam(hash)).toBe(true)
    const result = await decodeTrip(hash)
    expect(result.error).toBeNull()
    expect(result.trip && withoutIds(result.trip)).toEqual({
      ...withoutIds(trip),
      events: withoutIds(trip).events.slice().reverse()
    })
    expect(result.trip && tripSignature(result.trip)).toBe(tripSignature(trip))
  })

  it('produces the same link regardless of event order', async () => {
    const reversed = { ...trip, events: [...trip.events].reverse() }
    expect(await encodeTrip(reversed)).toBe(await encodeTrip(trip))
  })

  it('changes the signature when any field changes', () => {
    const [first] = trip.events
    const changes: Trip[] = [
      { ...trip, id: 'other' },
      { ...trip, name: 'Porto' },
      { ...trip, startDate: '2026-05-31' },
      { ...trip, endDate: '2026-06-06' },
      { ...trip, events: [...trip.events, first] },
      { ...trip, events: [{ ...first, title: 'x' }, trip.events[1]] },
      { ...trip, events: [{ ...first, date: '2026-06-03' }, trip.events[1]] },
      { ...trip, events: [{ ...first, startMinute: 8 * 60 }, trip.events[1]] },
      { ...trip, events: [{ ...first, endMinute: 22 * 60 }, trip.events[1]] }
    ]
    for (const changed of changes)
      expect(tripSignature(changed)).not.toBe(tripSignature(trip))
  })

  it('ignores event ids in the signature', () => {
    const renamed = {
      ...trip,
      events: trip.events.map((item) => ({ ...item, id: `x-${item.id}` }))
    }
    expect(tripSignature(renamed)).toBe(tripSignature(trip))
  })

  it('keeps a trip with many events well under typical URL limits', async () => {
    const events = Array.from({ length: 30 }, (_, index) => ({
      id: String(index),
      title: `Activity number ${index}`,
      date: `2026-06-0${(index % 5) + 1}`,
      startMinute: (7 + (index % 8)) * 60,
      endMinute: (8 + (index % 8)) * 60
    }))
    expect((await encodeTrip({ ...trip, events })).length).toBeLessThan(1500)
  })

  it('rejects damaged, unsupported and truncated links', async () => {
    const hash = await encodeTrip(trip)
    for (const bad of [
      '#t=',
      '#t=1.',
      '#t=1.!!!',
      '#t=2.abc',
      '#t=abc',
      `${hash}!`,
      hash.slice(0, hash.length - 12)
    ]) {
      const result = await decodeTrip(bad)
      expect(result.trip).toBeNull()
      expect(result.error).toEqual(expect.any(String))
    }
  })

  it('rejects well-formed compression holding an invalid trip', async () => {
    const encode = async (value: unknown) =>
      `#t=1.${base64Url(await deflate(new TextEncoder().encode(JSON.stringify(value))))}`
    const events = [['Ok', '2026-06-01', 540, 600]]
    const invalid = [
      {},
      [],
      ['id', 'Name', '2026-06-01', '2026-06-02'],
      ['id', '', '2026-06-01', '2026-06-02', []],
      ['id', 'Name', '2026-06-03', '2026-06-02', []],
      ['id', 'Name', '2020-01-01', '2030-01-01', []],
      [
        'id',
        'Name',
        '2026-06-01',
        '2026-06-02',
        [['Bad', '2026-06-01', 541, 600]]
      ],
      ['id', 'Name', '2026-06-01', '2026-06-02', [['Short', '2026-06-01']]],
      ['id', 'Name', '2026-06-01', '2026-06-02', [[1, 2, 3, 4]]]
    ]
    for (const value of invalid)
      expect((await decodeTrip(await encode(value))).trip).toBeNull()
    expect(
      (
        await decodeTrip(
          await encode(['id', 'Name', '2026-06-01', '2026-06-02', events])
        )
      ).trip
    ).not.toBeNull()
  })

  it('refuses payloads that decompress beyond the size limit', async () => {
    const huge = `#t=1.${base64Url(await deflate(new Uint8Array(5 * 1_048_576).fill(97)))}`
    const result = await decodeTrip(huge)
    expect(result.trip).toBeNull()
  })
})
