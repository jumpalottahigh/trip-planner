import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoredState, Trip } from '../types'
import { decodeTrip, encodeTrip, hasShareParam } from '../utils/share'
import { resolveIncoming } from '../utils/trips'

export const LONG_LINK_LENGTH = 2000

export type Conflict = { incoming: Trip; local: Trip }
export type ConflictChoice = 'keep' | 'replace' | 'copy'

type Api = {
  state: StoredState | null
  trip: Trip | null
  selectTrip: (id: string) => boolean
  importTrip: (trip: Trip) => boolean
  replaceTrip: (trip: Trip) => boolean
  importCopy: (trip: Trip) => boolean
}

function writeHash(hash: string): void {
  history.replaceState(
    history.state,
    '',
    `${location.pathname}${location.search}${hash}`
  )
}

export function useShareLink(api: Api) {
  const latest = useRef(api)
  latest.current = api
  const pendingHash = useRef<string | null>(
    hasShareParam(location.hash) ? location.hash : null
  )
  const [resolving, setResolving] = useState(pendingHash.current !== null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkLength, setLinkLength] = useState(0)
  const [syncTick, setSyncTick] = useState(0)
  const { trip } = api

  const handle = useCallback(async (hash: string) => {
    const result = await decodeTrip(hash)
    const { state, selectTrip, importTrip } = latest.current
    if (!result.trip) {
      setResolving(false)
      setLinkError(result.error)
      return
    }
    if (!state) {
      pendingHash.current = hash
      return
    }
    const resolution = resolveIncoming(state, result.trip)
    if (resolution.kind === 'conflict')
      setConflict({ incoming: result.trip, local: resolution.local })
    else if (resolution.kind === 'select') selectTrip(resolution.id)
    else importTrip(result.trip)
    setResolving(false)
  }, [])

  useEffect(() => {
    if (!api.state || !pendingHash.current) return
    const hash = pendingHash.current
    pendingHash.current = null
    void handle(hash)
  }, [api.state, handle])

  useEffect(() => {
    const onHashChange = () => {
      if (!hasShareParam(location.hash)) {
        setSyncTick((tick) => tick + 1)
        return
      }
      setResolving(true)
      if (latest.current.state) void handle(location.hash)
      else pendingHash.current = location.hash
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [handle])

  // Editing or switching trips supersedes a link that failed to open.
  useEffect(() => {
    setLinkError(null)
  }, [trip])

  const paused = resolving || conflict !== null || linkError !== null
  useEffect(() => {
    if (!trip || paused) return
    let cancelled = false
    void encodeTrip(trip).then((hash) => {
      if (cancelled) return
      writeHash(hash)
      setLinkLength(location.href.length)
    })
    return () => {
      cancelled = true
    }
  }, [trip, paused, syncTick])

  const resolveConflict = useCallback(
    (choice: ConflictChoice) => {
      if (!conflict) return
      const { selectTrip, replaceTrip, importCopy } = latest.current
      if (choice === 'keep') selectTrip(conflict.local.id)
      else if (choice === 'replace') replaceTrip(conflict.incoming)
      else importCopy(conflict.incoming)
      setConflict(null)
    },
    [conflict]
  )

  const copyLink = useCallback(async (): Promise<boolean> => {
    const current = latest.current.trip
    if (!current) return false
    try {
      writeHash(await encodeTrip(current))
      await navigator.clipboard.writeText(location.href)
      setLinkLength(location.href.length)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    resolving,
    conflict,
    linkError,
    linkTooLong: linkLength > LONG_LINK_LENGTH,
    dismissLinkError: () => setLinkError(null),
    resolveConflict,
    copyLink
  }
}
