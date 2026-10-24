import { useState } from 'react'
import type { EventDraft, Trip } from './types'
import { DayPlanner } from './components/DayPlanner'
import { EventEditor } from './components/EventEditor'
import { TripTabs } from './components/TripTabs'
import { useShareLink } from './hooks/useShareLink'
import { usePlanner } from './hooks/usePlanner'

const describeTrip = (trip: Trip) =>
  `${trip.events.length} ${trip.events.length === 1 ? 'event' : 'events'}, ${trip.startDate} to ${trip.endDate}`

export function App() {
  const planner = usePlanner()
  const { state, trip, error } = planner
  const share = useShareLink({
    state,
    trip,
    pristine: planner.pristine,
    selectTrip: planner.selectTrip,
    importTrip: planner.importTrip,
    replaceTrip: planner.replaceTrip,
    importCopy: planner.importCopy
  })
  const [editor, setEditor] = useState<{
    draft: EventDraft
    id?: string
  } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const hidden =
    trip?.events.filter(
      (event) => event.date < trip.startDate || event.date > trip.endDate
    ).length ?? 0

  return (
    <main className='app'>
      <header className='app-header'>
        <div>
          <p className='eyebrow'>Make room for the good things</p>
          <h1>Trip Planner</h1>
        </div>
        <span className='storage-note'>
          {error
            ? 'Storage needs attention'
            : 'Saved on this device · the link holds the whole trip'}
        </span>
      </header>
      {error && (
        <div className='error' role='alert'>
          {error}
        </div>
      )}
      {share.linkError && (
        <div className='error' role='alert'>
          {share.linkError} Your saved trips are unchanged.{' '}
          <button className='btn secondary' onClick={share.dismissLinkError}>
            Dismiss
          </button>
        </div>
      )}
      {!state || !trip ? (
        <section className='recovery'>
          <h2>Your saved trips could not be opened</h2>
          <p>
            Retry to keep your existing data. Starting fresh explicitly replaces
            all saved trips.
          </p>
          <button className='btn secondary' onClick={planner.retry}>
            Retry loading
          </button>
          <button
            className='btn danger'
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true)
                return
              }
              planner.reset()
            }}
          >
            {confirmReset ? 'Confirm replace saved trips' : 'Start fresh'}
          </button>
        </section>
      ) : share.resolving ? (
        <p className='notice' role='status'>
          Opening shared trip…
        </p>
      ) : share.conflict ? (
        <section
          className='recovery'
          role='alertdialog'
          aria-labelledby='conflict-title'
        >
          <h2 id='conflict-title'>This link differs from your saved trip</h2>
          <p>
            “{share.conflict.incoming.name}” is already on this device with
            different contents.
          </p>
          <p>On this device: {describeTrip(share.conflict.local)}.</p>
          <p>In the link: {describeTrip(share.conflict.incoming)}.</p>
          <button className='btn' onClick={() => share.resolveConflict('copy')}>
            Save link as a copy
          </button>
          <button
            className='btn secondary'
            onClick={() => share.resolveConflict('keep')}
          >
            Keep my version
          </button>
          <button
            className='btn danger'
            onClick={() => share.resolveConflict('replace')}
          >
            Replace my version with the link
          </button>
        </section>
      ) : (
        <>
          <TripTabs
            trips={state.trips}
            activeId={trip.id}
            onSelect={planner.selectTrip}
            onCreate={planner.createTrip}
            onRename={planner.renameTrip}
            onDelete={planner.deleteTrip}
            onChangeDates={planner.updateRange}
            onCopyLink={share.copyLink}
            canShare={share.canShare}
            onShare={share.shareLink}
            onOpenLink={share.openLink}
          />
          {share.linkTooLong && (
            <p className='notice' role='status'>
              This trip’s link is long. Some apps may cut it off when you paste
              or share it.
            </p>
          )}
          <div className='planner-hints'>
            <p>
              Tap or click an empty hour to add an event. Drag to move; pull the
              top or bottom edge to resize.
            </p>
            {trip.events.length === 0 && (
              <span>Your days, your pace. Start with one event.</span>
            )}
          </div>
          {hidden > 0 && (
            <p className='notice' role='status'>
              {hidden} {hidden === 1 ? 'event is' : 'events are'} outside the
              displayed dates, still saved. Extend the trip dates to see{' '}
              {hidden === 1 ? 'it' : 'them'} again.
            </p>
          )}
          <DayPlanner
            planner={trip}
            onAdd={(draft) => setEditor({ draft })}
            onEdit={(event) => setEditor({ draft: event, id: event.id })}
            onCommit={(event) => {
              planner.saveEvent(event, event.id)
            }}
          />
          <p className='footer-note'>
            Local times · Overlaps welcome · Click an event to edit its details
          </p>
          {editor && (
            <EventEditor
              draft={editor.draft}
              id={editor.id}
              startDate={trip.startDate}
              endDate={trip.endDate}
              onSave={planner.saveEvent}
              onDelete={planner.deleteEvent}
              onClose={() => setEditor(null)}
            />
          )}
        </>
      )}
    </main>
  )
}
