import { useEffect, useState } from 'react'
import type { Trip } from '../types'
import {
  DatesDialog,
  DeleteDialog,
  OpenLinkDialog,
  RenameDialog
} from './TripDialogs'
import { TripMenu } from './TripMenu'
import type { MenuItem } from './TripMenu'

type Props = {
  trips: Trip[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => boolean
  onDelete: (id: string) => void
  onChangeDates: (start: string, end: string) => boolean
  onCopyLink: () => Promise<boolean>
  canShare: boolean
  onShare: () => Promise<void>
  onOpenLink: (text: string) => Promise<string | null>
}

type Dialog = 'dates' | 'rename' | 'open' | 'delete' | null

export function TripTabs({
  trips,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onChangeDates,
  onCopyLink,
  canShare,
  onShare,
  onOpenLink
}: Props) {
  const active = trips.find((trip) => trip.id === activeId)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setDialog(null)
    setStatus('')
  }, [activeId])
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 3000)
    return () => clearTimeout(timer)
  }, [status])

  if (!active) return null

  const items: MenuItem[] = [
    { label: 'Adjust trip dates', onSelect: () => setDialog('dates') },
    { label: 'Rename trip', onSelect: () => setDialog('rename') },
    {
      label: 'Copy link',
      onSelect: async () =>
        setStatus((await onCopyLink()) ? 'Link copied' : 'Could not copy the link')
    },
    ...(canShare
      ? [{ label: 'Share link', onSelect: () => void onShare() }]
      : []),
    { label: 'Open link…', onSelect: () => setDialog('open') },
    { label: 'Delete trip', onSelect: () => setDialog('delete'), danger: true }
  ]
  const close = () => setDialog(null)

  return (
    <section className='trip-bar' aria-label='Trips'>
      <ul className='trip-pills'>
        {trips.map((trip) => {
          const pill = (
            <button
              type='button'
              className='pill'
              aria-current={trip.id === activeId ? 'true' : undefined}
              onClick={() => onSelect(trip.id)}
            >
              {trip.name}
            </button>
          )
          return (
            <li key={trip.id}>
              {trip.id === activeId ? (
                <div className='pill-group'>
                  {pill}
                  <TripMenu label={`Options for ${trip.name}`} items={items} />
                </div>
              ) : (
                pill
              )}
            </li>
          )
        })}
        <li>
          <button type='button' className='pill pill-add' onClick={onCreate}>
            + New trip
          </button>
        </li>
      </ul>
      <p className='toast' role='status'>
        {status}
      </p>
      {dialog === 'dates' && (
        <DatesDialog trip={active} onSave={onChangeDates} onClose={close} />
      )}
      {dialog === 'rename' && (
        <RenameDialog
          trip={active}
          onSave={(name) => onRename(active.id, name)}
          onClose={close}
        />
      )}
      {dialog === 'open' && <OpenLinkDialog onOpen={onOpenLink} onClose={close} />}
      {dialog === 'delete' && (
        <DeleteDialog
          trip={active}
          onConfirm={() => onDelete(active.id)}
          onClose={close}
        />
      )}
    </section>
  )
}
