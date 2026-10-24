import { useState } from 'react'
import type { Trip } from '../types'
import { MAX_TRIP_DAYS, daySpan, isISODate } from '../utils/dates'
import { MAX_NAME_LENGTH } from '../utils/storage'
import { Modal } from './Modal'

const SAVE_FAILED =
  'Changes were not saved. Allow site storage or free up browser storage, then try again.'

type Close = { onClose: () => void }

export function DatesDialog({
  trip,
  onSave,
  onClose
}: Close & { trip: Trip; onSave: (start: string, end: string) => boolean }) {
  const [start, setStart] = useState(trip.startDate)
  const [end, setEnd] = useState(trip.endDate)
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title='Adjust trip dates' onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!isISODate(start) || !isISODate(end) || start > end) {
            setError(
              'Enter valid trip dates with the end on or after the start.'
            )
          } else if (daySpan(start, end) > MAX_TRIP_DAYS) {
            setError(`A trip can span at most ${MAX_TRIP_DAYS} days.`)
          } else if (onSave(start, end)) {
            onClose()
          } else {
            setError(SAVE_FAILED)
          }
        }}
      >
        <label>
          Trip start
          <input
            type='date'
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          Trip end
          <input
            type='date'
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        {error && (
          <p className='field-error' role='alert'>
            {error}
          </p>
        )}
        <div className='editor-actions'>
          <button type='button' className='btn secondary' onClick={onClose}>
            Cancel
          </button>
          <button type='submit' className='btn'>
            Apply dates
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function RenameDialog({
  trip,
  onSave,
  onClose
}: Close & { trip: Trip; onSave: (name: string) => boolean }) {
  const [name, setName] = useState(trip.name)
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title='Rename trip' onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (onSave(name)) onClose()
          else
            setError(`Enter a name between 1 and ${MAX_NAME_LENGTH} characters.`)
        }}
      >
        <label>
          Trip name
          <input
            autoFocus
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && (
          <p className='field-error' role='alert'>
            {error}
          </p>
        )}
        <div className='editor-actions'>
          <button type='button' className='btn secondary' onClick={onClose}>
            Cancel
          </button>
          <button type='submit' className='btn'>
            Save name
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function OpenLinkDialog({
  onOpen,
  onClose
}: Close & { onOpen: (text: string) => Promise<string | null> }) {
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title='Open a trip link' onClose={onClose}>
      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault()
          const failure = await onOpen(link)
          if (failure) setError(failure)
          else onClose()
        }}
      >
        <label>
          Trip link
          <input
            autoFocus
            value={link}
            inputMode='url'
            autoCapitalize='off'
            autoCorrect='off'
            spellCheck={false}
            placeholder='Paste a trip link'
            onChange={(event) => setLink(event.target.value)}
          />
        </label>
        {error && (
          <p className='field-error' role='alert'>
            {error}
          </p>
        )}
        <div className='editor-actions'>
          <button type='button' className='btn secondary' onClick={onClose}>
            Cancel
          </button>
          <button type='submit' className='btn'>
            Open
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function DeleteDialog({
  trip,
  onConfirm,
  onClose
}: Close & { trip: Trip; onConfirm: () => void }) {
  const count = trip.events.length
  return (
    <Modal title='Delete trip?' onClose={onClose}>
      <p className='dialog-text'>
        “{trip.name}” and its {count} {count === 1 ? 'event' : 'events'} will be
        removed from this device. Copy its link first if you may want it back.
      </p>
      <div className='editor-actions'>
        <button type='button' className='btn secondary' onClick={onClose}>
          Cancel
        </button>
        <button type='button' className='btn danger' onClick={onConfirm}>
          Delete trip
        </button>
      </div>
    </Modal>
  )
}
