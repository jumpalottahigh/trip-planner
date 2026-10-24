import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoredState, Trip } from '../types'
import {
  decodeTrip,
  encodeTrip,
  extractShareHash,
  hasShareParam
} from '../utils/share'
import { resolveIncoming } from '../utils/trips'

export const LONG_LINK_LENGTH = 2000

export type Conflict = { incoming: Trip; local: Trip }
export type ConflictChoice = 'keep' | 'replace' | 'copy'

type Api = {
  state: StoredState | null
  trip: Trip | null
  pristine: boolean
  selectTrip: (id: string) => boolean
  importTrip: (trip: Trip) => boolean
  replaceTrip: (trip: Trip) => boolean
  importCopy: (trip: Trip) => boolean
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
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
  const [launchHash] = useState(() => {
    if (!hasShareParam(location.hash)) return null
    // A home-screen app relaunches with the link saved at install time, which
    // goes stale after edits. Only use it to seed an empty app.
    return isStandalone() && !api.pristine ? null : location.hash
  })
  const pendingHash = useRef<string | null>(launchHash)
  const [resolving, setResolving] = useState(launchHash !== null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkLength, setLinkLength] = useState(0)
  const [syncTick, setSyncTick] = useState(0)
  const { trip } = api

  const handle = useCallback(
    async (hash: string, reportError = true): Promise<string | null> => {
      const result = await decodeTrip(hash)
      const { state, selectTrip, importTrip } = latest.current
      if (!result.trip) {
        setResolving(false)
        if (reportError) setLinkError(result.error)
        return result.error
      }
      if (!state) {
        pendingHash.current = hash
        return null
      }
      const resolution = resolveIncoming(state, result.trip)
      if (resolution.kind === 'conflict')
        setConflict({ incoming: result.trip, local: resolution.local })
      else if (resolution.kind === 'select') selectTrip(resolution.id)
      else importTrip(result.trip)
      setResolving(false)
      return null
    },
    []
  )

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

  const shareLink = useCallback(async (): Promise<void> => {
    const current = latest.current.trip
    if (!current) return
    try {
      writeHash(await encodeTrip(current))
      await navigator.share({ title: current.name, url: location.href })
    } catch {
      // Cancelling the share sheet rejects; there is nothing to report.
    }
  }, [])

  const openLink = useCallback(
    async (text: string): Promise<string | null> => {
      const hash = extractShareHash(text)
      if (!hash) return 'Paste a trip link that contains #t=…'
      return handle(hash, false)
    },
    [handle]
  )

  return {
    resolving,
    conflict,
    linkError,
    linkTooLong: linkLength > LONG_LINK_LENGTH,
    canShare: typeof navigator.share === 'function',
    dismissLinkError: () => setLinkError(null),
    resolveConflict,
    copyLink,
    shareLink,
    openLink
  }
}
