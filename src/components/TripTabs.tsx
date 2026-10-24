import { useEffect, useState } from 'react'
import type { Trip } from '../types'
import { MAX_NAME_LENGTH } from '../utils/storage'

type Props = {
  trips: Trip[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => boolean
  onDelete: (id: string) => void
  onCopyLink: () => Promise<boolean>
  canShare: boolean
  onShare: () => Promise<void>
  onOpenLink: (text: string) => Promise<string | null>
}

type Mode = 'idle' | 'rename' | 'delete' | 'open'
type CopyStatus = 'idle' | 'copied' | 'failed'

export function TripTabs({
  trips,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onCopyLink,
  canShare,
  onShare,
  onOpenLink
}: Props) {
  const active = trips.find((trip) => trip.id === activeId)
  const [mode, setMode] = useState<Mode>('idle')
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [copy, setCopy] = useState<CopyStatus>('idle')

  useEffect(() => {
    setMode('idle')
    setNameError(null)
    setCopy('idle')
  }, [activeId])
  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), 3000)
    return () => clearTimeout(timer)
  }, [copy])

  if (!active) return null

  return (
    <section className='trip-bar' aria-label='Trips'>
      <ul className='trip-pills'>
        {trips.map((trip) => (
          <li key={trip.id}>
            <button
              type='button'
              className='pill'
              aria-current={trip.id === activeId ? 'true' : undefined}
              onClick={() => onSelect(trip.id)}
            >
              {trip.name}
            </button>
          </li>
        ))}
        <li>
          <button type='button' className='pill pill-add' onClick={onCreate}>
            + New trip
          </button>
        </li>
      </ul>
      {mode === 'open' ? (
        <form
          className='trip-actions'
          noValidate
          onSubmit={async (event) => {
            event.preventDefault()
            const failure = await onOpenLink(link)
            if (failure) setNameError(failure)
            else {
              setLink('')
              setNameError(null)
              setMode('idle')
            }
          }}
        >
          <label className='visually-hidden' htmlFor='trip-link'>
            Trip link
          </label>
          <input
            id='trip-link'
            autoFocus
            value={link}
            inputMode='url'
            autoCapitalize='off'
            autoCorrect='off'
            spellCheck={false}
            placeholder='Paste a trip link'
            onChange={(event) => setLink(event.target.value)}
          />
          <button type='submit' className='btn'>
            Open
          </button>
          <button
            type='button'
            className='btn secondary'
            onClick={() => {
              setMode('idle')
              setNameError(null)
            }}
          >
            Cancel
          </button>
          {nameError && (
            <p className='field-error' role='alert'>
              {nameError}
            </p>
          )}
        </form>
      ) : mode === 'rename' ? (
        <form
          className='trip-actions'
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (onRename(active.id, name)) setMode('idle')
            else
              setNameError(
                `Enter a name between 1 and ${MAX_NAME_LENGTH} characters.`
              )
          }}
        >
          <label className='visually-hidden' htmlFor='trip-name'>
            Trip name
          </label>
          <input
            id='trip-name'
            autoFocus
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
          />
          <button type='submit' className='btn'>
            Save name
          </button>
          <button
            type='button'
            className='btn secondary'
            onClick={() => {
              setMode('idle')
              setNameError(null)
            }}
          >
            Cancel
          </button>
          {nameError && (
            <p className='field-error' role='alert'>
              {nameError}
            </p>
          )}
        </form>
      ) : (
        <div className='trip-actions'>
          <button
            type='button'
            className='btn secondary'
            onClick={async () =>
              setCopy((await onCopyLink()) ? 'copied' : 'failed')
            }
          >
            Copy link
          </button>
          {canShare && (
            <button type='button' className='btn secondary' onClick={onShare}>
              Share
            </button>
          )}
          <button
            type='button'
            className='btn secondary'
            onClick={() => {
              setLink('')
              setNameError(null)
              setMode('open')
            }}
          >
            Open link
          </button>
          <button
            type='button'
            className='btn secondary'
            onClick={() => {
              setName(active.name)
              setNameError(null)
              setMode('rename')
            }}
          >
            Rename
          </button>
          {mode === 'delete' ? (
            <>
              <button
                type='button'
                className='btn danger'
                onClick={() => onDelete(active.id)}
              >
                Confirm delete
              </button>
              <button
                type='button'
                className='btn secondary'
                onClick={() => setMode('idle')}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type='button'
              className='btn secondary'
              onClick={() => setMode('delete')}
            >
              Delete
            </button>
          )}
          <span className='copy-status' role='status'>
            {copy === 'copied' && 'Link copied'}
            {copy === 'failed' && 'Could not copy the link.'}
          </span>
        </div>
      )}
    </section>
  )
}
