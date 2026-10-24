import type { PlannerEvent, Trip } from '../types'
import { isTrip } from './storage'

const PREFIX = '#t='
// Bump when the payload layout changes; old versions must keep decoding.
const FORMAT_VERSION = 1
const MAX_DATA_LENGTH = 200_000
const MAX_JSON_BYTES = 1_048_576
const MAX_EVENTS = 5_000

type DecodeResult = { trip: Trip; error: null } | { trip: null; error: string }

export function hasShareParam(hash: string): boolean {
  return hash.startsWith(PREFIX)
}

// Accepts a full link, a bare "#t=..." fragment, or just "t=...".
export function extractShareHash(text: string): string | null {
  const trimmed = text.trim()
  const at = trimmed.indexOf('#')
  const hash = at === -1 ? `#${trimmed}` : trimmed.slice(at)
  return hasShareParam(hash) ? hash : null
}

function compare(a: string | number, b: string | number): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// Every Trip and PlannerEvent field (except event ids) must be listed here.
function payloadOf(trip: Trip) {
  const events = [...trip.events]
    .sort(
      (a, b) =>
        compare(a.date, b.date) ||
        compare(a.startMinute, b.startMinute) ||
        compare(a.endMinute, b.endMinute) ||
        compare(a.title, b.title)
    )
    .map((event) => [
      event.title,
      event.date,
      event.startMinute,
      event.endMinute
    ])
  return [trip.id, trip.name, trip.startDate, trip.endDate, events]
}

// Equal signatures mean identical trip content; event ids are not part of a trip's content.
export function tripSignature(trip: Trip): string {
  return JSON.stringify(payloadOf(trip))
}

function tripFromPayload(value: unknown): Trip | null {
  if (!Array.isArray(value) || value.length !== 5) return null
  const [id, name, startDate, endDate, items] = value
  if (!Array.isArray(items) || items.length > MAX_EVENTS) return null
  const events: PlannerEvent[] = []
  for (const item of items) {
    if (!Array.isArray(item) || item.length !== 4) return null
    const [title, date, startMinute, endMinute] = item
    events.push({
      id: crypto.randomUUID(),
      title,
      date,
      startMinute,
      endMinute
    })
  }
  const trip = { id, name, startDate, endDate, events }
  return isTrip(trip) ? trip : null
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function transform(
  input: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = stream.writable.getWriter()
  // Failures surface through the reader; avoid unhandled rejections here.
  writer.write(input).catch(() => undefined)
  writer.close().catch(() => undefined)
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error('Payload too large')
    }
    chunks.push(value)
  }
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

export async function encodeTrip(trip: Trip): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payloadOf(trip)))
  const packed = await transform(
    json,
    new CompressionStream('deflate-raw'),
    Infinity
  )
  return `${PREFIX}${FORMAT_VERSION}.${toBase64Url(packed)}`
}

export async function decodeTrip(hash: string): Promise<DecodeResult> {
  const fail = (error: string): DecodeResult => ({ trip: null, error })
  const body = hash.slice(PREFIX.length)
  const dot = body.indexOf('.')
  if (dot === -1 || body.slice(0, dot) !== String(FORMAT_VERSION)) {
    return fail('This link uses an unsupported format.')
  }
  const data = body.slice(dot + 1)
  if (data.length > MAX_DATA_LENGTH || !/^[A-Za-z0-9_-]+$/.test(data)) {
    return fail('This link is damaged or incomplete.')
  }
  try {
    const json = await transform(
      fromBase64Url(data),
      new DecompressionStream('deflate-raw'),
      MAX_JSON_BYTES
    )
    const trip = tripFromPayload(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json))
    )
    return trip
      ? { trip, error: null }
      : fail('This link does not contain a valid trip.')
  } catch {
    return fail('This link is damaged or incomplete.')
  }
}
